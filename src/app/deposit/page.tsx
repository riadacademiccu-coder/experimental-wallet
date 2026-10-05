"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DepositPage() {
  const supabase = createClient();

  const [bkashNumber, setBkashNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const amountNumber = Number(amount);

    if (!bkashNumber || !transactionId || !amount) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage("Amount must be greater than zero.");
      return;
    }

    const amountPoisha = Math.round(amountNumber * 100);

    setLoading(true);

    const { data, error } = await supabase.rpc(
      "verify_simulated_bkash_deposit",
      {
        p_bkash_number: bkashNumber.trim(),
        p_transaction_id: transactionId.trim(),
        p_amount_poisha: amountPoisha,
      }
    );

    setLoading(false);

    if (error) {
      const text = error.message || "";

      if (text.includes("already been used")) {
        setMessage("This transaction has already been used.");
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
        setMessage("Amount must be greater than zero.");
        return;
      }

      if (text.includes("Invalid bKash transaction")) {
        setMessage("Invalid bKash transaction.");
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
      `Deposit successful. Reference: ${result.wallet_reference}`
    );

    setBkashNumber("");
    setTransactionId("");
    setAmount("");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Deposit
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
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Deposit
            </Link>

            <Link
              href="/withdraw"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Simulated bKash Deposit
            </h2>

            <p className="mt-2 text-slate-500">
              Enter your test transaction details.
            </p>
          </div>

          <form onSubmit={handleDeposit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                bKash Number
              </label>

              <input
                type="text"
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Transaction ID
              </label>

              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Amount
              </label>

              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
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
              {loading ? "Verifying..." : "Verify and Deposit"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}