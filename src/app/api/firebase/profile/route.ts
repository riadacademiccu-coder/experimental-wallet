import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: NextRequest) {
  // Browser form submissions must originate from this website.
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return jsonError("Invalid request origin.", 403);
  }

  const user = await getCurrentWalletUser();
  if (!user) {
    return jsonError("Please sign in with an active, verified account.", 401);
  }

  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return jsonError("JSON request required.", 415);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return jsonError("Request too large.", 413);

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonError("Invalid request data.", 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request data.", 400);
  }

  if (typeof body.fullName !== "string") {
    return jsonError("Enter your full name.", 400);
  }

  // Collapse redundant spaces without changing Unicode names.
  const fullName = body.fullName.trim().replace(/\s+/g, " ");
  if (
    fullName.length < 2 ||
    fullName.length > 80 ||
    /[\u0000-\u001F\u007F]/.test(fullName)
  ) {
    return jsonError("Name must contain 2 to 80 characters.", 400);
  }

  const db = getAdminDb();
  const profileRef = db.collection("profiles").doc(user.uid);

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(profileRef);
      const profile = snapshot.data();

      // Recheck account state inside the atomic operation.
      if (
        !snapshot.exists ||
        profile?.user_id !== user.uid ||
        profile?.status !== "ACTIVE" ||
        (profile?.role !== "USER" && profile?.role !== "ADMIN")
      ) {
        throw new Error("Profile is unavailable.");
      }

      if (profile.full_name !== fullName) {
        transaction.update(profileRef, {
          full_name: fullName,
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json(
      { success: true, fullName, message: "Profile name saved." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Firebase profile update failed:", error);
    return jsonError("Unable to save your profile. Please try again later.", 409);
  }
}
