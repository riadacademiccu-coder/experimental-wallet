
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccountStatus = "ACTIVE" | "FROZEN" | "SUSPENDED";

const ALLOWED_STATUSES: AccountStatus[] = [
  "ACTIVE",
  "FROZEN",
  "SUSPENDED",
];

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: NextRequest) {
  // Reject requests originating from another website.
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  // Verify the current Firebase administrator.
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

  const { targetUid, status, reason } = body;

  if (
    typeof targetUid !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(targetUid)
  ) {
    return errorResponse("Invalid user ID.", 400);
  }

  if (
    typeof status !== "string" ||
    !ALLOWED_STATUSES.includes(status as AccountStatus)
  ) {
    return errorResponse("Invalid account status.", 400);
  }

  if (
    typeof reason !== "string" ||
    reason.trim().length < 5 ||
    reason.trim().length > 200
  ) {
    return errorResponse(
      "Enter a reason containing 5 to 200 characters.",
      400
    );
  }

  // Prevent an administrator from disabling their own account.
  if (targetUid === admin.uid) {
    return errorResponse(
      "You cannot change your own account status.",
      403
    );
  }

  const db = getAdminDb();

  const adminRef = db.collection("profiles").doc(admin.uid);
  const targetRef = db.collection("profiles").doc(targetUid);
  const auditRef = db.collection("admin_audit_logs").doc();

  try {
    const result = await db.runTransaction(async (transaction) => {
      // Read documents before applying any changes.
      const [adminSnapshot, targetSnapshot] =
        await Promise.all([
          transaction.get(adminRef),
          transaction.get(targetRef),
        ]);

      const adminProfile = adminSnapshot.data();
      const targetProfile = targetSnapshot.data();

      // Recheck admin permissions inside the transaction.
      if (
        !adminSnapshot.exists ||
        adminProfile?.user_id !== admin.uid ||
        adminProfile?.role !== "ADMIN" ||
        adminProfile?.status !== "ACTIVE"
      ) {
        throw new Error("Administrator access denied.");
      }

      if (
        !targetSnapshot.exists ||
        targetProfile?.user_id !== targetUid
      ) {
        throw new Error("Target user not found.");
      }

      // Only regular user accounts can be changed here.
      // Administrator account controls need additional safeguards.
      if (targetProfile.role !== "USER") {
        throw new Error(
          "Administrator accounts cannot be changed here."
        );
      }

      const previousStatus = targetProfile.status;

      // Avoid writing duplicate status changes.
      if (previousStatus === status) {
        return {
          changed: false,
          previousStatus,
        };
      }

      transaction.update(targetRef, {
        status,
        updated_at: FieldValue.serverTimestamp(),
      });

      transaction.create(auditRef, {
        actor_user_id: admin.uid,
        target_user_id: targetUid,
        action: "ADMIN_SET_USER_STATUS",
        previous_status: previousStatus,
        new_status: status,
        reason: reason.trim(),
        created_at: FieldValue.serverTimestamp(),
      });

      return {
        changed: true,
        previousStatus,
      };
    });

    return NextResponse.json(
      {
        success: true,
        changed: result.changed,
        previousStatus: result.previousStatus,
        newStatus: status,
        message: result.changed
          ? "Account status updated successfully."
          : "Account already has this status.",
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("User status update failed:", error);

    return errorResponse(
      "Unable to update account status.",
      500
    );
  }
}
