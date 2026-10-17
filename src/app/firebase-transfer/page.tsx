import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import TransferForm from "./TransferForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validBalance(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function formatMoney(poisha: number) {
  return `৳${(poisha / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function FirebaseTransferPage() {
  const user = await getCurrentWalletUser();
  if (!user) redirect("/firebase-login");
  if (user.role !== "USER") redirect("/firebase-admin");

  const accountDoc = await getAdminDb().collection("accounts").doc(user.uid).get();
  const account = accountDoc.data();
  const isValid =
    accountDoc.exists &&
    account?.user_id === user.uid &&
    account?.currency === "BDT" &&
    validBalance(account?.available_balance_poisha) &&
    validBalance(account?.held_balance_poisha);

  const available = isValid ? (account?.available_balance_poisha as number) : 0;
  const held = isValid ? (account?.held_balance_poisha as number) : 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-40 top-12 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.10] blur-[120px]" />
      <div className="pointer-events-none absolute -right-48 top-72 h-[480px] w-[480px] rounded-full bg-cyan-500/[0.07] blur-[130px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <Link href="/firebase-dashboard" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950 shadow-lg shadow-emerald-500/15">KB</span>
            <span>
              <span className="block text-lg font-extrabold">Kids Bank Ltd</span>
              <span className="block text-xs text-slate-400">Digital Wallet</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link href="/firebase-dashboard" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">Dashboard</Link>
            <Link href="/firebase-transactions" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">History</Link>
            <Link href="/firebase-logout" className="rounded-xl border border-white/10 px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">Logout</Link>
          </nav>
        </header>

        <section className="pb-9 pt-12 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Wallet services
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Send <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">Money</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Transfer funds instantly between active Kids Bank Ltd wallets using the recipient&apos;s verified email address.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-start">
          <section className="min-w-0">
            {!isValid ? (
              <div className="rounded-[30px] border border-amber-300/20 bg-amber-300/[0.07] p-8">
                <h2 className="text-xl font-bold text-amber-200">Wallet unavailable</h2>
                <p className="mt-3 text-sm leading-7 text-amber-100/70">Your wallet data is missing or invalid. Contact an administrator before sending money.</p>
              </div>
            ) : (
              <TransferForm availableBalancePoisha={available} senderEmail={user.email} />
            )}
          </section>

          <aside className="space-y-5">
            <div className="relative overflow-hidden rounded-[30px] border border-emerald-300/20 bg-gradient-to-br from-emerald-300 to-teal-600 p-7 text-slate-950 shadow-xl shadow-emerald-950/20">
              <div className="pointer-events-none absolute -right-8 -top-16 h-44 w-44 rounded-full border border-white/30" />
              <p className="relative text-sm font-bold text-emerald-950/80">Available balance</p>
              <p className="relative mt-3 break-words text-4xl font-black tracking-tight tabular-nums">{isValid ? formatMoney(available) : "Unavailable"}</p>
              <p className="relative mt-4 text-xs font-semibold text-emerald-950/70">Available to transfer now</p>
            </div>
            <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-7 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Wallet overview</p>
              <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-400">Held for withdrawals</span>
                <strong>{isValid ? formatMoney(held) : "Unavailable"}</strong>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4 text-sm text-slate-400">
                Transfers only use your available balance. Funds on hold cannot be sent.
              </div>
              <Link href="/firebase-transactions" className="mt-6 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">View transaction history →</Link>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-slate-900/60 p-6 text-xs leading-6 text-slate-400">
              Kids Bank Ltd is a simulated wallet. Internal transfers do not move real money or connect to a bank or payment provider.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
