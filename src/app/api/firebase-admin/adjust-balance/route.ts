
import { NextRequest, NextResponse } from "next/server";

import { getCurrentWalletUser } from "@/lib/firebase/session";
import { applyAdminWalletAdjustment } from "@/lib/firebase/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  // Accept requests only from this website.
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  // Verify the Firebase session and administrator role.
  const admin = await getCurrentWalletUser();

  if (!admin) {
    return errorResponse("Please sign in again.", 401);
  }

  if (admin.role !== "ADMIN") {
    return errorResponse("Administrator access required.", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
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

  const { targetUid, type, amountPoisha, reason, operationId } =
    body;

  if (
    typeof targetUid !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(targetUid)
  ) {
    return errorResponse("Invalid target user.", 400);
  }

  if (type !== "CREDIT" && type !== "DEBIT") {
    return errorResponse("Invalid adjustment type.", 400);
  }

  // Maximum adjustment: ৳100,000 per operation.
  if (
    typeof amountPoisha !== "number" ||
    !Number.isSafeInteger(amountPoisha) ||
    amountPoisha <= 0 ||
    amountPoisha > 10_000_000
  ) {
    return errorResponse("Invalid adjustment amount.", 400);
  }

  if (
    typeof reason !== "string" ||
    reason.trim().length < 5 ||
    reason.trim().length > 200
  ) {
    return errorResponse(
      "Provide a reason containing 5 to 200 characters.",
      400
    );
  }

  if (
    typeof operationId !== "string" ||
    !/^[a-zA-Z0-9_-]{10,100}$/.test(operationId)
  ) {
    return errorResponse("Invalid operation ID.", 400);
  }

  try {
    const result = await applyAdminWalletAdjustment({
      targetUid,
      type,
      amountPoisha,
      reason: reason.trim(),
      operationId,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.alreadyApplied
          ? "This adjustment was already processed."
          : "Wallet balance adjusted successfully.",
        transactionId: result.transactionId,
        alreadyApplied: result.alreadyApplied,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin balance adjustment failed:", error);

    return errorResponse(
      "Unable to confirm the adjustment. Check the transaction history before retrying.",
      500
    );
  }
}
