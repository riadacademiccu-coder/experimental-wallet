
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase/admin";

import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return respond("Invalid request origin.", 403);
  }

  const admin = await getCurrentWalletUser();

  if (!admin) {
    return respond("Please sign in again.", 401);
  }

  if (admin.role !== "ADMIN") {
    return respond("Administrator access required.", 403);
  }

  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  ) {
    return respond("JSON request required.", 415);
  }

  let targetUid: string;
  let reason: string;

  try {
    const rawBody = await request.text();

    if (rawBody.length > 3000) {
      return respond("Request too large.", 413);
    }

    const data = JSON.parse(rawBody);

    if (
      typeof data.targetUid !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(data.targetUid)
    ) {
      return respond("Invalid user ID.", 400);
    }

    if (
      typeof data.reason !== "string" ||
      data.reason.trim().length < 10 ||
      data.reason.trim().length > 200
    ) {
      return respond(
        "Provide a reason of 10 to 200 characters.",
        400
      );
    }

    if (data.confirmEmailOwnership !== true) {
      return respond(
        "Confirm that you independently checked ownership of this email.",
        400
      );
    }

    targetUid = data.targetUid;
    reason = data.reason.trim();
  } catch {
    return respond("Invalid request data.", 400);
  }

  if (targetUid === admin.uid) {
    return respond(
      "Administrators cannot verify themselves here.",
      403
    );
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  const adminRef = db.collection("profiles").doc(admin.uid);
  const profileRef = db.collection("profiles").doc(targetUid);
  const auditRef = db.collection("admin_audit_logs").doc();

  let firebaseUser;

  try {
    firebaseUser = await auth.getUser(targetUid);
  } catch {
    return respond("Firebase user not found.", 404);
  }

  if (!firebaseUser.email || firebaseUser.disabled) {
    return respond("This user cannot be verified.", 403);
  }

  if (firebaseUser.emailVerified) {
    return NextResponse.json(
      {
        success: true,
        alreadyVerified: true,
        message: "Email is already verified.",
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const email = firebaseUser.email.toLowerCase();

  try {
    await db.runTransaction(async (transaction) => {
      const [adminDoc, userDoc] = await Promise.all([
        transaction.get(adminRef),
        transaction.get(profileRef),
      ]);

      const adminData = adminDoc.data();
      const userData = userDoc.data();

      if (
        !adminDoc.exists ||
        adminData?.user_id !== admin.uid ||
        adminData?.role !== "ADMIN" ||
        adminData?.status !== "ACTIVE"
      ) {
        throw new Error("Administrator permission denied.");
      }

      if (
        !userDoc.exists ||
        userData?.user_id !== targetUid ||
        userData?.role !== "USER" ||
        typeof userData.email !== "string" ||
        userData.email.toLowerCase() !== email
      ) {
        throw new Error("User account verification failed.");
      }

      // Record the administrator's request first.
      transaction.create(auditRef, {
        actor_user_id: admin.uid,
        target_user_id: targetUid,
        action: "ADMIN_VERIFY_EMAIL",
        email,
        reason,
        verification_method: "ADMIN",
        status: "PENDING",
        created_at: FieldValue.serverTimestamp(),
      });
    });
  } catch {
    return respond(
      "Unable to authorize this verification.",
      403
    );
  }

  try {
    // This changes Firebase Authentication itself.
    await auth.updateUser(targetUid, {
      emailVerified: true,
    });
  } catch (error) {
    console.error("Firebase email verification failed:", error);

    try {
      await auditRef.update({
        status: "FAILED",
        updated_at: FieldValue.serverTimestamp(),
      });
    } catch (auditError) {
      console.error("Audit update failed:", auditError);
    }

    return respond(
      "Could not complete email verification.",
      500
    );
  }

  try {
    // Record how the email became verified.
    const batch = db.batch();

    batch.update(profileRef, {
      email_verification_method: "ADMIN",
      email_verified_address: email,
      email_verified_by: admin.uid,
      email_verified_at: FieldValue.serverTimestamp(),
    });

    batch.update(auditRef, {
      status: "COMPLETED",
      completed_at: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        alreadyVerified: false,
        message: "Email marked as verified by administrator.",
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error(
      "Email verified, but audit finalization failed:",
      error
    );

    return respond(
      "Email verification may have succeeded. Check Firebase Authentication and the audit log before retrying.",
      500
    );
  }
}
