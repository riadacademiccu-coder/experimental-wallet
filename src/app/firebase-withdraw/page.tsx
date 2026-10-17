import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import WithdrawalForm, { type WithdrawalAgent } from "./WithdrawalForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatMoney(poisha: number): string {
  return `৳${(poisha / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isValidBalance(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export default async function FirebaseWithdrawPage() {
  const user = await getCurrentWalletUser();

  if (!user) {
    redirect("/firebase-login");
  }

  const db = getAdminDb();
  const accountSnapshot = await db.collection("accounts").doc(user.uid).get();
  const account = accountSnapshot.data();

  const validAccount =
    accountSnapshot.exists &&
    account?.user_id === user.uid &&
    account?.currency === "BDT" &&
    isValidBalance(account?.available_balance_poisha) &&
    isValidBalance(account?.held_balance_poisha);

  const availableBalancePoisha: number = validAccount
    ? account!.available_balance_poisha
    : 0;
  const heldBalancePoisha: number = validAccount
    ? account!.held_balance_poisha
    : 0;

  // With only a handful of test agents, filtering on the server avoids
  // requiring a separate Firestore composite index.
  const agentSnapshot = await db.collection("agents").limit(100).get();
  const agents: WithdrawalAgent[] = agentSnapshot.docs
    .map((document) => {
      const data = document.data();
      if (
        data.status !== "ACTIVE" ||
        data.verified !== true ||
        typeof data.name !== "string" ||
        !data.name.trim()
      ) {
        return null;
      }

      return {
        id: document.id,
        name: data.name.trim(),
        area: typeof data.area === "string" ? data.area.trim() : "Area not listed",
        phone: typeof data.phone === "string" ? data.phone : "",
      };
    })
    .filter((agent): agent is WithdrawalAgent => agent !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-48 top-10 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -right-44 top-[35rem] h-[520px] w-[520px] rounded-full bg-cyan-500/[0.08] blur-[130px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <Link href="/firebase-dashboard" className="group flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950 shadow-lg shadow-emerald-500/15 transition group-hover:rotate-3">
              KB
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Kids Bank Ltd</p>
              <p className="text-xs tracking-wide text-slate-400">Digital Wallet</p>
            </div>
          </Link>

          <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2">
            <Link
              href="/firebase-dashboard"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/firebase-transactions"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              History
            </Link>
            <Link
              href="/firebase-logout"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Logout
            </Link>
          </nav>
        </header>

        <section className="pb-9 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Wallet services
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Request a <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">Withdrawal</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Choose an approved agent and submit a request. Your balance is reserved while an administrator reviews it.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)] lg:items-start">
          <section className="min-w-0">
            {user.role !== "USER" ? (
              <div className="rounded-[30px] border border-amber-400/20 bg-amber-400/[0.08] p-8 text-amber-100">
                <h2 className="text-xl font-bold">Withdrawals are for regular users</h2>
                <p className="mt-3 text-sm leading-7 text-amber-100/75">
                  Administrator accounts cannot submit withdrawal requests. Use a separate regular user account to test this feature.
                </p>
                <Link href="/firebase-admin" className="mt-6 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950">
                  Back to Admin Dashboard
                </Link>
              </div>
            ) : !validAccount ? (
              <div className="rounded-[30px] border border-amber-400/20 bg-amber-400/[0.08] p-8 text-amber-100">
                <h2 className="text-xl font-bold">Wallet unavailable</h2>
                <p className="mt-3 text-sm leading-7 text-amber-100/75">
                  Your wallet record is missing or invalid. Please contact an administrator before submitting a withdrawal.
                </p>
              </div>
            ) : agents.length === 0 ? (
              <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-3xl text-emerald-300">⌁</div>
                <h2 className="mt-6 text-2xl font-bold">No approved agents available</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  An administrator must verify and activate at least one agent before you can request a withdrawal.
                </p>
                <Link href="/firebase-dashboard" className="mt-6 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950">
                  Return to Dashboard
                </Link>
              </div>
            ) : (
              <WithdrawalForm
                agents={agents}
                availableBalancePoisha={availableBalancePoisha}
                heldBalancePoisha={heldBalancePoisha}
              />
            )}
          </section>

          <aside className="space-y-5">
            <div className="relative overflow-hidden rounded-[30px] border border-emerald-300/20 bg-gradient-to-br from-emerald-400 to-teal-600 p-7 text-slate-950 shadow-xl shadow-emerald-900/10">
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/35" />
              <div className="pointer-events-none absolute -right-3 top-6 h-32 w-32 rounded-full border border-white/30" />
              <p className="relative text-sm font-semibold text-emerald-950/80">Available balance</p>
              <p className="relative mt-3 break-words text-4xl font-black tracking-tight tabular-nums">
                {validAccount ? formatMoney(availableBalancePoisha) : "Unavailable"}
              </p>
              <div className="relative mt-7 border-t border-emerald-950/20 pt-5">
                <p className="text-xs font-semibold text-emerald-950/70">Funds currently on hold</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">
                  {validAccount ? formatMoney(heldBalancePoisha) : "Unavailable"}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-300">How it works</p>
              <ol className="mt-6 space-y-5">
                {[
                  ["01", "Select an agent", "Choose a verified, active withdrawal agent."],
                  ["02", "Reserve funds", "Your available balance moves to held balance."],
                  ["03", "Admin decision", "Approval completes the request; rejection returns the held funds."],
                ].map(([number, heading, description]) => (
                  <li key={number} className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-xs font-extrabold text-emerald-300">
                      {number}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{heading}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-400">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>

        <footer className="py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
