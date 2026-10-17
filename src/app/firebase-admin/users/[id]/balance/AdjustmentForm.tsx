
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type AdjustmentType = "CREDIT" | "DEBIT";

type Props = {
  targetUid: string;
  targetName: string;
};

type FormStatus = "editing" | "saving" | "success" | "uncertain";

function parseAmountPoisha(value: string): number | null {
  const match = value.trim().match(
    /^(0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/
  );

  if (!match) return null;

  const taka = Number(match[1]);
  const poisha = Number((match[2] ?? "").padEnd(2, "0"));

  const total = taka * 100 + poisha;

  if (
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    total > 10_000_000
  ) {
    return null;
  }

  return total;
}

export default function AdjustmentForm({
  targetUid,
  targetName,
}: Props) {
  const [type, setType] = useState<AdjustmentType>("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const [status, setStatus] = useState<FormStatus>("editing");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const locked = status !== "editing";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (locked) return;

    setError("");

    const amountPoisha = parseAmountPoisha(amount);
    const cleanReason = reason.trim();

    if (amountPoisha === null) {
      setError(
        "Enter an amount between ৳0.01 and ৳100,000.00."
      );
      return;
    }

    if (cleanReason.length < 5 || cleanReason.length > 200) {
      setError("Enter a reason containing 5 to 200 characters.");
      return;
    }

    if (!confirmed) {
      setError("Please confirm the adjustment details.");
      return;
    }

    // One operation ID per submitted adjustment.
    // Do not automatically retry an uncertain wallet operation.
    const operationId = crypto.randomUUID();

    setStatus("saving");

    try {
      const response = await fetch(
        "/api/firebase-admin/adjust-balance",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUid,
            type,
            amountPoisha,
            reason: cleanReason,
            operationId,
          }),
        }
      );

      const data: {
        success?: boolean;
        error?: string;
        transactionId?: string;
      } = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(data.error ?? "Unable to confirm adjustment.");
      }

      setReference(data.transactionId ?? operationId);
      setStatus("success");
    } catch {
      setStatus("uncertain");
      setError(
        "The adjustment could not be confirmed. Check the user's transaction history before attempting another adjustment."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[30px] border border-emerald-400/20 bg-emerald-400/[0.07] p-7 sm:p-9">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400 text-3xl font-bold text-slate-950">
          ✓
        </div>

        <h2 className="mt-7 text-3xl font-extrabold">
          Adjustment completed
        </h2>

        <p className="mt-3 leading-7 text-slate-300">
          The {type.toLowerCase()} was processed successfully for{" "}
          <strong className="text-white">{targetName}</strong>.
        </p>

        <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Transaction reference
          </p>
          <p className="mt-2 break-all font-mono text-sm text-emerald-300">
            {reference}
          </p>
        </div>

        <Link
          href={`/firebase-admin/users/${targetUid}`}
          className="mt-8 inline-flex rounded-2xl bg-emerald-400 px-6 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-300"
        >
          View updated wallet →
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9"
    >
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
          Wallet controls
        </p>

        <h2 className="mt-3 text-2xl font-extrabold">
          Balance Adjustment
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-400">
          Choose an operation, enter the amount, and record
          the reason for this adjustment.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-200">
          Adjustment type
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={locked}
            aria-pressed={type === "CREDIT"}
            onClick={() => setType("CREDIT")}
            className={`rounded-2xl border p-5 text-left transition duration-300 disabled:cursor-not-allowed ${
              type === "CREDIT"
                ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/10"
            }`}
          >
            <span className="block text-2xl">↙</span>
            <span className="mt-3 block text-lg font-extrabold">
              Credit
            </span>
            <span className="mt-1 block text-xs opacity-70">
              Add to balance
            </span>
          </button>

          <button
            type="button"
            disabled={locked}
            aria-pressed={type === "DEBIT"}
            onClick={() => setType("DEBIT")}
            className={`rounded-2xl border p-5 text-left transition duration-300 disabled:cursor-not-allowed ${
              type === "DEBIT"
                ? "border-rose-400/60 bg-rose-400/15 text-rose-300"
                : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/10"
            }`}
          >
            <span className="block text-2xl">↗</span>
            <span className="mt-3 block text-lg font-extrabold">
              Debit
            </span>
            <span className="mt-1 block text-xs opacity-70">
              Deduct from balance
            </span>
          </button>
        </div>
      </div>

      <div className="mt-7">
        <label
          htmlFor="adjustmentAmount"
          className="mb-3 block text-sm font-semibold text-slate-200"
        >
          Amount (BDT)
        </label>

        <div className="flex items-center rounded-2xl border border-white/10 bg-slate-950/50 focus-within:border-emerald-400/60">
          <span className="px-5 text-2xl font-bold text-emerald-300">
            ৳
          </span>

          <input
            id="adjustmentAmount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            required
            maxLength={10}
            disabled={locked}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="min-w-0 w-full bg-transparent py-4 pr-5 text-xl font-bold text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Minimum ৳0.01 · Maximum ৳100,000.00 per adjustment
        </p>
      </div>

      <div className="mt-7">
        <label
          htmlFor="adjustmentReason"
          className="mb-3 block text-sm font-semibold text-slate-200"
        >
          Adjustment reason
        </label>

        <textarea
          id="adjustmentReason"
          rows={4}
          maxLength={200}
          required
          disabled={locked}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this balance adjustment is needed..."
          className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60 disabled:opacity-60"
        />

        <p className="mt-2 text-right text-xs text-slate-500">
          {reason.length}/200 characters
        </p>
      </div>

      <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={locked}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-4 w-4 accent-emerald-400"
        />

        <span className="text-sm leading-6 text-slate-300">
          I have checked the selected user, amount, and
          adjustment type.
        </span>
      </label>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-7 text-amber-200"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={locked || !confirmed}
        className={`mt-7 flex w-full items-center justify-center rounded-2xl px-6 py-4 text-sm font-extrabold transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          type === "CREDIT"
            ? "bg-gradient-to-r from-emerald-300 to-teal-400 text-slate-950 hover:brightness-110"
            : "bg-gradient-to-r from-rose-400 to-orange-300 text-slate-950 hover:brightness-110"
        }`}
      >
        {status === "saving"
          ? "Processing adjustment..."
          : status === "uncertain"
            ? "Check transaction history"
            : `Confirm ${type === "CREDIT" ? "Credit" : "Debit"}`}
      </button>

      <p className="mt-5 text-center text-xs leading-6 text-slate-500">
        Each successful adjustment is saved with its transaction
        record and administrator audit log.
      </p>

      {status === "uncertain" && (
        <Link
          href={`/firebase-admin/users/${targetUid}`}
          className="mt-5 block text-center text-sm font-semibold text-emerald-300 underline"
        >
          Open transaction history
        </Link>
      )}
    </form>
  );
}
