"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

type Props = {
  availableBalancePoisha: number;
  senderEmail: string;
};

type FormStatus = "editing" | "submitting" | "success" | "uncertain";

const MAX_TRANSFER_POISHA = 1_000_000;

function toPoisha(value: string): number | null {
  const match = value.trim().match(/^(0|[1-9]\d{0,4})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_TRANSFER_POISHA
    ? amount
    : null;
}

function formatMoney(poisha: number) {
  return `৳${(poisha / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TransferForm({ availableBalancePoisha, senderEmail }: Props) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<FormStatus>("editing");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const inFlight = useRef(false);

  const amountPoisha = toPoisha(amount);
  const canSubmit =
    status === "editing" &&
    confirmed &&
    Boolean(amountPoisha) &&
    (amountPoisha ?? 0) <= availableBalancePoisha &&
    recipientEmail.trim().length > 0 &&
    recipientEmail.trim().toLowerCase() !== senderEmail.toLowerCase();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || status !== "editing") return;
    if (!confirmed) {
      setError("Confirm the recipient and amount before sending.");
      return;
    }
    if (!amountPoisha || amountPoisha > availableBalancePoisha) {
      setError("Enter an amount within your available balance (maximum ৳10,000).");
      return;
    }
    const normalizedEmail = recipientEmail.trim().toLowerCase();
    if (normalizedEmail === senderEmail.toLowerCase()) {
      setError("You cannot transfer money to yourself.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid recipient email address.");
      return;
    }

    const operationId = crypto.randomUUID();
    setReference(operationId);
    setStatus("submitting");
    setError("");
    inFlight.current = true;

    try {
      const response = await fetch("/api/firebase/transfer", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: normalizedEmail,
          amountPoisha,
          operationId,
        }),
      });
      const result: {
        success?: boolean;
        error?: string;
        operationId?: string;
      } = await response.json();
      if (!response.ok || !result.success) {
        // Treat uncertain results conservatively: no automatic retry using a
        // new operation ID, which could create a second real wallet transfer.
        throw new Error(result.error ?? "Transfer could not be confirmed.");
      }
      setReference(result.operationId ?? operationId);
      setStatus("success");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Transfer could not be confirmed. Check history before trying again."
      );
      setStatus("uncertain");
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "success") {
    return (
      <section aria-live="polite" className="rounded-[30px] border border-emerald-400/25 bg-white/[0.055] p-7 shadow-2xl backdrop-blur-xl sm:p-9">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-3xl text-emerald-300">✓</div>
        <h2 className="mt-7 text-3xl font-extrabold">Transfer completed</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">The wallet transfer has been recorded for both accounts.</p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Amount sent</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">{formatMoney(amountPoisha ?? 0)}</p>
          <p className="mt-4 break-all text-sm text-slate-300">To: {recipientEmail.trim().toLowerCase()}</p>
          <p className="mt-3 break-all text-xs text-slate-500">Reference: {reference}</p>
        </div>
        <Link href="/firebase-transactions" className="mt-7 inline-flex rounded-2xl bg-emerald-400 px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-300">View transaction history →</Link>
      </section>
    );
  }

  if (status === "uncertain") {
    return (
      <section aria-live="assertive" className="rounded-[30px] border border-amber-300/20 bg-white/[0.055] p-7 shadow-2xl backdrop-blur-xl sm:p-9">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-3xl text-amber-300">!</div>
        <h2 className="mt-7 text-2xl font-extrabold">Transfer not confirmed</h2>
        <p className="mt-3 text-sm leading-7 text-amber-100/80">{error}</p>
        <p className="mt-4 text-sm leading-7 text-slate-400">Do not immediately send the same amount again. Check your transaction history first, especially if the connection was interrupted.</p>
        <p className="mt-4 break-all text-xs text-slate-500">Attempt reference: {reference}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/firebase-transactions" className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-300">View history</Link>
          <Link href="/firebase-dashboard" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">Dashboard</Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[30px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Internal transfer</p>
          <h2 className="mt-3 text-2xl font-extrabold">Transfer details</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">Enter the recipient&apos;s Firebase login email address and amount.</p>
        </div>
        <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">BDT</span>
      </div>

      <div className="mt-8">
        <label htmlFor="recipientEmail" className="mb-3 block text-sm font-semibold text-slate-200">Recipient email</label>
        <input
          id="recipientEmail"
          type="email"
          required
          autoComplete="off"
          maxLength={254}
          placeholder="friend@example.com"
          value={recipientEmail}
          disabled={status !== "editing"}
          onChange={(event) => { setRecipientEmail(event.target.value); setConfirmed(false); setError(""); }}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10 disabled:opacity-60"
        />
        <p className="mt-2 text-xs text-slate-500">The recipient must have an active and verified Kids Bank Ltd account.</p>
      </div>

      <div className="mt-7">
        <label htmlFor="transferAmount" className="mb-3 block text-sm font-semibold text-slate-200">Amount (BDT)</label>
        <div className="flex items-center rounded-2xl border border-white/10 bg-slate-950/50 focus-within:border-emerald-400/60 focus-within:ring-4 focus-within:ring-emerald-400/10">
          <span className="pl-5 text-2xl font-black text-emerald-300">৳</span>
          <input
            id="transferAmount"
            type="text"
            inputMode="decimal"
            required
            placeholder="0.00"
            maxLength={8}
            value={amount}
            disabled={status !== "editing"}
            onChange={(event) => { setAmount(event.target.value); setConfirmed(false); setError(""); }}
            className="w-full bg-transparent px-4 py-4 text-xl font-bold text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">Maximum ৳10,000.00 per transfer.</p>
      </div>

      <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/35 p-5">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-400">Available now</span>
          <strong>{formatMoney(availableBalancePoisha)}</strong>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-400">Transfer amount</span>
          <strong>{amountPoisha ? formatMoney(amountPoisha) : "—"}</strong>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm">
          <span className="text-slate-400">Remaining available</span>
          <strong className="text-emerald-300">{amountPoisha && amountPoisha <= availableBalancePoisha ? formatMoney(availableBalancePoisha - amountPoisha) : "—"}</strong>
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-300">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={status !== "editing"}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
        />
        <span>I confirmed the recipient email and amount. I understand that wallet transfers are immediate and simulated.</span>
      </label>

      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || status === "submitting" || inFlight.current}
        className="mt-7 w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-4 text-sm font-extrabold text-slate-950 shadow-xl shadow-emerald-950/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "submitting" ? "Confirming transfer…" : "Send wallet transfer →"}
      </button>
      <p className="mt-4 text-center text-xs leading-6 text-slate-500">No real money is transferred. This feature is for the simulated Kids Bank Ltd wallet only.</p>
    </form>
  );
}
