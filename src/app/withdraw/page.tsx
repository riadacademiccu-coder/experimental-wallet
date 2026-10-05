"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WithdrawalRequest = {
  id: string;
  reference: string;
  amount_poisha: number;
  status: string;
  created_at: string;
  agent_id: string;
};

export default function WithdrawPage() {
  const supabase = createClient();

  const [agentEmail, setAgentEmail] = useState("");
  const [amount, setAmount] = useState("");

  const [balance, setBalance] = useState(0);
  const [heldBalance, setHeldBalance] = useState(0);
  const [status, setStatus] = useState("UNKNOWN");

  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  async function loadWallet() {
    const { data, error } = await supabase.rpc(
      "get_my_wallet_summary"
    );

    if (!error && data && data.length > 0) {
      const wallet = data[0];

      setBalance(
        Number(wallet.available_balance_poisha ?? 0) / 100
      );

      setHeldBalance(
        Number(wallet.held_balance_poisha ?? 0) / 100
      );

      setStatus(wallet.account_status ?? "UNKNOWN");
    }
  }

  async function loadRequests() {
    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        id,
        reference,
        amount_poisha,
        status,
        created_at,
        agent_id
        `
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setRequests(data);
    }
  }

  useEffect(() => {
    async function loadPage() {
      await Promise.all([
        loadWallet(),
        loadRequests(),
      ]);

      setPageLoading(false);
    }

    loadPage();
  }, []);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const amountNumber = Number(amount);

    if (!agentEmail || !amount) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage(
        "Withdrawal amount must be greater than zero."
      );
      return;
    }

    const amountPoisha = Math.round(amountNumber * 100);

    setLoading(true);

    const { data, error } = await supabase.rpc(
      "create_withdrawal_request",
      {
        p_agent_email: agentEmail.trim(),
        p_amount_poisha: amountPoisha,
      }
    );

    setLoading(false);

    if (error) {
      const text = error.message || "";

      if (text.includes("Insufficient balance")) {
        setMessage("Insufficient balance.");
        return;
      }

      if (text.includes("Agent is not verified")) {
        setMessage("Agent is not verified.");
        return;
      }

      if (text.includes("frozen")) {
        setMessage("Your account is currently frozen.");
        return;
      }

      if (text.includes("suspended")) {
        setMessage("Your account is currently suspended.");
        return;
      }

      if (text.includes("not active")) {
        setMessage("Your account is not active.");
        return;
      }

      if (text.includes("greater than zero")) {
        setMessage(
          "Withdrawal amount must be greater than zero."
        );
        return;
      }

      setMessage(
        "Something went wrong. Please try again."
      );
      return;
    }

    const result = data?.[0];

    if (!result) {
      setMessage(
        "Something went wrong. Please try again."
      );
      return;
    }

    setSuccess(true);

    setMessage(
      `Withdrawal request created successfully. Reference: ${result.withdrawal_reference}`
    );

    setAgentEmail("");
    setAmount("");

    await Promise.all([
      loadWallet(),
      loadRequests(),
    ]);
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

  const restricted =
    status === "FROZEN" ||
    status === "SUSPENDED" ||
    status === "PENDING";

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Withdraw
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Dashboard
            </Link>

            <Link
              href="/deposit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Deposit
            </Link>

            <Link
              href="/withdraw"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Withdraw
            </Link>

            <Link
              href="/transactions"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Transactions
            </Link>

            <Link
              href="/profile"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Profile
            </Link>

            <a
              href="/logout"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Logout
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow">
            <p className="text-sm text-slate-400">
              Available Balance
            </p>

            <p className="mt-2 text-3xl font-bold">
              ৳
              {balance.toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Held Balance
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              ৳
              {heldBalance.toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-8 shadow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Withdraw via Agent
            </h2>

            <p className="mt-2 text-slate-500">
              Enter a verified agent email and withdrawal amount.
            </p>
          </div>

          <div className="mb-6 rounded-2xl bg-slate-100 p-4">
            <p className="text-sm text-slate-500">
              Account Status
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {status}
            </p>
          </div>

          {restricted ? (
            <div className="rounded-2xl bg-red-50 p-5 text-red-700">
              Withdrawals are not available while your account status is{" "}
              {status}.
            </div>
          ) : (
            <form
              onSubmit={handleWithdraw}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Agent Email
                </label>

                <input
                  type="email"
                  value={agentEmail}
                  onChange={(e) =>
                    setAgentEmail(e.target.value)
                  }
                  placeholder="agent@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Withdrawal Amount
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  placeholder="300"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              {message && (
                <div
                  className={`rounded-xl p-4 text-sm ${
                    success
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {loading
                  ? "Creating Request..."
                  : "Request Withdrawal"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-slate-900">
            Withdrawal Requests
          </h2>

          {!requests || requests.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-slate-500">
                No withdrawal requests yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {request.reference}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(
                        request.created_at
                      ).toLocaleString("en-BD")}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="font-bold text-slate-900">
                      ৳
                      {(
                        Number(request.amount_poisha) / 100
                      ).toLocaleString("en-BD", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {request.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}