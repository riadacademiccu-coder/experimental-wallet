
import { NextRequest, NextResponse } from "next/server";
import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

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
  // Only allow requests from this website.
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  let idToken: string;

  try {
    const rawBody = await request.text();

    if (rawBody.length > 15000) {
      return errorResponse("Request is too large.", 413);
    }

    const body: unknown = JSON.parse(rawBody);

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      !("idToken" in body) ||
      typeof body.idToken !== "string" ||
      body.idToken.length === 0 ||
      body.idToken.length > 10000
    ) {
      return errorResponse(
        "A valid Firebase login token is required.",
        400
      );
    }

    idToken = body.idToken;
  } catch {
    return errorResponse("Invalid login request.", 400);
  }

  try {
    const adminAuth = getAdminAuth();

    const decodedToken = await adminAuth.verifyIdToken(
      idToken,
      true
    );

    // Require a verified email address.
    if (decodedToken.email_verified !== true) {
      return errorResponse(
        "Please verify your email before signing in.",
        403
      );
    }

    const firebaseUser = await adminAuth.getUser(
      decodedToken.uid
    );

    if (
      firebaseUser.disabled ||
      !firebaseUser.emailVerified
    ) {
      return errorResponse(
        "Your account is not permitted to sign in.",
        403
      );
    }

    // Only create sessions after a recent sign-in.
    const currentTime = Math.floor(Date.now() / 1000);
    const authTime = decodedToken.auth_time;

    if (
      !authTime ||
      authTime > currentTime + 60 ||
      currentTime - authTime > 5 * 60
    ) {
      return errorResponse(
        "Please sign in again to continue.",
        401
      );
    }

    const db = getAdminDb();

    const [profileSnapshot, accountSnapshot] =
      await Promise.all([
        db.collection("profiles").doc(decodedToken.uid).get(),
        db.collection("accounts").doc(decodedToken.uid).get(),
      ]);

    if (!profileSnapshot.exists || !accountSnapshot.exists) {
      return errorResponse(
        "Your wallet account setup is incomplete.",
        403
      );
    }

    const profile = profileSnapshot.data();
    const account = accountSnapshot.data();

    if (
      profile?.user_id !== decodedToken.uid ||
      account?.user_id !== decodedToken.uid
    ) {
      return errorResponse(
        "Account verification failed.",
        403
      );
    }

    // Only active accounts are allowed to sign in.
    if (profile.status === "FROZEN") {
      return errorResponse(
        "Your account is currently frozen.",
        403
      );
    }

    if (profile.status === "SUSPENDED") {
      return errorResponse(
        "Your account is currently suspended.",
        403
      );
    }

    if (profile.status !== "ACTIVE") {
      return errorResponse(
        "Your account is not active.",
        403
      );
    }

    if (
      profile.role !== "USER" &&
      profile.role !== "ADMIN"
    ) {
      return errorResponse(
        "Account permission verification failed.",
        403
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(
      idToken,
      {
        expiresIn: SESSION_DURATION_MS,
      }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    response.cookies.set(
      "kids_bank_session",
      sessionCookie,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION_MS / 1000,
      }
    );

    return response;
  } catch (error) {
    console.error("Firebase session creation failed:", error);

    return errorResponse(
      "Unable to complete login. Please try again.",
      401
    );
  }
}
