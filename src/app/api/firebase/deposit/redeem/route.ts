
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DEPOSIT_POISHA = 1_000_000;

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
  // Allow requests only from our own website.
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  // Check Firebase login, email verification and account status.
  const user = await getCurrentWalletUser();

  if (!user) {
    return errorResponse(
      "Please sign in with an active, verified account.",
      401
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
      return errorResponse("Request is too large.", 413);
    }

    const parsed: unknown = JSON.parse(rawBody);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return errorResponse("Invalid request.", 400);
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid request data.", 400);
  }

  const { senderNumber, reference, amountPoisha } = body;

  if (
    typeof senderNumber !== "string" ||
    !/^01[3-9]\d{8}$/.test(senderNumber)
  ) {
    return errorResponse(
      "Enter a valid 11-digit test sender number.",
      400
    );
  }

  if (
    typeof reference !== "string" ||
    !/^KBTEST-[A-Fa-f0-9]{32}$/.test(reference)
  ) {
    return errorResponse(
      "Enter a valid test transaction reference.",
      400
    );
  }

  if (
    typeof amountPoisha !== "number" ||
    !Number.isSafeInteger(amountPoisha) ||
    amountPoisha <= 0 ||
    amountPoisha > MAX_DEPOSIT_POISHA
  ) {
    return errorResponse(
      "Enter an amount between ৳0.01 and ৳10,000.00.",
      400
    );
  }

  const normalizedReference = reference.toUpperCase();

  const db = getAdminDb();

  const profileRef = db.collection("profiles").doc(user.uid);

  const accountRef = db.collection("accounts").doc(user.uid);

  const depositRef = db
    .collection("bkash_test_transactions")
    .doc(normalizedReference);

  // A deterministic transaction ID prevents duplicate ledger entries.
  const transactionId = `bkash-${normalizedReference}`;

  const transactionRef = db
    .collection("transactions")
    .doc(transactionId);

  try {
    await db.runTransaction(async (transaction) => {
      // Firestore requires all reads before writes.
      const [
        profileSnapshot,
        accountSnapshot,
        depositSnapshot,
        existingTransactionSnapshot,
      ] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(accountRef),
        transaction.get(depositRef),
        transaction.get(transactionRef),
      ]);

      const profile = profileSnapshot.data();
      const account = accountSnapshot.data();
      const deposit = depositSnapshot.data();

      // Verify that this user's account remains active.
      if (
        !profileSnapshot.exists ||
        profile?.user_id !== user.uid ||
        profile?.status !== "ACTIVE" ||
        (profile?.role !== "USER" &&
          profile?.role !== "ADMIN")
      ) {
        throw new Error("Account is not eligible.");
      }

      if (
        !accountSnapshot.exists ||
        account?.user_id !== user.uid
      ) {
        throw new Error("Wallet account not found.");
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

      // The reference must exist and be unused.
      if (
        !depositSnapshot.exists ||
        deposit?.reference !== normalizedReference ||
        deposit?.status !== "UNUSED"
      ) {
        throw new Error("Deposit reference is not available.");
      }

      // All test details must match the admin-created record.
      if (
        deposit.sender_number !== senderNumber ||
        deposit.amount_poisha !== amountPoisha
      ) {
        throw new Error("Deposit details do not match.");
      }

      // Never create a second ledger entry for this reference.
      if (existingTransactionSnapshot.exists) {
        throw new Error("Reference already processed.");
      }

      const newBalance = availableBalance + amountPoisha;

      if (!Number.isSafeInteger(newBalance)) {
        throw new Error("Wallet balance limit exceeded.");
      }

      // These three changes succeed or fail together.
      transaction.update(accountRef, {
        available_balance_poisha: newBalance,
        updated_at: FieldValue.serverTimestamp(),
      });

      transaction.create(transactionRef, {
        user_id: user.uid,
        type: "DEPOSIT",
        amount_poisha: amountPoisha,
        status: "COMPLETED",
        description: "Simulated bKash Deposit",
        reference: normalizedReference,
        created_by: user.uid,
        created_at: FieldValue.serverTimestamp(),
      });

      transaction.update(depositRef, {
        status: "USED",
        used_by: user.uid,
        used_at: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Simulated deposit credited successfully.",
        transactionId,
        amountPoisha,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Simulated deposit redemption failed:", error);

    // Do not reveal which part of the reference was valid.
    return errorResponse(
      "Deposit could not be confirmed. Check your transaction history before trying again.",
      409
    );
  }
}
