
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WITHDRAWAL_POISHA = 1_000_000;

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  // Reject cross-origin requests.
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  // Verify login, email verification, and active account status.
  const user = await getCurrentWalletUser();

  if (!user) {
    return errorResponse(
      "Please sign in with an active account.",
      401
    );
  }

  // Withdrawal requests are for regular users.
  if (user.role !== "USER") {
    return errorResponse(
      "Only regular users can request withdrawals.",
      403
    );
  }

  const contentType =
    request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return errorResponse("JSON request required.", 415);
  }

  let body: Record<string, unknown>;

  try {
    const rawBody = await request.text();

    if (rawBody.length > 3000) {
      return errorResponse("Request too large.", 413);
    }

    const parsed: unknown = JSON.parse(rawBody);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return errorResponse("Invalid request data.", 400);
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid request data.", 400);
  }

  const { agentId, amountPoisha, operationId } = body;

  if (
    typeof agentId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(agentId)
  ) {
    return errorResponse("Invalid agent ID.", 400);
  }

  if (
    typeof amountPoisha !== "number" ||
    !Number.isSafeInteger(amountPoisha) ||
    amountPoisha <= 0 ||
    amountPoisha > MAX_WITHDRAWAL_POISHA
  ) {
    return errorResponse(
      "Withdrawal amount must be between ৳0.01 and ৳10,000.00.",
      400
    );
  }

  // The client generates one UUID for each withdrawal submission.
  // Reusing that ID must never reserve the balance twice.
  if (
    typeof operationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      operationId
    )
  ) {
    return errorResponse("Invalid operation ID.", 400);
  }

  const db = getAdminDb();

  const profileRef = db.collection("profiles").doc(user.uid);

  const accountRef = db.collection("accounts").doc(user.uid);

  const agentRef = db.collection("agents").doc(agentId);

  const withdrawalRef = db
    .collection("withdrawal_requests")
    .doc(operationId);

  const transactionId = `withdrawal-${operationId}`;

  const transactionRef = db
    .collection("transactions")
    .doc(transactionId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      // All reads happen before any writes.
      const [
        profileSnapshot,
        accountSnapshot,
        agentSnapshot,
        existingWithdrawalSnapshot,
        existingTransactionSnapshot,
      ] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(accountRef),
        transaction.get(agentRef),
        transaction.get(withdrawalRef),
        transaction.get(transactionRef),
      ]);

      const profile = profileSnapshot.data();
      const account = accountSnapshot.data();
      const agent = agentSnapshot.data();

      // Verify account access again inside the transaction.
      if (
        !profileSnapshot.exists ||
        profile?.user_id !== user.uid ||
        profile?.role !== "USER" ||
        profile?.status !== "ACTIVE"
      ) {
        throw new Error("Account is not eligible.");
      }

      // If this exact request was already submitted,
      // return its existing result without moving money again.
      if (existingWithdrawalSnapshot.exists) {
        const existing = existingWithdrawalSnapshot.data();

        if (
          existing?.user_id === user.uid &&
          existing?.agent_id === agentId &&
          existing?.amount_poisha === amountPoisha &&
          existing?.transaction_id === transactionId &&
          existingTransactionSnapshot.exists
        ) {
          return {
            requestId: operationId,
            alreadySubmitted: true,
          };
        }

        throw new Error("Operation ID already used.");
      }

      if (existingTransactionSnapshot.exists) {
        throw new Error("Transaction ID already used.");
      }

      if (
        !accountSnapshot.exists ||
        account?.user_id !== user.uid ||
        account?.currency !== "BDT"
      ) {
        throw new Error("Wallet account not found.");
      }

      // Only verified, active agents can receive requests.
      if (
        !agentSnapshot.exists ||
        agent?.status !== "ACTIVE" ||
        agent?.verified !== true ||
        typeof agent?.name !== "string" ||
        !agent.name.trim()
      ) {
        throw new Error("Agent is unavailable.");
      }

      const availableBalance =
        account.available_balance_poisha;

      const heldBalance = account.held_balance_poisha;

      if (
        !Number.isSafeInteger(availableBalance) ||
        availableBalance < 0 ||
        !Number.isSafeInteger(heldBalance) ||
        heldBalance < 0
      ) {
        throw new Error("Invalid wallet balance.");
      }

      if (availableBalance < amountPoisha) {
        throw new Error("Insufficient available balance.");
      }

      const newAvailableBalance =
        availableBalance - amountPoisha;

      const newHeldBalance =
        heldBalance + amountPoisha;

      if (
        !Number.isSafeInteger(newAvailableBalance) ||
        !Number.isSafeInteger(newHeldBalance)
      ) {
        throw new Error("Wallet balance limit exceeded.");
      }

      // Atomically reserve the withdrawal amount.
      transaction.update(accountRef, {
        available_balance_poisha: newAvailableBalance,
        held_balance_poisha: newHeldBalance,
        updated_at: FieldValue.serverTimestamp(),
      });

      // Create the withdrawal request.
      transaction.create(withdrawalRef, {
        user_id: user.uid,
        agent_id: agentId,
        agent_name: agent.name.trim(),
        amount_poisha: amountPoisha,
        status: "PENDING",
        transaction_id: transactionId,
        created_at: FieldValue.serverTimestamp(),
        reviewed_by: null,
        reviewed_at: null,
      });

      // Record the pending wallet transaction.
      transaction.create(transactionRef, {
        user_id: user.uid,
        type: "WITHDRAWAL",
        amount_poisha: amountPoisha,
        status: "PENDING",
        description: `Withdrawal request via ${agent.name.trim()}`,
        reference: operationId,
        agent_id: agentId,
        created_by: user.uid,
        created_at: FieldValue.serverTimestamp(),
      });

      return {
        requestId: operationId,
        alreadySubmitted: false,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: result.alreadySubmitted
          ? "Withdrawal request already submitted."
          : "Withdrawal request submitted successfully.",
        requestId: result.requestId,
        status: "PENDING",
        alreadySubmitted: result.alreadySubmitted,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Withdrawal request failed:", error);

    return errorResponse(
      "Withdrawal request could not be confirmed. Check your available balance, agent status, and withdrawal history before retrying.",
      409
    );
  }
}
