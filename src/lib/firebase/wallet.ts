
import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

type AdjustmentType = "CREDIT" | "DEBIT";

type AdminAdjustmentInput = {
  targetUid: string;
  type: AdjustmentType;
  amountPoisha: number;
  reason: string;
  operationId: string;
};

type AdjustmentResult = {
  transactionId: string;
  alreadyApplied: boolean;
};

const MAX_ADJUSTMENT_POISHA = 10_000_000;

export async function applyAdminWalletAdjustment(
  input: AdminAdjustmentInput
): Promise<AdjustmentResult> {
  const admin = await getCurrentWalletUser();

  if (!admin || admin.role !== "ADMIN") {
    throw new Error("Administrator access required.");
  }

  if (
    typeof input.targetUid !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(input.targetUid)
  ) {
    throw new Error("Invalid user ID.");
  }

  if (input.type !== "CREDIT" && input.type !== "DEBIT") {
    throw new Error("Invalid adjustment type.");
  }

  if (
    !Number.isSafeInteger(input.amountPoisha) ||
    input.amountPoisha <= 0 ||
    input.amountPoisha > MAX_ADJUSTMENT_POISHA
  ) {
    throw new Error("Invalid adjustment amount.");
  }

  if (typeof input.reason !== "string") {
    throw new Error("A reason is required.");
  }

  const reason = input.reason.trim();

  if (reason.length < 5 || reason.length > 200) {
    throw new Error(
      "The reason must contain 5 to 200 characters."
    );
  }

  if (
    typeof input.operationId !== "string" ||
    !/^[a-zA-Z0-9_-]{10,100}$/.test(input.operationId)
  ) {
    throw new Error("Invalid operation ID.");
  }

  const db = getAdminDb();

  const adminRef = db.collection("profiles").doc(admin.uid);
  const targetProfileRef = db
    .collection("profiles")
    .doc(input.targetUid);
  const accountRef = db
    .collection("accounts")
    .doc(input.targetUid);
  const transactionRef = db
    .collection("transactions")
    .doc(input.operationId);
  const auditRef = db
    .collection("admin_audit_logs")
    .doc(input.operationId);

  const transactionType =
    input.type === "CREDIT"
      ? "ADMIN_CREDIT"
      : "ADMIN_DEBIT";

  return db.runTransaction(async (transaction) => {
    // All reads must happen before any writes.
    const [
      adminSnapshot,
      profileSnapshot,
      accountSnapshot,
      existingTransaction,
      existingAudit,
    ] = await Promise.all([
      transaction.get(adminRef),
      transaction.get(targetProfileRef),
      transaction.get(accountRef),
      transaction.get(transactionRef),
      transaction.get(auditRef),
    ]);

    const adminProfile = adminSnapshot.data();

    // Recheck administrator permissions inside the transaction.
    if (
      !adminSnapshot.exists ||
      adminProfile?.user_id !== admin.uid ||
      adminProfile?.role !== "ADMIN" ||
      adminProfile?.status !== "ACTIVE"
    ) {
      throw new Error("Administrator access denied.");
    }

    const targetProfile = profileSnapshot.data();

    if (
      !profileSnapshot.exists ||
      targetProfile?.user_id !== input.targetUid ||
      targetProfile?.status !== "ACTIVE"
    ) {
      throw new Error("Target account is not active.");
    }

    const account = accountSnapshot.data();

    if (
      !accountSnapshot.exists ||
      account?.user_id !== input.targetUid
    ) {
      throw new Error("Wallet account not found.");
    }

    const currentBalance = account.available_balance_poisha;
    const heldBalance = account.held_balance_poisha;

    if (
      !Number.isSafeInteger(currentBalance) ||
      currentBalance < 0 ||
      !Number.isSafeInteger(heldBalance) ||
      heldBalance < 0
    ) {
      throw new Error("Invalid stored wallet balance.");
    }

    // Prevent the same operation from changing money twice.
    if (existingTransaction.exists) {
      const existing = existingTransaction.data();

      if (
        existing?.user_id === input.targetUid &&
        existing?.created_by === admin.uid &&
        existing?.type === transactionType &&
        existing?.amount_poisha === input.amountPoisha &&
        existing?.description === reason &&
        existing?.status === "COMPLETED" &&
        existingAudit.exists
      ) {
        return {
          transactionId: input.operationId,
          alreadyApplied: true,
        };
      }

      throw new Error("Operation ID already used.");
    }

    if (existingAudit.exists) {
      throw new Error("Audit ID already used.");
    }

    const balanceChange =
      input.type === "CREDIT"
        ? input.amountPoisha
        : -input.amountPoisha;

    const newBalance = currentBalance + balanceChange;

    if (
      !Number.isSafeInteger(newBalance) ||
      newBalance < 0
    ) {
      throw new Error(
        "Insufficient balance or balance limit exceeded."
      );
    }

    // Update the balance and create its history atomically.
    transaction.update(accountRef, {
      available_balance_poisha: newBalance,
      updated_at: FieldValue.serverTimestamp(),
    });

    transaction.create(transactionRef, {
      user_id: input.targetUid,
      type: transactionType,
      amount_poisha: input.amountPoisha,
      status: "COMPLETED",
      description: reason,
      reference: input.operationId,
      created_by: admin.uid,
      created_at: FieldValue.serverTimestamp(),
    });

    transaction.create(auditRef, {
      actor_user_id: admin.uid,
      target_user_id: input.targetUid,
      action: transactionType,
      amount_poisha: input.amountPoisha,
      reason,
      transaction_id: input.operationId,
      created_at: FieldValue.serverTimestamp(),
    });

    return {
      transactionId: input.operationId,
      alreadyApplied: false,
    };
  });
}
