
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Only accept logout requests from our own website.
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 }
    );
  }

  const response = NextResponse.json(
    {
      success: true,
      message: "Session cleared successfully.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  // Expire the server-side Firebase session cookie.
  response.cookies.set("kids_bank_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
