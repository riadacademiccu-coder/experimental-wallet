/**
 * Deprecated development-only Firebase Admin diagnostics.
 * Deliberately returns 404 in all environments.
 * Do not restore a public endpoint that enumerates collections.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { error: "Not found" },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}
