"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Withdrawal = {
  id: string;
  reference: string;
  user_id: string;
  agent_id: string;
  amount_poisha: number;
  status: string;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type Agent = {
  id: string;
  name: string;
  email: string;
};

export default function AdminWithdrawalsPage() {
  const supabase = createClient();

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [agents, setAgents] = useState<Record<string, Agent>>({});

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function loadData() {
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

    const { data: withdrawalRows, error: withdrawalError } =
      await supabase
        .from("withdrawal_requests")
        .select(`
          id,
          reference,
          user_id,
          agent_id,
          amount_poisha,
          status,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

    if (withdrawalError) {
      setMessage("Unable to load withdrawal requests.");
      setPageLoading(false);
      return;
    }

    const rows = (withdrawalRows || []) as Withdrawal[];

    setWithdrawals(rows);

    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const agentIds = [...new Set(rows.map((row) => row.agent_id))];

    if (userIds.length > 0) {
      const { data: userRows } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const map: Record<string, Profile> = {};

      for (const profile of userRows || []) {
        map[profile.id] = profile;
      }

      setProfiles(map);
    } else {
      setProfiles({});
    }

    if (agentIds.length > 0) {
      const { data: agentRows } = await supabase
        .from("agents")
        .select("id, name, email")
        .in("id", agentIds);

      const map: Record<string, Agent> = {};

      for (const agent of agentRows || []) {
        map[agent.id] = agent;
      }

      setAgents(map);
    } else {
      setAgents({});
    }

    setPageLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function formatMoney(poisha: number) {
    return (Number(poisha) / 100).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function statusStyle(status: string) {
    if (status === "COMPLETED" || status === "APPROVED") {
      return "bg-green-100 text-green-700";
    }

    if (status === "PENDING") {
      return "bg-amber-100 text-amber-700";
    }

    if (
      status === "REJECTED" ||
      status === "CANCELLED"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  async function approveWithdrawal(id: string) {
    const confirmed = window.confirm(
      "Approve this withdrawal request?"
    );

    if (!confirmed) return;

    setActionLoading(id);
    setMessage("");
    setSuccess(false);

    const { data, error } = await supabase.rpc(
      "admin_approve_withdrawal",
      {
        p_withdrawal_id: id,
      }
    );

    setActionLoading(null);

    if (error) {
      if (error.message.includes("Admin access required")) {
        setMessage("Admin access required.");
        return;
      }

      if (error.message.includes("not pending")) {
        setMessage("This withdrawal is no longer pending.");
        await loadData();
        return;
      }

      setMessage(error.message || "Unable to approve withdrawal.");
      return;
    }

    setSuccess(true);
    setMessage(
      `Withdrawal approved successfully${
        data ? `. Reference: ${data}` : "."
      }`
    );

    await loadData();
  }

  async function rejectWithdrawal(id: string) {
    const confirmed = window.confirm(
      "Reject this withdrawal request? The held amount will be returned to the user's available balance."
    );

    if (!confirmed) return;

    setActionLoading(id);
    setMessage("");
    setSuccess(false);

    const { data, error } = await supabase.rpc(
      "admin_reject_withdrawal",
      {
        p_withdrawal_id: id,
      }
    );

    setActionLoading(null);

    if (error) {
      if (error.message.includes("Admin access required")) {
        setMessage("Admin access required.");
        return;
      }

      if (error.message.includes("not pending")) {
        setMessage("This withdrawal is no longer pending.");
        await loadData();
        return;
      }

      setMessage(error.message || "Unable to reject withdrawal.");
      return;
    }

    setSuccess(true);
    setMessage(
      `Withdrawal rejected successfully${
        data ? `. Reference: ${data}` : "."
      }`
    );

    await loadData();
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">
          Loading...
        </p>
      </main>
    );
  }

  const pendingCount = withdrawals.filter(
    (item) => item.status === "PENDING"
  ).length;

  const completedCount = withdrawals.filter(
    (item) =>
      item.status === "COMPLETED" ||
      item.status === "APPROVED"
  ).length;

  const rejectedCount = withdrawals.filter(
    (item) =>
      item.status === "REJECTED" ||
      item.status === "CANCELLED"
  ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — Withdrawal Management
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Admin Dashboard
            </Link>

            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Users
            </Link>

            <a
              href="/logout"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Logout
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">
            Withdrawal Requests
          </h2>

          <p className="mt-2 text-slate-500">
            Review pending withdrawal requests and approve or reject them.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Pending
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Completed
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {completedCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {rejectedCount}
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

        <div className="mt-8 rounded-3xl bg-white p-6 shadow">
          {withdrawals.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">
              No withdrawal requests found.
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => {
                const profile = profiles[withdrawal.user_id];
                const agent = agents[withdrawal.agent_id];

                const isPending =
                  withdrawal.status === "PENDING";

                return (
                  <div
                    key={withdrawal.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-mono text-sm font-bold text-slate-900">
                            {withdrawal.reference}
                          </p>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                              withdrawal.status
                            )}`}
                          >
                            {withdrawal.status}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              User
                            </p>

                            {profile ? (
                              <>
                                <Link
                                  href={`/admin/users/${profile.id}`}
                                  className="mt-1 block font-semibold text-blue-600"
                                >
                                  {profile.full_name}
                                </Link>

                                <p className="text-xs text-slate-500">
                                  {profile.email}
                                </p>
                              </>
                            ) : (
                              <p className="mt-1 font-mono text-xs text-slate-500">
                                {withdrawal.user_id}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Agent
                            </p>

                            {agent ? (
                              <>
                                <p className="mt-1 font-semibold text-slate-900">
                                  {agent.name}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {agent.email}
                                </p>
                              </>
                            ) : (
                              <p className="mt-1 font-mono text-xs text-slate-500">
                                {withdrawal.agent_id}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Amount
                            </p>

                            <p className="mt-1 text-xl font-bold text-slate-900">
                              ৳
                              {formatMoney(
                                withdrawal.amount_poisha
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Requested
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {new Date(
                                withdrawal.created_at
                              ).toLocaleString("en-BD")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                          <button
                            type="button"
                            disabled={
                              actionLoading === withdrawal.id
                            }
                            onClick={() =>
                              approveWithdrawal(withdrawal.id)
                            }
                            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {actionLoading === withdrawal.id
                              ? "Processing..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              actionLoading === withdrawal.id
                            }
                            onClick={() =>
                              rejectWithdrawal(withdrawal.id)
                            }
                            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {actionLoading === withdrawal.id
                              ? "Processing..."
                              : "Reject"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}