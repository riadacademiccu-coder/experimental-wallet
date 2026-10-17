
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AgentAction =
  | "VERIFY"
  | "UNVERIFY"
  | "ACTIVATE"
  | "DEACTIVATE";

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

async function parseRequest(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== request.nextUrl.origin) {
    throw new Error("Invalid request origin.");
  }

  const contentType =
    request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("JSON request required.");
  }

  const rawBody = await request.text();

  if (rawBody.length > 3000) {
    throw new Error("Request too large.");
  }

  const parsed: unknown = JSON.parse(rawBody);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error("Invalid request data.");
  }

  return parsed as Record<string, unknown>;
}

// Create a new agent.
export async function POST(request: NextRequest) {
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

  let body: Record<string, unknown>;

  try {
    body = await parseRequest(request);
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  const { name, phone, area } = body;

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80
  ) {
    return errorResponse(
      "Agent name must contain 2 to 80 characters.",
      400
    );
  }

  if (
    typeof phone !== "string" ||
    !/^01[3-9]\d{8}$/.test(phone)
  ) {
    return errorResponse(
      "Enter a valid 11-digit phone number.",
      400
    );
  }

  if (
    typeof area !== "string" ||
    area.trim().length < 2 ||
    area.trim().length > 100
  ) {
    return errorResponse(
      "Area must contain 2 to 100 characters.",
      400
    );
  }

  const db = getAdminDb();

  const adminRef = db
    .collection("profiles")
    .doc(admin.uid);

  const agentRef = db.collection("agents").doc();

  const auditRef = db
    .collection("admin_audit_logs")
    .doc();

  try {
    await db.runTransaction(async (transaction) => {
      const adminSnapshot = await transaction.get(adminRef);
      const adminProfile = adminSnapshot.data();

      if (
        !adminSnapshot.exists ||
        adminProfile?.user_id !== admin.uid ||
        adminProfile?.role !== "ADMIN" ||
        adminProfile?.status !== "ACTIVE"
      ) {
        throw new Error("Administrator access denied.");
      }

      transaction.create(agentRef, {
        name: name.trim(),
        phone,
        area: area.trim(),
        verified: false,
        status: "INACTIVE",
        created_by: admin.uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      transaction.create(auditRef, {
        actor_user_id: admin.uid,
        agent_id: agentRef.id,
        action: "ADMIN_CREATE_AGENT",
        created_at: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Agent created successfully.",
        agentId: agentRef.id,
        verified: false,
        status: "INACTIVE",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Agent creation failed:", error);

    return errorResponse(
      "Unable to confirm agent creation. Check the agent list before retrying.",
      500
    );
  }
}

// Verify, unverify, activate, or deactivate an agent.
export async function PATCH(request: NextRequest) {
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

  let body: Record<string, unknown>;

  try {
    body = await parseRequest(request);
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  const { agentId, action } = body;

  if (
    typeof agentId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(agentId)
  ) {
    return errorResponse("Invalid agent ID.", 400);
  }

  if (
    action !== "VERIFY" &&
    action !== "UNVERIFY" &&
    action !== "ACTIVATE" &&
    action !== "DEACTIVATE"
  ) {
    return errorResponse("Invalid agent action.", 400);
  }

  const selectedAction: AgentAction = action;

  const db = getAdminDb();

  const adminRef = db
    .collection("profiles")
    .doc(admin.uid);

  const agentRef = db
    .collection("agents")
    .doc(agentId);

  const auditRef = db
    .collection("admin_audit_logs")
    .doc();

  try {
    const result = await db.runTransaction(
      async (transaction) => {
        const [adminSnapshot, agentSnapshot] =
          await Promise.all([
            transaction.get(adminRef),
            transaction.get(agentRef),
          ]);

        const adminProfile = adminSnapshot.data();
        const agent = agentSnapshot.data();

        if (
          !adminSnapshot.exists ||
          adminProfile?.user_id !== admin.uid ||
          adminProfile?.role !== "ADMIN" ||
          adminProfile?.status !== "ACTIVE"
        ) {
          throw new Error("Administrator access denied.");
        }

        if (!agentSnapshot.exists || !agent) {
          throw new Error("Agent not found.");
        }

        if (
          agent.status !== "ACTIVE" &&
          agent.status !== "INACTIVE"
        ) {
          throw new Error("Invalid agent status.");
        }

        const previousStatus = agent.status;
        const previousVerified = agent.verified === true;

        let nextStatus = previousStatus;
        let nextVerified = previousVerified;

        switch (selectedAction) {
          case "VERIFY":
            nextVerified = true;
            break;

          case "UNVERIFY":
            if (previousStatus === "ACTIVE") {
              throw new Error(
                "Deactivate the agent before removing verification."
              );
            }
            nextVerified = false;
            break;

          case "ACTIVATE":
            if (!previousVerified) {
              throw new Error(
                "Verify the agent before activation."
              );
            }
            nextStatus = "ACTIVE";
            break;

          case "DEACTIVATE":
            nextStatus = "INACTIVE";
            break;
        }

        if (
          nextStatus === previousStatus &&
          nextVerified === previousVerified
        ) {
          return {
            changed: false,
            status: nextStatus,
            verified: nextVerified,
          };
        }

        transaction.update(agentRef, {
          status: nextStatus,
          verified: nextVerified,
          updated_at: FieldValue.serverTimestamp(),
        });

        transaction.create(auditRef, {
          actor_user_id: admin.uid,
          agent_id: agentId,
          action: `ADMIN_AGENT_${selectedAction}`,
          previous_status: previousStatus,
          new_status: nextStatus,
          previous_verified: previousVerified,
          new_verified: nextVerified,
          created_at: FieldValue.serverTimestamp(),
        });

        return {
          changed: true,
          status: nextStatus,
          verified: nextVerified,
        };
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: result.changed
          ? "Agent updated successfully."
          : "Agent already has the requested state.",
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Agent update failed:", error);

    return errorResponse(
      "Unable to update agent. Verify the agent before activation, or deactivate it before removing verification.",
      409
    );
  }
}
