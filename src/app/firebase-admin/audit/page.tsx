import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import AuditLogViewer, { type AuditRecord, type AuditCategory } from "./AuditLogViewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LOGS = 150;
const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;

function safeText(value: unknown, maxLength = 180): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeMoney(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function safeTimestamp(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function categoryForAction(action: string): AuditCategory {
  const name = action.toUpperCase();
  if (name.includes("WITHDRAW")) return "WITHDRAWALS";
  if (name.includes("BKASH") || name.includes("DEPOSIT")) return "DEPOSITS";
  if (name.includes("AGENT")) return "AGENTS";
  if (name.includes("BALANCE") || name.includes("CREDIT") || name.includes("DEBIT")) return "BALANCES";
  if (
    name.includes("USER") ||
    name.includes("EMAIL") ||
    name.includes("VERIFY") ||
    name.includes("STATUS") ||
    name.includes("FREEZE") ||
    name.includes("SUSPEND")
  ) {
    return "ACCOUNTS";
  }
  return "OTHER";
}

export default async function FirebaseAdminAuditPage() {
  const admin = await getCurrentWalletUser();
  if (!admin) redirect("/firebase-login");
  if (admin.role !== "ADMIN") redirect("/firebase-dashboard");

  const db = getAdminDb();
  // This is a server-only, read-only query. Firestore browser rules stay deny-all.
  // Ordering by one field requires only Firestore's automatic single-field index.
  const snapshot = await db.collection("admin_audit_logs")
    .orderBy("created_at", "desc")
    .limit(MAX_LOGS)
    .get();

  const ids = new Set<string>();
  for (const document of snapshot.docs) {
    const data = document.data();
    for (const candidate of [data.actor_user_id, data.target_user_id, data.user_id]) {
      if (typeof candidate === "string" && SAFE_ID.test(candidate)) ids.add(candidate);
    }
  }

  const userIds = Array.from(ids);
  const userSnapshots = await Promise.all(
    userIds.map((uid) => db.collection("profiles").doc(uid).get())
  );
  const names = new Map<string, string>();
  userSnapshots.forEach((userSnapshot, index) => {
    const name = safeText(userSnapshot.data()?.full_name, 80);
    if (name) names.set(userIds[index], name);
  });

  const records: AuditRecord[] = snapshot.docs.map((document) => {
    const data = document.data();
    const action = safeText(data.action, 90) || "UNKNOWN_ACTION";
    const actorId = safeText(data.actor_user_id, 128);
    const targetId = safeText(data.target_user_id ?? data.user_id, 128);

    return {
      id: document.id,
      action,
      category: categoryForAction(action),
      actorId,
      actorName: names.get(actorId) || "Administrator",
      targetId,
      targetName: names.get(targetId) || "",
      agentId: safeText(data.agent_id, 128),
      amountPoisha: safeMoney(data.amount_poisha),
      reference: safeText(data.reference, 110),
      withdrawalRequestId: safeText(data.withdrawal_request_id, 128),
      previousStatus: safeText(data.previous_status, 50),
      newStatus: safeText(data.new_status, 50),
      reason: safeText(data.reason ?? data.review_reason, 220),
      createdAt: safeTimestamp(data.created_at),
    };
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute -left-44 top-0 h-[520px] w-[520px] rounded-full bg-emerald-400/[0.09] blur-[130px]" />
      <div className="pointer-events-none absolute -right-36 top-80 h-[480px] w-[480px] rounded-full bg-cyan-400/[0.06] blur-[130px]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <Link href="/firebase-admin" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-400 font-black text-slate-950 shadow-lg shadow-emerald-400/10">
              KB
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Kids Bank Ltd</p>
              <p className="text-xs text-slate-400">Administrator Workspace</p>
            </div>
          </Link>
          <nav aria-label="Administrator navigation" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Link href="/firebase-admin" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">Dashboard</Link>
            <Link href="/firebase-admin/withdrawals" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">Withdrawals</Link>
            <span aria-current="page" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-emerald-300">Audit logs</span>
            <Link href="/firebase-logout" className="rounded-xl border border-white/10 px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">Logout</Link>
          </nav>
        </header>

        <section className="pb-9 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Security / Activity review
          </div>
          <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Audit <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">History</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Review administrative balance changes, account decisions, agent management,
                test deposits, and withdrawal approvals in one place.
              </p>
            </div>
            <Link href="/firebase-admin" className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              ← Back to dashboard
            </Link>
          </div>
        </section>

        <AuditLogViewer records={records} limit={MAX_LOGS} />

        <footer className="mt-12 text-center text-xs text-slate-600">
          Read-only audit viewer · Simulated wallet activity · © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
