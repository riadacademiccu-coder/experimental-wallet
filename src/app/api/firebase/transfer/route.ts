import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TRANSFER_POISHA = 1_000_000; // ৳10,000 per transfer
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reject(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function validBalance(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return reject("Invalid request origin.", 403);
  }

  const user = await getCurrentWalletUser();
  if (!user) return reject("Please sign in to an active, verified account.", 401);
  if (user.role !== "USER") return reject("Only regular wallet users can make transfers.", 403);

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return reject("JSON request required.", 415);
  }

  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 3000) return reject("Request too large.", 413);
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return reject("Invalid request data.", 400);
    }
    payload = value as Record<string, unknown>;
  } catch {
    return reject("Invalid request data.", 400);
  }

  const { recipientEmail, amountPoisha, operationId } = payload;
  if (
    typeof recipientEmail !== "string" ||
    recipientEmail.length > 254 ||
    !EMAIL_PATTERN.test(recipientEmail.trim())
  ) {
    return reject("Enter a valid recipient email address.", 400);
  }
  if (
    typeof amountPoisha !== "number" ||
    !Number.isSafeInteger(amountPoisha) ||
    amountPoisha < 1 ||
    amountPoisha > MAX_TRANSFER_POISHA
  ) {
    return reject("Enter an amount from ৳0.01 to ৳10,000.00.", 400);
  }
  if (typeof operationId !== "string" || !UUID_V4.test(operationId)) {
    return reject("Invalid operation ID.", 400);
  }

  const normalizedEmail = recipientEmail.trim().toLowerCase();
  if (normalizedEmail === user.email.toLowerCase()) {
    return reject("You cannot transfer to yourself.", 400);
  }

  // Resolve an email to a Firebase UID on the trusted server; the browser
  // receives no user list or permission to query other user profiles.
  let recipientUid: string;
  try {
    const recipientAuth = await getAdminAuth().getUserByEmail(normalizedEmail);
    if (
      recipientAuth.disabled ||
      !recipientAuth.emailVerified ||
      recipientAuth.uid === user.uid
    ) {
      return reject("The recipient cannot receive transfers.", 409);
    }
    recipientUid = recipientAuth.uid;
  } catch {
    return reject("The recipient cannot receive transfers.", 409);
  }

  const db = getAdminDb();
  const senderProfileRef = db.collection("profiles").doc(user.uid);
  const recipientProfileRef = db.collection("profiles").doc(recipientUid);
  const senderAccountRef = db.collection("accounts").doc(user.uid);
  const recipientAccountRef = db.collection("accounts").doc(recipientUid);
  const transferRef = db.collection("wallet_transfers").doc(operationId);
  const outgoingRef = db.collection("transactions").doc(`transfer-out-${operationId}`);
  const incomingRef = db.collection("transactions").doc(`transfer-in-${operationId}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      // ALL reads precede writes, allowing Firestore's retry/concurrency rules
      // to protect the balances, ledger, and operation ID together.
      const [
        senderProfileDoc,
        recipientProfileDoc,
        senderAccountDoc,
        recipientAccountDoc,
        existingTransferDoc,
        existingOutgoingDoc,
        existingIncomingDoc,
      ] = await Promise.all([
        tx.get(senderProfileRef),
        tx.get(recipientProfileRef),
        tx.get(senderAccountRef),
        tx.get(recipientAccountRef),
        tx.get(transferRef),
        tx.get(outgoingRef),
        tx.get(incomingRef),
      ]);

      const senderProfile = senderProfileDoc.data();
      const recipientProfile = recipientProfileDoc.data();
      const senderAccount = senderAccountDoc.data();
      const recipientAccount = recipientAccountDoc.data();
      const previous = existingTransferDoc.data();

      if (
        !senderProfileDoc.exists ||
        senderProfile?.user_id !== user.uid ||
        senderProfile?.role !== "USER" ||
        senderProfile?.status !== "ACTIVE"
      ) {
        throw new Error("Sender account is not eligible.");
      }

      // The operation ID is an idempotency key. A repeated POST with the
      // same exact details returns the existing result, not another debit.
      if (existingTransferDoc.exists) {
        if (
          previous?.from_user_id === user.uid &&
          previous?.to_user_id === recipientUid &&
          previous?.amount_poisha === amountPoisha &&
          previous?.status === "COMPLETED" &&
          existingOutgoingDoc.exists &&
          existingIncomingDoc.exists &&
          existingOutgoingDoc.data()?.user_id === user.uid &&
          existingIncomingDoc.data()?.user_id === recipientUid
        ) {
          return { alreadySubmitted: true };
        }
        throw new Error("Operation ID already used.");
      }

      if (existingOutgoingDoc.exists || existingIncomingDoc.exists) {
        throw new Error("Transaction reference already used.");
      }

      if (
        !recipientProfileDoc.exists ||
        recipientProfile?.user_id !== recipientUid ||
        recipientProfile?.role !== "USER" ||
        recipientProfile?.status !== "ACTIVE"
      ) {
        throw new Error("Recipient is not eligible.");
      }

      if (
        !senderAccountDoc.exists ||
        senderAccount?.user_id !== user.uid ||
        senderAccount?.currency !== "BDT" ||
        !recipientAccountDoc.exists ||
        recipientAccount?.user_id !== recipientUid ||
        recipientAccount?.currency !== "BDT"
      ) {
        throw new Error("Wallet account missing.");
      }

      const senderAvailable = senderAccount.available_balance_poisha;
      const senderHeld = senderAccount.held_balance_poisha;
      const recipientAvailable = recipientAccount.available_balance_poisha;
      const recipientHeld = recipientAccount.held_balance_poisha;
      if (
        !validBalance(senderAvailable) ||
        !validBalance(senderHeld) ||
        !validBalance(recipientAvailable) ||
        !validBalance(recipientHeld)
      ) {
        throw new Error("Invalid balance data.");
      }
      if (senderAvailable < amountPoisha) {
        throw new Error("Insufficient available balance.");
      }

      const nextSenderAvailable = senderAvailable - amountPoisha;
      const nextRecipientAvailable = recipientAvailable + amountPoisha;
      if (!Number.isSafeInteger(nextRecipientAvailable)) {
        throw new Error("Recipient balance limit exceeded.");
      }

      tx.update(senderAccountRef, {
        available_balance_poisha: nextSenderAvailable,
        updated_at: FieldValue.serverTimestamp(),
      });
      tx.update(recipientAccountRef, {
        available_balance_poisha: nextRecipientAvailable,
        updated_at: FieldValue.serverTimestamp(),
      });
      tx.create(transferRef, {
        from_user_id: user.uid,
        to_user_id: recipientUid,
        amount_poisha: amountPoisha,
        status: "COMPLETED",
        currency: "BDT",
        created_at: FieldValue.serverTimestamp(),
      });
      tx.create(outgoingRef, {
        user_id: user.uid,
        type: "TRANSFER_OUT",
        amount_poisha: amountPoisha,
        status: "COMPLETED",
        description: "Wallet transfer sent",
        reference: operationId,
        counterparty_user_id: recipientUid,
        counterparty_email: normalizedEmail,
        created_at: FieldValue.serverTimestamp(),
      });
      tx.create(incomingRef, {
        user_id: recipientUid,
        type: "TRANSFER_IN",
        amount_poisha: amountPoisha,
        status: "COMPLETED",
        description: "Wallet transfer received",
        reference: operationId,
        counterparty_user_id: user.uid,
        counterparty_email: user.email,
        created_at: FieldValue.serverTimestamp(),
      });
      return { alreadySubmitted: false };
    });

    return NextResponse.json(
      {
        success: true,
        message: result.alreadySubmitted
          ? "This transfer was already completed."
          : "Transfer completed successfully.",
        operationId,
        amountPoisha,
        alreadySubmitted: result.alreadySubmitted,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Firebase wallet transfer failed:", error);
    return reject(
      "Transfer could not be confirmed. Check both wallets' transaction history before sending again.",
      409
    );
  }
}
