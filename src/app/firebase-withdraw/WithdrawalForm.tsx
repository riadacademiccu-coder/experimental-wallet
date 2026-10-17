"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

export type WithdrawalAgent = {
  id: string;
  name: string;
  area: string;
  phone: string;
};

type Props = {
  agents: WithdrawalAgent[];
  availableBalancePoisha: number;
  heldBalancePoisha: number;
};

type FormStatus = "editing" | "submitting" | "success" | "uncertain";

const MAX_WITHDRAWAL_POISHA = 1_000_000;

function formatMoney(poisha: number): string {
  return `৳${(poisha / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Convert BDT to integer poisha without floating-point rounding errors.
function parsePoisha(raw: string): number | null {
  const match = raw.trim().match(/^(0|[1-9]\d{0,4})(?:\.(\d{1,2}))?$/);
  if (!match) return null;

  const taka = Number(match[1]);
  const poisha = Number((match[2] ?? "").padEnd(2, "0"));
  const total = taka * 100 + poisha;

  return Number.isSafeInteger(total) && total > 0 && total <= MAX_WITHDRAWAL_POISHA
    ? total
    : null;
}

export default function WithdrawalForm({
  agents,
  availableBalancePoisha,
  heldBalancePoisha,
}: Props) {
  const [agentId, setAgentId] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<FormStatus>("editing");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const inFlight = useRef(false);

  const selectedAgent = agents.find((agent) => agent.id === agentId);
  const parsedAmount = parsePoisha(amount);
  const isValidAmount =
    parsedAmount !== null && parsedAmount <= availableBalancePoisha;
  const canSubmit =
    status === "editing" &&
    selectedAgent !== undefined &&
    isValidAmount &&
    confirmed;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || status !== "editing") return;

    setError("");
    const amountPoisha = parsePoisha(amount);

    if (!selectedAgent) {
      setError("Please select a verified agent.");
      return;
    }
    if (amountPoisha === null) {
      setError("Enter a valid amount from ৳0.01 to ৳10,000.00.");
      return;
    }
    if (amountPoisha > availableBalancePoisha) {
      setError("This amount is greater than your displayed available balance.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm the request details.");
      return;
    }

    // Generate this ID exactly once for this attempt. Never auto-retry
    // a wallet request with a different ID if the result is uncertain.
    const operationId = crypto.randomUUID();
    setReference(operationId);
    inFlight.current = true;
    setStatus("submitting");

    try {
      const response = await fetch("/api/firebase/withdraw/request", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          amountPoisha,
          operationId,
        }),
      });

      const result: {
        success?: boolean;
        error?: string;
        requestId?: string;
      } = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(result.error ?? "Unable to confirm the withdrawal request.");
      }

      setReference(result.requestId ?? operationId);
      setStatus("success");
    } catch {
      // The server might have reserved money before a network error.
      // Lock this attempt and ask the user to verify the ledger first.
      setStatus("uncertain");
      setError(
        "The request result could not be confirmed. Check your wallet balance and transaction history before attempting another withdrawal."
      );
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "success") {
    return (
      <section className="rounded-[30px] border border-emerald-400/25 bg-emerald-400/[0.07] p-7 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400 text-3xl font-black text-slate-950">
          ✓
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Request received</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Withdrawal submitted</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Your withdrawal request for <strong className="text-white">{formatMoney(parsedAmount ?? 0)}</strong> has been placed in the review queue.
          The amount is reserved until an administrator approves or rejects it.
        </p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request reference</p>
          <p className="mt-2 break-all font-mono text-sm text-emerald-300">{reference}</p>
          <p className="mt-4 text-sm text-slate-400">Status: <span className="font-bold text-amber-300">PENDING</span></p>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/firebase-transactions" className="rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300">
            View transaction history
          </Link>
          <Link href="/firebase-dashboard" className="rounded-2xl border border-white/15 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10">
            Dashboard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">New request</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Withdrawal details</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">Select your preferred test agent and enter the requested amount.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">BDT</span>
      </div>

      <div className="mt-8">
        <label htmlFor="agent" className="mb-3 block text-sm font-semibold text-slate-200">
          Withdrawal agent
        </label>
        <select
          id="agent"
          required
          value={agentId}
          onChange={(event) => {
            setAgentId(event.target.value);
            setError("");
            setConfirmed(false);
          }}
          disabled={status !== "editing"}
          className="w-full rounded-2xl border border-white/10 bg-[#101b2b] px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10 disabled:opacity-60"
        >
          <option value="">Select an approved agent</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} — {agent.area}
            </option>
          ))}
        </select>

        {selectedAgent && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 font-black text-emerald-300">✓</span>
            <div className="min-w-0">
              <p className="font-bold text-white">{selectedAgent.name}</p>
              <p className="mt-1 text-xs text-emerald-200/80">Verified & active · {selectedAgent.area}</p>
              {selectedAgent.phone && <p className="mt-1 text-xs text-slate-400">{selectedAgent.phone}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mt-7">
        <label htmlFor="withdrawalAmount" className="mb-3 block text-sm font-semibold text-slate-200">
          Withdrawal amount (BDT)
        </label>
        <div className="flex items-center rounded-2xl border border-white/10 bg-slate-950/50 transition focus-within:border-emerald-400/60 focus-within:ring-4 focus-within:ring-emerald-400/10">
          <span className="pl-5 text-2xl font-black text-emerald-300">৳</span>
          <input
            id="withdrawalAmount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            placeholder="0.00"
            maxLength={9}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError("");
              setConfirmed(false);
            }}
            disabled={status !== "editing"}
            className="min-w-0 w-full bg-transparent py-4 pl-4 pr-5 text-xl font-bold text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
          />
        </div>
        <p className="mt-2 text-xs leading-6 text-slate-500">Minimum ৳0.01 · Maximum ৳10,000.00 per request</p>
        {parsedAmount !== null && parsedAmount > availableBalancePoisha && (
          <p className="mt-2 text-xs font-semibold text-rose-300" role="alert">
            Insufficient available balance for this amount.
          </p>
        )}
      </div>

      {parsedAmount !== null && isValidAmount && (
        <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Balance preview</p>
          <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm">
            <span className="text-slate-400">Available after request</span>
            <span className="font-extrabold tabular-nums text-emerald-300">
              {formatMoney(availableBalancePoisha - parsedAmount)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-3 text-sm">
            <span className="text-slate-400">Held after request</span>
            <span className="font-extrabold tabular-nums text-white">
              {formatMoney(heldBalancePoisha + parsedAmount)}
            </span>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            This is a preview. The server checks your current balance again when you submit.
          </p>
        </div>
      )}

      <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={status !== "editing"}
          className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
        />
        <span className="text-sm leading-6 text-slate-300">
          I confirm the selected agent and amount. I understand this request reserves wallet funds for administrator review.
        </span>
      </label>

      <p className="mt-5 text-xs leading-6 text-slate-500">
        Simulated withdrawal — no real cash is paid out.
      </p>

      {error && (
        <div role="alert" className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-7 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 px-6 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/10 transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {status === "submitting"
          ? "Submitting request..."
          : status === "uncertain"
            ? "Check transaction history"
            : "Confirm withdrawal request →"}
      </button>

      {status === "uncertain" && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs text-slate-400">Request reference (save this)</p>
          <p className="mt-2 break-all font-mono text-sm text-white">{reference}</p>
          <Link href="/firebase-transactions" className="mt-4 inline-flex text-sm font-semibold text-emerald-300 underline">
            Review transaction history
          </Link>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <Link href="/firebase-dashboard" className="text-sm font-semibold text-slate-400 transition hover:text-white">
          ← Return to dashboard
        </Link>
      </div>
    </form>
  );
}
