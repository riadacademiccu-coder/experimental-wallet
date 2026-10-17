import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import NewTestDepositForm from "./NewTestDepositForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatMoney(value: unknown): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return "Unavailable";
  }
  return `৳${(value / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: unknown): string {
  if (!(value instanceof Timestamp)) return "Pending timestamp";
  return value.toDate().toLocaleString("en-BD", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function FirebaseAdminBkashPage() {
  const admin = await getCurrentWalletUser();
  if (!admin) redirect("/firebase-login");
  if (admin.role !== "ADMIN") redirect("/firebase-dashboard");

  const snapshot = await getAdminDb()
    .collection("bkash_test_transactions")
    .orderBy("created_at", "desc")
    .limit(12)
    .get();

  const deposits = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      reference: typeof data.reference === "string" ? data.reference : document.id,
      senderNumber: typeof data.sender_number === "string" ? data.sender_number : "Unavailable",
      amount: formatMoney(data.amount_poisha),
      status: data.status === "USED" ? "USED" : data.status === "UNUSED" ? "UNUSED" : "UNKNOWN",
      date: formatDate(data.created_at),
    };
  });

  const unusedCount = deposits.filter((deposit) => deposit.status === "UNUSED").length;
  const usedCount = deposits.filter((deposit) => deposit.status === "USED").length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-32 top-8 h-96 w-96 rounded-full bg-emerald-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 top-96 h-96 w-96 rounded-full bg-cyan-400/10 blur-[110px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/firebase-admin" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950">KB</div>
            <div>
              <p className="text-lg font-extrabold">Kids Bank Ltd</p>
              <p className="text-xs text-slate-400">Administrator Workspace</p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-3">
            <Link href="/firebase-admin" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">← Admin Dashboard</Link>
            <Link href="/firebase-admin/users" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Users</Link>
          </nav>
        </header>

        <section className="pb-8 pt-12 sm:pt-14">
          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Admin Deposit Tools</span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Simulated <span className="text-emerald-400">bKash Deposits</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Create and manage single-use test deposit references. No actual payment is collected.
          </p>
          <p className="mt-4 inline-flex rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
            Simulated bKash Deposit — No real payment is processed.
          </p>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm text-slate-400">Recent references</p>
            <p className="mt-3 text-4xl font-extrabold">{deposits.length}</p>
            <p className="mt-2 text-xs text-slate-500">Latest 12 records</p>
          </div>
          <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.06] p-6">
            <p className="text-sm text-emerald-200">Unused references</p>
            <p className="mt-3 text-4xl font-extrabold text-emerald-300">{unusedCount}</p>
            <p className="mt-2 text-xs text-emerald-200/60">Among latest 12</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm text-slate-400">Used references</p>
            <p className="mt-3 text-4xl font-extrabold">{usedCount}</p>
            <p className="mt-2 text-xs text-slate-500">Among latest 12</p>
          </div>
        </section>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <NewTestDepositForm />

          <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="border-b border-white/10 p-6 sm:p-8">
              <h2 className="text-2xl font-extrabold">Recent test references</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Most recent 12 records. Refresh to load the latest list.</p>
            </div>
            {deposits.length === 0 ? (
              <div className="p-9 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-3xl text-emerald-300">↙</div>
                <h3 className="mt-5 text-lg font-bold">No test references yet</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">Your first reference will appear here after creation.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {deposits.map((deposit) => (
                  <article key={deposit.id} className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="max-w-full break-all font-mono text-xs font-bold text-emerald-300">{deposit.reference}</p>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${deposit.status === "UNUSED" ? "border-amber-400/20 bg-amber-400/10 text-amber-200" : deposit.status === "USED" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-slate-200"}`}>
                        {deposit.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
                      <span className="text-slate-400">{deposit.senderNumber}</span>
                      <span className="font-extrabold text-white">{deposit.amount}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{deposit.date}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="py-10 text-center text-xs text-slate-500">© {new Date().getFullYear()} Kids Bank Ltd</footer>
      </div>
    </main>
  );
}
