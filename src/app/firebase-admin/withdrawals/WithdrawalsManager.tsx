"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

export type WithdrawalRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  agentId: string;
  agentName: string;
  amountPoisha: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNKNOWN";
  createdAt: string | null;
  reviewedAt: string | null;
  reviewReason: string;
  transactionId: string;
};

type Props = {
  initialWithdrawals: WithdrawalRecord[];
  pendingLimitReached: boolean;
};

type ReviewAction = "APPROVE" | "REJECT";
type Filter = "PENDING" | "REVIEWED" | "ALL";

type ReviewResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  requestId?: string;
  status?: "APPROVED" | "REJECTED";
  alreadyReviewed?: boolean;
};

function formatMoney(poisha: number): string {
  return `৳${(poisha / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Time unavailable";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return date.toLocaleString("en-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusBadge(status: WithdrawalRecord["status"]): string {
  switch (status) {
    case "PENDING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "APPROVED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "REJECTED":
      return "border-rose-400/20 bg-rose-400/10 text-rose-300";
    default:
      return "border-white/15 bg-white/5 text-slate-400";
  }
}

export default function WithdrawalsManager({
  initialWithdrawals,
  pendingLimitReached,
}: Props) {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<{
    id: string;
    action: ReviewAction;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setWithdrawals(initialWithdrawals);
  }, [initialWithdrawals]);

  const pending = withdrawals.filter((request) => request.status === "PENDING");
  const approvedCount = withdrawals.filter((request) => request.status === "APPROVED").length;
  const rejectedCount = withdrawals.filter((request) => request.status === "REJECTED").length;
  const pendingAmount = pending.reduce((sum, request) => sum + request.amountPoisha, 0);

  const visibleWithdrawals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return withdrawals.filter((request) => {
      if (filter === "PENDING" && request.status !== "PENDING") return false;
      if (filter === "REVIEWED" && request.status === "PENDING") return false;
      if (!query) return true;
      return [
        request.id,
        request.userId,
        request.userName,
        request.userEmail,
        request.agentName,
        request.agentId,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [withdrawals, search, filter]);

  function beginReview(id: string, action: ReviewAction) {
    if (working || needsRefresh) return;
    setSelection({ id, action });
    setReason("");
    setConfirmed(false);
    setError("");
    setNotice("");
  }

  function cancelReview() {
    if (working) return;
    setSelection(null);
    setReason("");
    setConfirmed(false);
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || working || needsRefresh || !confirmed) return;

    const selectedRequest = withdrawals.find((item) => item.id === selection.id);
    if (!selectedRequest || selectedRequest.status !== "PENDING") {
      setError("This request is no longer pending. Refresh the list.");
      setNeedsRefresh(true);
      return;
    }

    if (selectedRequest.amountPoisha <= 0) {
      setError("Invalid request amount. Do not approve or reject this record until it is investigated.");
      return;
    }

    const cleanReason = reason.trim();
    if (selection.action === "REJECT" && cleanReason.length < 5) {
      setError("Enter a rejection reason of at least 5 characters.");
      return;
    }
    if (cleanReason.length > 300) {
      setError("Review notes must be 300 characters or fewer.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/firebase-admin/withdrawals/review", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selection.id,
          action: selection.action,
          reason: cleanReason,
        }),
      });

      let data: ReviewResponse;
      try {
        data = (await response.json()) as ReviewResponse;
      } catch {
        // The server may have committed even if its response was interrupted.
        setNeedsRefresh(true);
        throw new Error("The response could not be read. Refresh and inspect the request before taking another action.");
      }

      if (!response.ok || data.success !== true) {
        if (response.status === 409 || response.status >= 500) {
          setNeedsRefresh(true);
        }
        throw new Error(
          data.error ??
            "Unable to confirm the review. Refresh and inspect the request."
        );
      }

      if (
        data.requestId !== selection.id ||
        (data.status !== "APPROVED" && data.status !== "REJECTED")
      ) {
        setNeedsRefresh(true);
        throw new Error("Unexpected review response. Refresh to verify the final state.");
      }

      setWithdrawals((previous) =>
        previous.map((request) =>
          request.id === selection.id
            ? {
                ...request,
                status: data.status as "APPROVED" | "REJECTED",
                reviewReason: cleanReason,
                reviewedAt: new Date().toISOString(),
              }
            : request
        )
      );
      setNotice(data.message ?? "The withdrawal was reviewed successfully.");
      setSelection(null);
      setReason("");
      setConfirmed(false);
      router.refresh();
    } catch (caught) {
      if (caught instanceof TypeError) {
        setNeedsRefresh(true);
        setError("Connection interrupted. The review may have completed. Refresh and check the request before retrying.");
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to confirm review.");
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[26px] border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.11] to-transparent p-6 backdrop-blur-xl">
          <p className="text-sm font-semibold text-amber-200">Pending requests</p>
          <p className="mt-4 text-4xl font-extrabold tabular-nums text-amber-300">{pending.length}{pendingLimitReached ? "+" : ""}</p>
          <p className="mt-2 text-xs text-amber-100/60">Awaiting an admin decision</p>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
          <p className="text-sm font-semibold text-slate-300">Pending amount</p>
          <p className="mt-4 text-3xl font-extrabold tabular-nums text-white">{formatMoney(pendingAmount)}</p>
          <p className="mt-2 text-xs text-slate-500">Reserved across loaded requests</p>
        </div>
        <div className="rounded-[26px] border border-emerald-400/15 bg-emerald-400/[0.045] p-6 backdrop-blur-xl">
          <p className="text-sm font-semibold text-emerald-200">Approved</p>
          <p className="mt-4 text-4xl font-extrabold tabular-nums text-emerald-300">{approvedCount}</p>
          <p className="mt-2 text-xs text-emerald-100/60">In the recent loaded history</p>
        </div>
        <div className="rounded-[26px] border border-rose-400/15 bg-rose-400/[0.045] p-6 backdrop-blur-xl">
          <p className="text-sm font-semibold text-rose-200">Rejected</p>
          <p className="mt-4 text-4xl font-extrabold tabular-nums text-rose-300">{rejectedCount}</p>
          <p className="mt-2 text-xs text-rose-100/60">In the recent loaded history</p>
        </div>
      </section>

      <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] px-5 py-4 text-sm leading-6 text-slate-300">
        <strong className="text-cyan-200">Simulated withdrawals only.</strong> Approving a request deducts held test funds; rejecting it returns held test funds to the user's available wallet. No actual cash is sent to the agent.
      </div>

      {pendingLimitReached && (
        <div role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.09] px-5 py-4 text-sm text-amber-100">
          The pending queue has reached its 200-request display limit. The totals above may not include every pending request.
        </div>
      )}

      {(error || notice || needsRefresh) && (
        <div
          role={error || needsRefresh ? "alert" : "status"}
          className={`rounded-2xl border p-5 text-sm leading-6 ${error || needsRefresh ? "border-amber-400/25 bg-amber-400/[0.09] text-amber-100" : "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100"}`}
        >
          <p>{error || notice || "Refresh to inspect the final request status."}</p>
          {needsRefresh && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-xs">Review actions are disabled until you refresh and verify the saved result.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-amber-200/30 px-4 py-2 font-bold text-amber-100 transition hover:bg-white/10"
              >
                Refresh and inspect
              </button>
            </div>
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-300">Review workspace</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Withdrawal requests</h2>
            <p className="mt-2 text-xs leading-6 text-slate-400">
              Pending queue plus the 60 most recent requests. Refresh to load changes from another admin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="self-start rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            ↻ Refresh queue
          </button>
        </div>

        <div className="mt-7 flex flex-col gap-4 border-b border-white/10 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2" aria-label="Request filters">
            {([
              ["PENDING", `Pending (${pending.length})`],
              ["REVIEWED", "Reviewed"],
              ["ALL", "All loaded"],
            ] as const).map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => { setFilter(value); cancelReview(); }}
                aria-pressed={filter === value}
                disabled={working}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${filter === value ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/10" : "border border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/10"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block w-full xl:max-w-sm">
            <span className="sr-only">Search withdrawal requests</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, agent or request ID"
              className="w-full rounded-2xl border border-white/10 bg-[#0b1727] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10"
            />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          {visibleWithdrawals.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl text-emerald-300">✓</div>
              <h3 className="mt-5 text-lg font-bold">No matching withdrawal requests</h3>
              <p className="mt-2 text-sm text-slate-400">
                {pending.length === 0 && filter === "PENDING"
                  ? "There are no pending requests in the loaded queue."
                  : "Try another filter or search phrase."}
              </p>
            </div>
          )}

          {visibleWithdrawals.map((request) => {
            const selected = selection?.id === request.id ? selection : null;
            const cannotReview = working || needsRefresh || request.amountPoisha <= 0;
            return (
              <article key={request.id} className="rounded-[25px] border border-white/10 bg-[#0b1727]/85 p-5 transition hover:border-white/15 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-extrabold tracking-wide ${statusBadge(request.status)}`}>
                        {request.status}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(request.createdAt)}</span>
                    </div>
                    <h3 className="break-words text-lg font-bold text-white">{request.userName}</h3>
                    {request.userEmail && <p className="break-all text-xs text-slate-400">{request.userEmail}</p>}
                    <p className="break-all text-xs text-slate-500">User ID: {request.userId}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Request amount</p>
                    <p className={`mt-2 text-3xl font-black tabular-nums tracking-tight ${request.amountPoisha > 0 ? "text-white" : "text-rose-300"}`}>
                      {request.amountPoisha > 0 ? formatMoney(request.amountPoisha) : "Invalid amount"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Simulated BDT withdrawal</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Selected agent</p>
                    <p className="mt-1 font-semibold text-slate-200">{request.agentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Request reference</p>
                    <p className="mt-1 break-all font-mono text-xs text-emerald-300">{request.id}</p>
                  </div>
                  {request.status !== "PENDING" && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Reviewed</p>
                        <p className="mt-1 text-slate-200">{formatDate(request.reviewedAt)}</p>
                      </div>
                      {request.reviewReason && (
                        <div>
                          <p className="text-xs text-slate-500">Review reason</p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-slate-200">{request.reviewReason}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {request.status === "PENDING" && !selected && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={cannotReview}
                      onClick={() => beginReview(request.id, "APPROVE")}
                      className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      disabled={cannotReview}
                      onClick={() => beginReview(request.id, "REJECT")}
                      className="rounded-2xl border border-rose-300/25 bg-rose-400/[0.08] px-5 py-3 text-sm font-bold text-rose-200 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}

                {selected && request.status === "PENDING" && (
                  <form onSubmit={submitReview} className={`mt-6 rounded-2xl border p-5 ${selected.action === "APPROVE" ? "border-emerald-300/25 bg-emerald-400/[0.06]" : "border-rose-300/25 bg-rose-400/[0.06]"}`}>
                    <h4 className="text-base font-extrabold text-white">
                      Confirm {selected.action === "APPROVE" ? "approval" : "rejection"}
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selected.action === "APPROVE"
                        ? `Approve ${formatMoney(request.amountPoisha)} for ${request.userName}? The amount will be removed from held balance. No cash is sent to the agent.`
                        : `Reject ${formatMoney(request.amountPoisha)} for ${request.userName}? The reserved amount will be returned to the user's available balance.`}
                    </p>

                    <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-300" htmlFor={`reason-${request.id}`}>
                      {selected.action === "REJECT" ? "Rejection reason (required)" : "Review note (optional)"}
                    </label>
                    <textarea
                      id={`reason-${request.id}`}
                      value={reason}
                      maxLength={300}
                      rows={3}
                      disabled={working || needsRefresh}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={selected.action === "REJECT" ? "Explain why this withdrawal is being rejected (at least 5 characters)" : "Optional admin review note"}
                      className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10 disabled:opacity-50"
                    />
                    <p className="mt-1 text-right text-xs text-slate-500">{reason.length}/300</p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-200">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        disabled={working || needsRefresh}
                        onChange={(event) => setConfirmed(event.target.checked)}
                        className="mt-1 h-4 w-4 accent-emerald-400"
                      />
                      I have checked this request and understand the held-balance change.
                    </label>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={working || needsRefresh || !confirmed || (selected.action === "REJECT" && reason.trim().length < 5)}
                        className={`rounded-2xl px-5 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40 ${selected.action === "APPROVE" ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-rose-400 text-slate-950 hover:bg-rose-300"}`}
                      >
                        {working ? "Processing…" : selected.action === "APPROVE" ? "Confirm approval" : "Confirm rejection"}
                      </button>
                      <button
                        type="button"
                        disabled={working}
                        onClick={cancelReview}
                        className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-sm text-slate-400">
        <p>All review decisions are recorded in Firebase and the admin audit log.</p>
        <Link href="/firebase-admin/agents" className="font-bold text-emerald-300 transition hover:text-emerald-200">
          Manage withdrawal agents →
        </Link>
      </div>
    </div>
  );
}
