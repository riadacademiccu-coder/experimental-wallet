
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Only accept browser requests from our own website.
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 }
    );
  }

  // The Firebase ID token identifies the signed-in user.
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const idToken = authorization.slice(7).trim();

  let uid: string;
  let email: string;

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(
      idToken,
      true
    );

    if (!decodedToken.email) {
      return NextResponse.json(
        { error: "A valid email account is required." },
        { status: 400 }
      );
    }

    uid = decodedToken.uid;
    email = decodedToken.email.toLowerCase();
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired login token." },
      { status: 401 }
    );
  }

  let fullName: string;

  try {
    const body = await request.json();

    if (typeof body.fullName !== "string") {
      throw new Error("Invalid name");
    }

    fullName = body.fullName.trim().replace(/\s+/g, " ");

    if (fullName.length < 2 || fullName.length > 80) {
      throw new Error("Invalid name");
    }
  } catch {
    return NextResponse.json(
      { error: "Enter a name between 2 and 80 characters." },
      { status: 400 }
    );
  }

  try {
    const db = getAdminDb();

    const profileRef = db.collection("profiles").doc(uid);
    const accountRef = db.collection("accounts").doc(uid);

    await db.runTransaction(async (transaction) => {
      // Read both records before performing any writes.
      const profileSnapshot = await transaction.get(profileRef);
      const accountSnapshot = await transaction.get(accountRef);

      // Never overwrite an existing profile or balance.
      if (!profileSnapshot.exists) {
        transaction.create(profileRef, {
          user_id: uid,
          email,
          full_name: fullName,
          role: "USER",
          status: "ACTIVE",
          created_at: FieldValue.serverTimestamp(),
        });
      }

      if (!accountSnapshot.exists) {
        transaction.create(accountRef, {
          user_id: uid,
          currency: "BDT",
          available_balance_poisha: 0,
          held_balance_poisha: 0,
          created_at: FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Firebase wallet account is ready.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Firebase registration failed:", error);

    return NextResponse.json(
      { error: "Unable to create your wallet account." },
      { status: 500 }
    );
  }
}
