
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AMOUNT_POISHA = 1_000_000; // ৳10,000

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
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const admin = await getCurrentWalletUser();

  if (!admin) {
    return errorResponse("Please sign in again.", 401);
  }

  if (admin.role !== "ADMIN") {
    return errorResponse(
      "Administrator access required.",
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
      return errorResponse("Invalid request.", 400);
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("Invalid request data.", 400);
  }

  const { senderNumber, amountPoisha, note } = body;

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
    typeof amountPoisha !== "number" ||
    !Number.isSafeInteger(amountPoisha) ||
    amountPoisha <= 0 ||
    amountPoisha > MAX_AMOUNT_POISHA
  ) {
    return errorResponse(
      "Amount must be between ৳0.01 and ৳10,000.00.",
      400
    );
  }

  if (
    note !== undefined &&
    (typeof note !== "string" || note.length > 160)
  ) {
    return errorResponse("Invalid note.", 400);
  }

  const cleanNote =
    typeof note === "string" ? note.trim() : "";

  // Server-generated, unpredictable single-use reference.
  const reference =
    "KBTEST-" + randomUUID().replace(/-/g, "").toUpperCase();

  const db = getAdminDb();

  const adminRef = db.collection("profiles").doc(admin.uid);

  const depositRef = db
    .collection("bkash_test_transactions")
    .doc(reference);

  const auditRef = db
    .collection("admin_audit_logs")
    .doc();

  try {
    await db.runTransaction(async (transaction) => {
      const adminSnapshot = await transaction.get(adminRef);
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

      // Create the test reference and audit record together.
      transaction.create(depositRef, {
        reference,
        sender_number: senderNumber,
        amount_poisha: amountPoisha,
        status: "UNUSED",
        created_by: admin.uid,
        created_at: FieldValue.serverTimestamp(),
        used_by: null,
        used_at: null,
        note: cleanNote,
      });

      transaction.create(auditRef, {
        actor_user_id: admin.uid,
        action: "ADMIN_CREATE_BKASH_TEST_DEPOSIT",
        reference,
        amount_poisha: amountPoisha,
        sender_number: senderNumber,
        created_at: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Test deposit reference created.",
        reference,
        senderNumber,
        amountPoisha,
        status: "UNUSED",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Test deposit creation failed:", error);

    return errorResponse(
      "Unable to create the test deposit reference.",
      500
    );
  }
}
