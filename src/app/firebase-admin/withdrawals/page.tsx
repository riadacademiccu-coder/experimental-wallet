import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import WithdrawalsManager, { type WithdrawalRecord } from "./WithdrawalsManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function dateISO(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function requestStatus(value: unknown): WithdrawalRecord["status"] {
  if (value === "PENDING" || value === "APPROVED" || value === "REJECTED") {
    return value;
  }
  return "UNKNOWN";
}

export default async function FirebaseAdminWithdrawalsPage() {
  const admin = await getCurrentWalletUser();

  if (!admin) redirect("/firebase-login");
  if (admin.role !== "ADMIN") redirect("/firebase-dashboard");

  const db = getAdminDb();

  // Fetch the pending queue separately so old pending requests don't disappear
  // behind newer completed requests. These are single-field Firestore queries;
  // they do not require a new composite index.
  const [pendingSnapshot, recentSnapshot] = await Promise.all([
    db.collection("withdrawal_requests")
      .where("status", "==", "PENDING")
      .limit(200)
      .get(),
    db.collection("withdrawal_requests")
      .orderBy("created_at", "desc")
      .limit(60)
      .get(),
  ]);

  // De-duplicate requests appearing in both sets.
  const documentMap = new Map<string, QueryDocumentSnapshot>();
  for (const document of recentSnapshot.docs) documentMap.set(document.id, document);
  for (const document of pendingSnapshot.docs) documentMap.set(document.id, document);
  const documents = Array.from(documentMap.values());

  // Display account holder names without exposing Firestore to the browser.
  // Only this server-rendered, admin-only page reads these profile documents.
  const userIds = Array.from(
    new Set(
      documents
        .map((document) => document.data().user_id)
        .filter((value): value is string =>
          typeof value === "string" &&
          value.length > 0 &&
          value.length <= 128 &&
          !value.includes("/")
        )
    )
  );

  const profileSnapshots = await Promise.all(
    userIds.map((uid) => db.collection("profiles").doc(uid).get())
  );

  const profiles = new Map<string, { name: string; email: string }>();
  profileSnapshots.forEach((snapshot, index) => {
    const data = snapshot.data();
    profiles.set(userIds[index], {
      name: text(data?.full_name, "Wallet user"),
      email: text(data?.email, ""),
    });
  });

  const withdrawals: WithdrawalRecord[] = documents.map((document) => {
    const data = document.data();
    const userId = text(data.user_id, "Unknown user");
    const profile = profiles.get(userId);
    const amount = data.amount_poisha;

    return {
      id: document.id,
      userId,
      userName: profile?.name ?? "Wallet user",
      userEmail: profile?.email ?? "",
      agentId: text(data.agent_id, ""),
      agentName: text(data.agent_name, "Unknown agent"),
      amountPoisha:
        typeof amount === "number" &&
        Number.isSafeInteger(amount) &&
        amount > 0
          ? amount
          : 0,
      status: requestStatus(data.status),
      createdAt: dateISO(data.created_at),
      reviewedAt: dateISO(data.reviewed_at),
      reviewReason: text(data.review_reason, ""),
      transactionId: text(data.transaction_id, ""),
    };
  });

  withdrawals.sort((a, b) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (a.status !== "PENDING" && b.status === "PENDING") return 1;
    return (
      (b.createdAt ? Date.parse(b.createdAt) : 0) -
      (a.createdAt ? Date.parse(a.createdAt) : 0)
    );
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute -left-40 top-0 h-[510px] w-[510px] rounded-full bg-emerald-400/[0.08] blur-[130px]" />
      <div className="pointer-events-none absolute -right-40 top-96 h-[480px] w-[480px] rounded-full bg-cyan-400/[0.07] blur-[130px]" />
      <div className="pointer-events-none absolute left-1/3 top-0 h-[420px] w-[420px] rounded-full bg-indigo-500/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
            <Link href="/firebase-admin" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
              Dashboard
            </Link>
            <Link href="/firebase-admin/agents" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
              Agents
            </Link>
            <span aria-current="page" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-emerald-300">
              Withdrawals
            </span>
            <Link href="/firebase-logout" className="rounded-xl border border-white/10 px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
              Logout
            </Link>
          </nav>
        </header>

        <section className="pb-9 pt-12 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Operations / Withdrawal reviews
          </span>

          <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Withdrawal <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Review pending withdrawal requests, approve reserved balances, or reject requests and return held funds to users.
              </p>
            </div>
            <Link href="/firebase-admin" className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10">
              ← Back to Admin
            </Link>
          </div>
        </section>

        <WithdrawalsManager
          initialWithdrawals={withdrawals}
          pendingLimitReached={pendingSnapshot.size >= 200}
        />

        <footer className="py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
