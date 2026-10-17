import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewAction = "APPROVE" | "REJECT";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_DOC_ID = /^[a-zA-Z0-9_-]{1,128}$/;

class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

function respondError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  // Same-origin protection for the session-cookie-authenticated endpoint.
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return respondError("Invalid request origin.", 403);
  }

  const admin = await getCurrentWalletUser();

  if (!admin) {
    return respondError("Please sign in with an active account.", 401);
  }

  if (admin.role !== "ADMIN") {
    return respondError("Administrator access required.", 403);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return respondError("JSON request required.", 415);
  }

  let body: Record<string, unknown>;

  try {
    const raw = await request.text();

    if (raw.length > 3000) {
      return respondError("Request too large.", 413);
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return respondError("Invalid request data.", 400);
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return respondError("Invalid JSON request.", 400);
  }

  const { requestId, action, reason } = body;

  if (typeof requestId !== "string" || !UUID_V4.test(requestId)) {
    return respondError("Invalid withdrawal request ID.", 400);
  }

  if (action !== "APPROVE" && action !== "REJECT") {
    return respondError("Select APPROVE or REJECT.", 400);
  }

  const reviewAction: ReviewAction = action;

  if (reason !== undefined && typeof reason !== "string") {
    return respondError("Review reason must be text.", 400);
  }

  const reviewReason = typeof reason === "string" ? reason.trim() : "";

  if (reviewReason.length > 300) {
    return respondError("Review reason must be 300 characters or fewer.", 400);
  }

  if (reviewAction === "REJECT" && reviewReason.length < 5) {
    return respondError("Give a reason of at least 5 characters for rejection.", 400);
  }

  const db = getAdminDb();
  const adminRef = db.collection("profiles").doc(admin.uid);
  const withdrawalRef = db.collection("withdrawal_requests").doc(requestId);
  const transactionRef = db.collection("transactions").doc(`withdrawal-${requestId}`);
  const auditRef = db.collection("admin_audit_logs").doc();

  try {
    const result = await db.runTransaction(async (transaction) => {
      // First check the administrator and the withdrawal request.
      const [adminSnapshot, withdrawalSnapshot, ledgerSnapshot] =
        await Promise.all([
          transaction.get(adminRef),
          transaction.get(withdrawalRef),
          transaction.get(transactionRef),
        ]);

      const adminProfile = adminSnapshot.data();
      const withdrawal = withdrawalSnapshot.data();
      const ledger = ledgerSnapshot.data();

      if (
        !adminSnapshot.exists ||
        adminProfile?.user_id !== admin.uid ||
        adminProfile?.role !== "ADMIN" ||
        adminProfile?.status !== "ACTIVE"
      ) {
        throw new ReviewError("Administrator access denied.");
      }

      if (!withdrawalSnapshot.exists || !withdrawal) {
        throw new ReviewError("Withdrawal request not found.");
      }

      const ownerId = withdrawal.user_id;
      const agentId = withdrawal.agent_id;
      const amountPoisha = withdrawal.amount_poisha;
      const transactionId = `withdrawal-${requestId}`;

      if (
        typeof ownerId !== "string" ||
        !SAFE_DOC_ID.test(ownerId) ||
        typeof agentId !== "string" ||
        !SAFE_DOC_ID.test(agentId) ||
        !Number.isSafeInteger(amountPoisha) ||
        amountPoisha <= 0 ||
        amountPoisha > 1_000_000 ||
        withdrawal.transaction_id !== transactionId ||
        !ledgerSnapshot.exists ||
        !ledger ||
        ledger.user_id !== ownerId ||
        ledger.type !== "WITHDRAWAL" ||
        ledger.amount_poisha !== amountPoisha ||
        ledger.reference !== requestId
      ) {
        throw new ReviewError("Withdrawal records do not match.");
      }

      const desiredWithdrawalStatus =
        reviewAction === "APPROVE" ? "APPROVED" : "REJECTED";
      const desiredLedgerStatus =
        reviewAction === "APPROVE" ? "COMPLETED" : "REJECTED";

      // Clicking the same action again must never move any balance again.
      if (withdrawal.status !== "PENDING") {
        if (
          withdrawal.status === desiredWithdrawalStatus &&
          ledger.status === desiredLedgerStatus
        ) {
          return {
            alreadyReviewed: true,
            requestId,
            status: desiredWithdrawalStatus,
          };
        }

        throw new ReviewError("This request has already been reviewed.");
      }

      if (ledger.status !== "PENDING") {
        throw new ReviewError("Withdrawal transaction is not pending.");
      }

      const ownerProfileRef = db.collection("profiles").doc(ownerId);
      const accountRef = db.collection("accounts").doc(ownerId);
      const agentRef = db.collection("agents").doc(agentId);

      // All Firestore reads are completed before the first write.
      const [ownerSnapshot, accountSnapshot, agentSnapshot] =
        await Promise.all([
          transaction.get(ownerProfileRef),
          transaction.get(accountRef),
          transaction.get(agentRef),
        ]);

      const owner = ownerSnapshot.data();
      const account = accountSnapshot.data();
      const agent = agentSnapshot.data();

      if (
        !accountSnapshot.exists ||
        !account ||
        account.user_id !== ownerId ||
        account.currency !== "BDT"
      ) {
        throw new ReviewError("User wallet not found.");
      }

      // Approval requires a current user profile and agent.
      // Rejecting remains possible for a frozen or deleted user profile.
      if (reviewAction === "APPROVE") {
        if (
          !ownerSnapshot.exists ||
          !owner ||
          owner.user_id !== ownerId
        ) {
          throw new ReviewError("User profile not found.");
        }

        if (owner.role !== "USER" || owner.status !== "ACTIVE") {
          throw new ReviewError("User is not eligible for approval.");
        }

        if (
          !agentSnapshot.exists ||
          agent?.status !== "ACTIVE" ||
          agent?.verified !== true
        ) {
          throw new ReviewError("Agent must be active and verified.");
        }
      }

      const available = account.available_balance_poisha;
      const held = account.held_balance_poisha;

      if (
        !Number.isSafeInteger(available) ||
        available < 0 ||
        !Number.isSafeInteger(held) ||
        held < 0 ||
        held < amountPoisha
      ) {
        throw new ReviewError("Held wallet balance is inconsistent.");
      }

      // Approve: remove the held balance. Reject: return it to available.
      const newAvailable =
        reviewAction === "REJECT" ? available + amountPoisha : available;
      const newHeld = held - amountPoisha;

      if (!Number.isSafeInteger(newAvailable)) {
        throw new ReviewError("Wallet balance limit exceeded.");
      }

      transaction.update(accountRef, {
        available_balance_poisha: newAvailable,
        held_balance_poisha: newHeld,
        updated_at: FieldValue.serverTimestamp(),
      });

      transaction.update(withdrawalRef, {
        status: desiredWithdrawalStatus,
        reviewed_by: admin.uid,
        reviewed_at: FieldValue.serverTimestamp(),
        review_reason: reviewReason || null,
        updated_at: FieldValue.serverTimestamp(),
      });

      transaction.update(transactionRef, {
        status: desiredLedgerStatus,
        reviewed_by: admin.uid,
        reviewed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      transaction.create(auditRef, {
        action:
          reviewAction === "APPROVE"
            ? "ADMIN_APPROVE_WITHDRAWAL"
            : "ADMIN_REJECT_WITHDRAWAL",
        actor_user_id: admin.uid,
        user_id: ownerId,
        agent_id: agentId,
        withdrawal_request_id: requestId,
        transaction_id: transactionId,
        amount_poisha: amountPoisha,
        reason: reviewReason || null,
        previous_status: "PENDING",
        new_status: desiredWithdrawalStatus,
        simulated: true,
        created_at: FieldValue.serverTimestamp(),
      });

      return {
        alreadyReviewed: false,
        requestId,
        status: desiredWithdrawalStatus,
      };
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
        message: result.alreadyReviewed
          ? "This withdrawal was already reviewed. No balances changed."
          : reviewAction === "APPROVE"
            ? "Simulated withdrawal approved. Held funds were deducted."
            : "Withdrawal rejected. Held funds were returned to the user.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Withdrawal review failed:", error);

    if (error instanceof ReviewError) {
      return respondError(error.message, 409);
    }

    return respondError(
      "Unable to confirm the review. Refresh the withdrawal list before trying again.",
      500
    );
  }
}
