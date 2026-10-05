"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserInfo = {
  full_name: string;
  email: string;
  status: string;
};

export default function AdminBalancePage() {
  const supabase = createClient();

  const params = useParams();
  const searchParams = useSearchParams();

  const userId = params.id as string;
  const type = (searchParams.get("type") || "credit").toLowerCase();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [balance, setBalance] = useState(0);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  function actionLabel() {
    if (type === "debit") return "Deduct Balance";
    if (type === "bonus") return "Give Bonus";
    if (type === "refund") return "Refund";
    return "Add Balance";
  }

  function rpcAction() {
    if (type === "debit") return "DEBIT";
    if (type === "bonus") return "BONUS";
    if (type === "refund") return "REFUND";
    return "CREDIT";
  }

  async function loadUser() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      window.location.href = "/login";
      return;
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", currentUser.id)
      .single();

    if (
      !adminProfile ||
      adminProfile.role !== "ADMIN" ||
      adminProfile.status !== "ACTIVE"
    ) {
      window.location.href = "/dashboard";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, status")
      .eq("id", userId)
      .single();

    const { data: account } = await supabase
      .from("accounts")
      .select("available_balance_poisha")
      .eq("user_id", userId)
      .single();

    if (profile) {
      setUserInfo(profile);
    }

    if (account) {
      setBalance(Number(account.available_balance_poisha ?? 0) / 100);
    }

    setPageLoading(false);
  }

  useEffect(() => {
    loadUser();
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const amountNumber = Number(amount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage("Amount must be greater than zero.");
      return;
    }

    if (reason.trim().length < 3) {
      setMessage("Please provide a reason.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc(
      "admin_adjust_balance",
      {
        p_user_id: userId,
        p_action: rpcAction(),
        p_amount_poisha: Math.round(amountNumber * 100),
        p_reason: reason.trim(),
      }
    );

    setLoading(false);

    if (error) {
      const text = error.message || "";

      if (text.includes("Insufficient balance")) {
        setMessage("Insufficient balance.");
        return;
      }

      if (text.includes("Admin access required")) {
        setMessage("Admin access required.");
        return;
      }

      if (text.includes("Reason is required")) {
        setMessage("Please provide a reason.");
        return;
      }

      if (text.includes("greater than zero")) {
        setMessage("Amount must be greater than zero.");
        return;
      }

      setMessage("Something went wrong. Please try again.");
      return;
    }

    const result = data?.[0];

    if (!result) {
      setMessage("Something went wrong. Please try again.");
      return;
    }

    setSuccess(true);
    setMessage(
      `${actionLabel()} completed successfully. Reference: ${result.reference}`
    );

    setBalance(
      Number(result.new_available_balance_poisha ?? 0) / 100
    );

    setAmount("");
    setReason("");
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin Balance Management
            </p>
          </div>

          <Link
            href={`/admin/users/${userId}`}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to User
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {actionLabel()}
            </h2>

            <p className="mt-2 text-slate-500">
              {userInfo?.full_name}
            </p>

            <p className="text-sm text-slate-400">
              {userInfo?.email}
            </p>
          </div>

          <div className="mb-6 rounded-2xl bg-slate-900 p-5 text-white">
            <p className="text-sm text-slate-400">
              Current Available Balance
            </p>

            <p className="mt-2 text-3xl font-bold">
              ৳
              {balance.toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Amount
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Reason
              </label>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Example: Testing bonus"
                rows={4}
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
              className={`w-full rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-60 ${
                type === "debit"
                  ? "bg-red-600"
                  : type === "bonus"
                  ? "bg-blue-600"
                  : type === "refund"
                  ? "bg-slate-700"
                  : "bg-green-600"
              }`}
            >
              {loading
                ? "Processing..."
                : actionLabel()}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}