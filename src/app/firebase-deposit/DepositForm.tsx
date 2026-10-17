"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

type FormState = "editing" | "submitting" | "success" | "uncertain";

type RedeemResult = {
  success?: boolean;
  error?: string;
  transactionId?: string;
  amountPoisha?: number;
};

const MAX_AMOUNT_POISHA = 1_000_000;

function parseAmountPoisha(input: string): number | null {
  const matched = input.trim().match(/^(0|[1-9]\d{0,4})(?:\.(\d{1,2}))?$/);
  if (!matched) return null;

  // Work with integer poisha, never floating-point monetary arithmetic.
  const wholeTaka = Number(matched[1]);
  const fractionPoisha = Number((matched[2] ?? "").padEnd(2, "0"));
  const amount = wholeTaka * 100 + fractionPoisha;

  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_AMOUNT_POISHA
    ? amount
    : null;
}

function formatPoisha(amount: number): string {
  return (amount / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DepositForm() {
  const [senderNumber, setSenderNumber] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<FormState>("editing");
  const [message, setMessage] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [creditedAmount, setCreditedAmount] = useState<number | null>(null);

  const locked = state !== "editing";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    setMessage("");

    const cleanSenderNumber = senderNumber.trim();
    const cleanReference = reference.trim().toUpperCase();
    const amountPoisha = parseAmountPoisha(amount);

    if (!/^01[3-9]\d{8}$/.test(cleanSenderNumber)) {
      setMessage("Enter the 11-digit test sender number provided by your administrator.");
      return;
    }

    if (!/^KBTEST-[A-F0-9]{32}$/.test(cleanReference)) {
      setMessage("Enter the complete test reference starting with KBTEST-.");
      return;
    }

    if (amountPoisha === null) {
      setMessage("Enter a valid amount from ৳0.01 to ৳10,000.00, with up to two decimal places.");
      return;
    }

    if (!confirmed) {
      setMessage("Please confirm that your details match your admin-issued test reference.");
      return;
    }

    setState("submitting");

    try {
      const response = await fetch("/api/firebase/deposit/redeem", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderNumber: cleanSenderNumber,
          reference: cleanReference,
          amountPoisha,
        }),
      });

      const result: RedeemResult = await response.json();

      if (response.ok && result.success === true) {
        setTransactionId(result.transactionId ?? "");
        setCreditedAmount(amountPoisha);
        setState("success");
        return;
      }

      if ([400, 401, 403, 415].includes(response.status)) {
        setMessage(result.error || "Please review your details and try again.");
        setState("editing");
        return;
      }

      // The server deliberately doesn't reveal whether a reference is valid,
      // and an ambiguous response may mean the credit was already applied.
      setState("uncertain");
      setMessage(
        "We couldn't confirm a credit. The details may not match, the reference may already be used, or the response may be incomplete. Check your Transactions page before another attempt."
      );
    } catch {
      setState("uncertain");
      setMessage(
        "We couldn't confirm whether the deposit was processed. Don't submit the reference again until you've checked your Transactions page."
      );
    }
  }

  if (state === "success") {
    return (
      <section role="status" className="rounded-[32px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.11] via-white/[0.045] to-cyan-400/[0.04] p-7 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-400 text-3xl font-extrabold text-slate-950 shadow-xl shadow-emerald-500/10">
          ✓
        </div>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-300">Deposit completed</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Your wallet is credited.</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">Your simulated deposit was applied successfully.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/45 p-6">
          <p className="text-xs uppercase tracking-wider text-slate-400">Amount credited</p>
          <p className="mt-3 text-4xl font-black tabular-nums text-emerald-300">৳{formatPoisha(creditedAmount ?? 0)}</p>
          <div className="mt-6 h-px bg-white/10" />
          <p className="mt-5 text-xs uppercase tracking-wider text-slate-400">Transaction ID</p>
          <p className="mt-2 break-all font-mono text-xs leading-6 text-slate-200">{transactionId || "Available in transaction history"}</p>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/firebase-dashboard" className="rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:brightness-110">Go to dashboard →</Link>
          <Link href="/firebase-transactions" className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">View transactions</Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[32px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Deposit details</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Redeem your reference</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">Use the exact details issued by your administrator.</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300">BDT</div>
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <label htmlFor="deposit-sender" className="mb-2.5 block text-sm font-semibold text-slate-200">Test sender number</label>
          <input
            id="deposit-sender" type="tel" inputMode="numeric" autoComplete="off" placeholder="01XXXXXXXXX"
            required minLength={11} maxLength={11} disabled={locked} value={senderNumber}
            onChange={(event) => setSenderNumber(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0a1525]/80 px-5 py-4 text-base text-white outline-none transition duration-200 placeholder:text-slate-600 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/[0.07] disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="deposit-reference" className="mb-2.5 block text-sm font-semibold text-slate-200">Test transaction reference</label>
          <input
            id="deposit-reference" type="text" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            placeholder="KBTEST-..." required maxLength={39} disabled={locked} value={reference}
            onChange={(event) => setReference(event.target.value.toUpperCase())}
            className="w-full rounded-2xl border border-white/10 bg-[#0a1525]/80 px-5 py-4 font-mono text-sm text-white outline-none transition duration-200 placeholder:font-sans placeholder:text-slate-600 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/[0.07] disabled:opacity-60"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">The reference begins with KBTEST- and can be used once.</p>
        </div>

        <div>
          <label htmlFor="deposit-amount" className="mb-2.5 block text-sm font-semibold text-slate-200">Exact amount</label>
          <div className="flex items-center rounded-2xl border border-white/10 bg-[#0a1525]/80 transition focus-within:border-emerald-400/60 focus-within:ring-4 focus-within:ring-emerald-400/[0.07]">
            <span className="pl-5 text-2xl font-bold text-emerald-300" aria-hidden="true">৳</span>
            <input
              id="deposit-amount" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00"
              required maxLength={8} disabled={locked} value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="min-w-0 w-full bg-transparent px-4 py-4 text-xl font-bold tabular-nums text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Allowed range: ৳0.01–৳10,000.00</p>
        </div>
      </div>

      <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <input
          type="checkbox" checked={confirmed} disabled={locked}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
        />
        <span className="text-sm leading-6 text-slate-300">I confirm the sender number, reference, and amount match my admin-issued test details.</span>
      </label>

      {message && (
        <div role="alert" className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm leading-7 text-amber-100">
          {message}
        </div>
      )}

      <button
        type="submit" disabled={locked || !confirmed}
        className="mt-7 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 px-6 py-4 font-extrabold text-[#07101e] shadow-xl shadow-emerald-500/10 transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "submitting" ? "Verifying reference..." : state === "uncertain" ? "Check transaction history first" : "Verify & credit wallet →"}
      </button>

      {state === "uncertain" && (
        <Link href="/firebase-transactions" className="mt-5 block text-center text-sm font-semibold text-emerald-300 underline underline-offset-4">
          View your transaction history
        </Link>
      )}

      <p className="mt-7 text-center text-xs leading-6 text-slate-500">
        Simulated bKash Deposit — No real payment is processed.
      </p>
    </form>
  );
}
