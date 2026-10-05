"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Agent = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  verified: boolean;
  created_at: string;
};

export default function ManageAgentPage() {
  const supabase = createClient();
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function loadAgent() {
    setPageLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (
      !adminProfile ||
      adminProfile.role !== "ADMIN" ||
      adminProfile.status !== "ACTIVE"
    ) {
      window.location.href = "/dashboard";
      return;
    }

    const { data, error } = await supabase
      .from("agents")
      .select(`
        id,
        name,
        email,
        phone,
        status,
        verified,
        created_at
      `)
      .eq("id", agentId)
      .single();

    if (error || !data) {
      setMessage("Agent not found.");
      setPageLoading(false);
      return;
    }

    setAgent(data as Agent);
    setPageLoading(false);
  }

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  async function setVerification(verified: boolean) {
    if (!agent) return;

    setActionLoading(true);
    setMessage("");
    setSuccess(false);

    const { error } = await supabase.rpc(
      "admin_set_agent_verification",
      {
        p_agent_id: agent.id,
        p_verified: verified,
      }
    );

    setActionLoading(false);

    if (error) {
      if (error.message.includes("Admin access required")) {
        setMessage("Admin access required.");
        return;
      }

      setMessage(error.message || "Unable to update agent.");
      return;
    }

    setSuccess(true);
    setMessage(
      verified
        ? "Agent verified successfully."
        : "Agent verification removed successfully."
    );

    await loadAgent();
  }

  async function setStatus(status: "ACTIVE" | "INACTIVE") {
    if (!agent) return;

    setActionLoading(true);
    setMessage("");
    setSuccess(false);

    const { error } = await supabase.rpc(
      "admin_set_agent_status",
      {
        p_agent_id: agent.id,
        p_status: status,
      }
    );

    setActionLoading(false);

    if (error) {
      if (error.message.includes("Admin access required")) {
        setMessage("Admin access required.");
        return;
      }

      setMessage(error.message || "Unable to update agent.");
      return;
    }

    setSuccess(true);
    setMessage(
      status === "ACTIVE"
        ? "Agent activated successfully."
        : "Agent deactivated successfully."
    );

    await loadAgent();
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  if (!agent) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow">
          <p className="text-red-600">
            {message || "Agent not found."}
          </p>

          <Link
            href="/admin/agents"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            Back to Agents
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — Manage Agent
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/agents"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Agents
            </Link>

            <Link
              href="/admin"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Agent
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-900">
                {agent.name}
              </h2>

              <p className="mt-2 text-slate-500">
                {agent.email}
              </p>

              <p className="text-sm text-slate-400">
                {agent.phone || "No phone number"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  agent.verified
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {agent.verified ? "VERIFIED" : "NOT VERIFIED"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  agent.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {agent.status}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                Verification
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {agent.verified ? "Verified" : "Not Verified"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                Status
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {agent.status}
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`mt-6 rounded-xl p-4 text-sm ${
                success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <section className="mt-8">
            <h3 className="text-lg font-bold text-slate-900">
              Verification Controls
            </h3>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              {!agent.verified ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setVerification(true)}
                  className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {actionLoading ? "Processing..." : "Verify Agent"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setVerification(false)}
                  className="rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {actionLoading
                    ? "Processing..."
                    : "Remove Verification"}
                </button>
              )}
            </div>
          </section>

          <section className="mt-8 border-t border-slate-200 pt-8">
            <h3 className="text-lg font-bold text-slate-900">
              Agent Status
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Only ACTIVE and VERIFIED agents can be used for withdrawal requests.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              {agent.status === "INACTIVE" ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setStatus("ACTIVE")}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {actionLoading ? "Processing..." : "Activate Agent"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setStatus("INACTIVE")}
                  className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {actionLoading
                    ? "Processing..."
                    : "Deactivate Agent"}
                </button>
              )}
            </div>
          </section>

          <section className="mt-8 border-t border-slate-200 pt-8">
            <h3 className="text-lg font-bold text-slate-900">
              Agent Information
            </h3>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">
                  Agent ID
                </p>

                <p className="mt-1 break-all font-mono text-xs text-slate-700">
                  {agent.id}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Created
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {new Date(agent.created_at).toLocaleString("en-BD")}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}