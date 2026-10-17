"use client";

import { useMemo, useState } from "react";

export type AuditCategory =
  | "BALANCES"
  | "ACCOUNTS"
  | "AGENTS"
  | "WITHDRAWALS"
  | "DEPOSITS"
  | "OTHER";

export type AuditRecord = {
  id: string;
  action: string;
  category: AuditCategory;
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  agentId: string;
  amountPoisha: number | null;
  reference: string;
  withdrawalRequestId: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  createdAt: string | null;
};

type Filter = "ALL" | AuditCategory;

const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All activity" },
  { value: "BALANCES", label: "Balances" },
  { value: "ACCOUNTS", label: "Accounts" },
  { value: "AGENTS", label: "Agents" },
  { value: "WITHDRAWALS", label: "Withdrawals" },
  { value: "DEPOSITS", label: "Deposits" },
  { value: "OTHER", label: "Other" },
];

const categoryStyles: Record<AuditCategory, string> = {
  BALANCES: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  ACCOUNTS: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  AGENTS: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  WITHDRAWALS: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  DEPOSITS: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  OTHER: "border-white/10 bg-white/[0.06] text-slate-300",
};

function actionTitle(action: string): string {
  const name = action.replace(/^ADMIN_/, "").replaceAll("_", " ").trim();
  return name.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function timeLabel(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

function moneyLabel(value: number | null): string {
  if (value === null) return "";
  return `৳${(value / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function SmallDetail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-[#091522]/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 break-all text-xs font-medium leading-5 text-slate-200">{value}</p>
    </div>
  );
}

export default function AuditLogViewer({ records, limit }: { records: AuditRecord[]; limit: number }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totals = useMemo(() => ({
    operations: records.length,
    balance: records.filter((item) => item.category === "BALANCES").length,
    accounts: records.filter((item) => item.category === "ACCOUNTS").length,
    withdrawals: records.filter((item) => item.category === "WITHDRAWALS").length,
  }), [records]);

  const filtered = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    return records.filter((record) => {
      if (filter !== "ALL" && record.category !== filter) return false;
      if (!phrase) return true;
      return [
        record.action,
        record.actorName,
        record.actorId,
        record.targetId,
        record.targetName,
        record.agentId,
        record.reference,
        record.withdrawalRequestId,
        record.reason,
        record.newStatus,
      ].some((value) => value.toLowerCase().includes(phrase));
    });
  }, [records, filter, search]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { name: "Loaded records", count: totals.operations, accent: "text-emerald-300" },
          { name: "Balance actions", count: totals.balance, accent: "text-sky-300" },
          { name: "Account actions", count: totals.accounts, accent: "text-violet-300" },
          { name: "Withdrawal reviews", count: totals.withdrawals, accent: "text-amber-300" },
        ].map((item) => (
          <div key={item.name} className="rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-5 sm:p-6">
            <p className="text-xs font-semibold text-slate-400">{item.name}</p>
            <p className={`mt-4 text-3xl font-extrabold tabular-nums sm:text-4xl ${item.accent}`}>
              {item.count.toLocaleString("en-BD")}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-7 rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-4 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300/80">Audit trail</p>
            <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Administrative activity</h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Displaying up to {limit} latest audit records. Search and filters apply to loaded records only.
            </p>
          </div>
          <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">
            Read-only
          </span>
        </div>

        <div className="mt-7">
          <label htmlFor="audit-search" className="mb-2 block text-xs font-semibold text-slate-300">
            Search activity
          </label>
          <input
            id="audit-search"
            type="search"
            placeholder="Action, admin, user, reference or reason..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#091522] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter audit entries">
          {filters.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                filter === option.value
                  ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p aria-live="polite" className="mt-6 text-xs text-slate-500">
          Showing {filtered.length} {filtered.length === 1 ? "record" : "records"}
        </p>

        {filtered.length === 0 ? (
          <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl text-emerald-300">◎</div>
            <h3 className="mt-4 font-bold">No matching audit records</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {records.length === 0
                ? "Admin activity will appear here as actions are recorded in Firebase."
                : "Try a different search or select All activity."}
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {filtered.map((record) => {
              const expanded = expandedId === record.id;
              const detailsAvailable = Boolean(
                record.targetId || record.agentId || record.reference ||
                record.withdrawalRequestId || record.reason ||
                record.previousStatus || record.newStatus
              );
              return (
                <article key={record.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1726]/75 transition hover:border-white/[0.14]">
                  <div className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-400/10 text-emerald-300" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                        <path d="M9 12h6M12 9v6" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-white sm:text-base">{actionTitle(record.action)}</p>
                        <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-extrabold tracking-wide ${categoryStyles[record.category]}`}>
                          {record.category}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">
                        By <span className="font-semibold text-slate-200">{record.actorName}</span>
                        <span className="mx-2 text-slate-600">·</span>
                        {timeLabel(record.createdAt)} (Dhaka)
                      </p>
                      {record.targetId && (
                        <p className="mt-1.5 truncate text-xs text-slate-500">
                          Target: {record.targetName || record.targetId}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      {record.amountPoisha !== null && (
                        <p className="text-base font-extrabold tabular-nums text-emerald-300">{moneyLabel(record.amountPoisha)}</p>
                      )}
                      {detailsAvailable && (
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedId(expanded ? null : record.id)}
                          className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                        >
                          {expanded ? "Hide details" : "View details"}
                        </button>
                      )}
                    </div>
                  </div>
                  {expanded && detailsAvailable && (
                    <div className="grid gap-2 border-t border-white/[0.07] bg-white/[0.025] p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                      <SmallDetail label="Administrator UID" value={record.actorId} />
                      <SmallDetail label="Target user" value={record.targetName ? `${record.targetName} · ${record.targetId}` : record.targetId} />
                      <SmallDetail label="Agent ID" value={record.agentId} />
                      <SmallDetail label="Deposit reference" value={record.reference} />
                      <SmallDetail label="Withdrawal request" value={record.withdrawalRequestId} />
                      <SmallDetail label="Previous status" value={record.previousStatus} />
                      <SmallDetail label="New status" value={record.newStatus} />
                      <SmallDetail label="Reason" value={record.reason} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-6 text-xs leading-6 text-slate-500">
          Audit records document actions but are not a substitute for production monitoring or tamper-proof external logging.
        </p>
      </section>
    </>
  );
}
