"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CreatedDeposit = {
  reference: string;
  senderNumber: string;
  amountPoisha: number;
};

type FormState = "editing" | "submitting" | "created" | "uncertain";

function parseTakaToPoisha(value: string): number | null {
  const match = value.trim().match(/^(0|[1-9]\d{0,4})(?:\.(\d{1,2}))?$/);
  if (!match) return null;

  const taka = Number(match[1]);
  const poisha = Number((match[2] ?? "").padEnd(2, "0"));
  const total = taka * 100 + poisha;

  return Number.isSafeInteger(total) && total >= 1 && total <= 1_000_000
    ? total
    : null;
}

function formatTaka(poisha: number): string {
  return (poisha / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function NewTestDepositForm() {
  const router = useRouter();
  const [senderNumber, setSenderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<FormState>("editing");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedDeposit | null>(null);
  const [copied, setCopied] = useState(false);

  const locked = status !== "editing";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;

    setError("");

    const cleanSender = senderNumber.trim();
    const amountPoisha = parseTakaToPoisha(amount);
    if (!/^01[3-9]\d{8}$/.test(cleanSender)) {
      setError("Enter a valid 11-digit test sender number (01XXXXXXXXX).");
      return;
    }
    if (amountPoisha === null) {
      setError("Enter an amount from ৳0.01 to ৳10,000.00 (up to two decimal places).");
      return;
    }
    if (note.length > 160) {
      setError("The note must be 160 characters or fewer.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm that this is a simulated test reference.");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/firebase-admin/bkash/create-test-deposit", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderNumber: cleanSender,
          amountPoisha,
          note: note.trim(),
        }),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error("Unknown response. The reference may have been created.");
      }
      const result = data as {
        success?: boolean;
        error?: string;
        reference?: string;
        senderNumber?: string;
        amountPoisha?: number;
      };

      // Only an explicit, well-formed success confirms that creation happened.
      if (
        response.ok &&
        result?.success === true &&
        typeof result.reference === "string" &&
        typeof result.senderNumber === "string" &&
        typeof result.amountPoisha === "number"
      ) {
        setCreated({
          reference: result.reference,
          senderNumber: result.senderNumber,
          amountPoisha: result.amountPoisha,
        });
        setStatus("created");
        router.refresh();
        return;
      }

      // A definitive validation/authorization error means no new reference was created.
      if ([400, 401, 403, 413, 415].includes(response.status)) {
        setError(result?.error ?? "Request was rejected. Check your details.");
        setStatus("editing");
        return;
      }

      throw new Error("The server did not confirm whether the reference was created.");
    } catch {
      // Do not retry automatically: the first request might have succeeded.
      setStatus("uncertain");
      setError(
        "The result could not be confirmed. Check the recent references below before making another request."
      );
    }
  }

  function createAnother() {
    setSenderNumber("");
    setAmount("");
    setNote("");
    setConfirmed(false);
    setCreated(null);
    setCopied(false);
    setError("");
    setStatus("editing");
  }

  async function copyReference() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.reference);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (status === "created" && created) {
    return (
      <section className="rounded-[30px] border border-emerald-400/25 bg-emerald-400/[0.07] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-2xl font-black text-slate-950">✓</div>
        <h2 className="mt-6 text-2xl font-extrabold text-white">Test reference created</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          This reference is unused. It has <strong>not</strong> credited a wallet.
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#091525] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Reference</p>
          <p className="mt-3 break-all font-mono text-base font-bold text-emerald-300">{created.reference}</p>
          <button
            type="button"
            onClick={copyReference}
            className="mt-4 rounded-xl border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10"
          >
            {copied ? "Copied ✓" : "Copy reference"}
          </button>
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
            <div><p className="text-xs text-slate-400">Test sender</p><p className="mt-1 font-semibold text-white">{created.senderNumber}</p></div>
            <div><p className="text-xs text-slate-400">Test amount</p><p className="mt-1 font-semibold text-white">৳{formatTaka(created.amountPoisha)}</p></div>
          </div>
        </div>
        <button
          type="button"
          onClick={createAnother}
          className="mt-6 rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-300"
        >
          Create another reference
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Admin controls</p>
        <h2 className="mt-3 text-2xl font-extrabold text-white">New test deposit</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">Generate a single-use simulated bKash reference for later wallet redemption.</p>
      </div>

      <label htmlFor="test-sender" className="block text-sm font-semibold text-slate-200">Test sender number</label>
      <input
        id="test-sender"
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        placeholder="01XXXXXXXXX"
        maxLength={11}
        required
        disabled={locked}
        value={senderNumber}
        onChange={(event) => setSenderNumber(event.target.value)}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60 disabled:opacity-50"
      />
      <p className="mt-2 text-xs text-slate-500">11-digit Bangladeshi-style test number; no SMS will be sent.</p>

      <label htmlFor="test-amount" className="mt-7 block text-sm font-semibold text-slate-200">Test amount (BDT)</label>
      <div className="mt-3 flex items-center rounded-2xl border border-white/10 bg-slate-950/50 focus-within:border-emerald-400/60">
        <span className="px-5 text-xl font-black text-emerald-300">৳</span>
        <input
          id="test-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="100.00"
          maxLength={8}
          required
          disabled={locked}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full min-w-0 bg-transparent py-4 pr-5 text-lg font-bold text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">৳0.01–৳10,000.00 per reference.</p>

      <label htmlFor="test-note" className="mt-7 block text-sm font-semibold text-slate-200">Admin note (optional)</label>
      <textarea
        id="test-note"
        rows={3}
        maxLength={160}
        disabled={locked}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Purpose of this test reference..."
        className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60 disabled:opacity-50"
      />
      <p className="mt-2 text-right text-xs text-slate-500">{note.length}/160</p>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={locked}
          className="mt-1 h-4 w-4 accent-emerald-400"
        />
        <span className="text-sm leading-6 text-slate-300">I confirm this is a simulated test reference and no real payment is being made.</span>
      </label>

      {error && (
        <p role="alert" className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-200">{error}</p>
      )}

      <button
        type="submit"
        disabled={locked || !confirmed}
        className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-4 font-extrabold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Creating reference..." : status === "uncertain" ? "Check recent references below" : "Create test reference →"}
      </button>
      <p className="mt-5 text-center text-xs text-slate-500">A reference is not a payment confirmation. Wallet crediting will be added in the next backend step.</p>
    </form>
  );
}
