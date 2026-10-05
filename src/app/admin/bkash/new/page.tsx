"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddBkashTestTransactionPage() {
  const supabase = createClient();
  const router = useRouter();

  const [bkashNumber, setBkashNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanNumber = bkashNumber.trim();
    const cleanTransactionId = transactionId.trim().toUpperCase();
    const amountNumber = Number(amount);

    if (cleanNumber.length < 5) {
      setMessage("Please enter a valid bKash number.");
      return;
    }

    if (cleanTransactionId.length < 3) {
      setMessage("Please enter a transaction ID.");
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage("Amount must be greater than zero.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc(
      "admin_add_bkash_test_transaction",
      {
        p_bkash_number: cleanNumber,
        p_transaction_id: cleanTransactionId,
        p_amount_poisha: Math.round(amountNumber * 100),
      }
    );

    setLoading(false);

    if (error) {
      const errorText = error.message.toLowerCase();

      if (
        errorText.includes("duplicate") ||
        errorText.includes("unique")
      ) {
        setMessage("This transaction ID already exists.");
        return;
      }

      if (error.message.includes("Admin access required")) {
        setMessage("Admin access required.");
        return;
      }

      setMessage(error.message || "Unable to add test transaction.");
      return;
    }

    if (!data) {
      setMessage("Unable to create test transaction.");
      return;
    }

    setSuccess(true);
    setMessage("Test bKash transaction created successfully.");

    setBkashNumber("");
    setTransactionId("");
    setAmount("");

    setTimeout(() => {
      router.push("/admin/bkash");
      router.refresh();
    }, 800);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — Add Test bKash Transaction
            </p>
          </div>

          <Link
            href="/admin/bkash"
            className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
          >
            Back to bKash
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Create Test Transaction
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              This record can later be used by a user on the deposit page.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                bKash Number
              </label>

              <input
                type="text"
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                placeholder="01700000002"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Transaction ID
              </label>

              <input
                type="text"
                value={transactionId}
                onChange={(e) =>
                  setTransactionId(e.target.value.toUpperCase())
                }
                placeholder="TEST456"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-slate-900"
                required
              />
            </div>

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
                required
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
                ? "Creating Transaction..."
                : "Create Test Transaction"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}