
import "server-only";

import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export type WalletUser = {
  uid: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
};

export async function getCurrentWalletUser(): Promise<WalletUser | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get(
    "kids_bank_session"
  )?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const adminAuth = getAdminAuth();

    // Check the Firebase session and whether it was revoked.
    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    if (decoded.email_verified !== true) {
      return null;
    }

    const [firebaseUser, profileSnapshot] =
      await Promise.all([
        adminAuth.getUser(decoded.uid),
        getAdminDb()
          .collection("profiles")
          .doc(decoded.uid)
          .get(),
      ]);

    // Reject disabled accounts or unverified email addresses.
    if (
      firebaseUser.disabled ||
      !firebaseUser.emailVerified
    ) {
      return null;
    }

    if (!profileSnapshot.exists) {
      return null;
    }

    const profile = profileSnapshot.data();

    // Confirm that this profile belongs to the logged-in user.
    if (
      !profile ||
      profile.user_id !== decoded.uid ||
      profile.status !== "ACTIVE"
    ) {
      return null;
    }

    // Only accept recognized roles.
    if (
      profile.role !== "USER" &&
      profile.role !== "ADMIN"
    ) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: firebaseUser.email ?? "",
      fullName:
        typeof profile.full_name === "string"
          ? profile.full_name
          : "User",
      role: profile.role,
    };
  } catch {
    // Invalid, expired, or revoked sessions cannot access the wallet.
    return null;
  }
}
