import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IconName =
  | "home"
  | "wallet"
  | "deposit"
  | "withdraw"
  | "transfer"
  | "history"
  | "user"
  | "arrow"
  | "shield"
  | "logout";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const drawing: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 14h2"/></>,
    deposit: <><path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></>,
    withdraw: <><path d="M12 21V8m-5 5 5-5 5 5"/><path d="M4 7V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3"/></>,
    transfer: <><path d="M4 7h16m-5-4 5 4-5 4M20 17H4m5-4-5 4 5 4"/></>,
    history: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    arrow: <path d="M5 12h14m-7-7 7 7-7 7"/>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {drawing[name]}
    </svg>
  );
}

function formatMoney(value: unknown): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return "Unavailable";
  }
  return `৳${(value / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : (words[0] ?? "KB").slice(0, 2)).toUpperCase();
}

function shortDate(value: unknown): string {
  if (!(value instanceof Timestamp)) return "Date unavailable";
  return value.toDate().toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

const primaryNav: { href: string; label: string; icon: IconName }[] = [
  { href: "/firebase-dashboard", label: "Overview", icon: "home" },
  { href: "/firebase-deposit", label: "Deposit", icon: "deposit" },
  { href: "/firebase-withdraw", label: "Withdraw", icon: "withdraw" },
  { href: "/firebase-transfer", label: "Send money", icon: "transfer" },
  { href: "/firebase-transactions", label: "Transactions", icon: "history" },
  { href: "/firebase-profile", label: "Profile & settings", icon: "user" },
];

const quickActions: {
  href: string;
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  background: string;
}[] = [
  { href: "/firebase-deposit", title: "Deposit", subtitle: "Redeem a test reference", icon: "deposit", color: "text-emerald-300", background: "bg-emerald-400/10" },
  { href: "/firebase-withdraw", title: "Withdraw", subtitle: "Request an agent withdrawal", icon: "withdraw", color: "text-sky-300", background: "bg-sky-400/10" },
  { href: "/firebase-transfer", title: "Send money", subtitle: "Transfer to another member", icon: "transfer", color: "text-violet-300", background: "bg-violet-400/10" },
  { href: "/firebase-transactions", title: "History", subtitle: "Review wallet activity", icon: "history", color: "text-amber-300", background: "bg-amber-400/10" },
];

function isOutgoing(type: string) {
  return type === "WITHDRAWAL" || type === "ADMIN_DEBIT" || type === "TRANSFER_OUT";
}

function transactionTitle(type: string, description: unknown) {
  const titles: Record<string, string> = {
    DEPOSIT: "Simulated bKash deposit",
    WITHDRAWAL: "Withdrawal request",
    TRANSFER_IN: "Transfer received",
    TRANSFER_OUT: "Transfer sent",
    ADMIN_CREDIT: "Admin credit",
    ADMIN_DEBIT: "Admin debit",
    BONUS: "Bonus",
    REFUND: "Refund",
  };
  if (titles[type]) return titles[type];
  return typeof description === "string" && description.trim()
    ? description.slice(0, 80)
    : "Wallet activity";
}

export default async function FirebaseDashboardPage() {
  const user = await getCurrentWalletUser();
  if (!user) redirect("/firebase-login");
  if (user.role === "ADMIN") redirect("/firebase-admin");

  const db = getAdminDb();
  const [profileSnapshot, accountSnapshot, recentSnapshot] = await Promise.all([
    db.collection("profiles").doc(user.uid).get(),
    db.collection("accounts").doc(user.uid).get(),
    db.collection("transactions")
      .where("user_id", "==", user.uid)
      .orderBy("created_at", "desc")
      .limit(5)
      .get(),
  ]);

  const profile = profileSnapshot.data();
  const account = accountSnapshot.data();

  if (
    !profileSnapshot.exists || profile?.user_id !== user.uid ||
    profile?.role !== "USER" || profile?.status !== "ACTIVE" ||
    !accountSnapshot.exists || account?.user_id !== user.uid
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] p-6 text-white">
        <div className="w-full max-w-lg rounded-[28px] border border-amber-300/20 bg-white/[0.05] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
            <Icon name="shield" className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Wallet unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">Your account details need attention. Please contact an administrator.</p>
          <Link href="/firebase-logout" className="mt-6 inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm font-bold">Log out</Link>
        </div>
      </main>
    );
  }

  const fullName = typeof profile.full_name === "string" && profile.full_name.trim()
    ? profile.full_name.trim() : user.fullName;
  const available = account.available_balance_poisha;
  const held = account.held_balance_poisha;
  const total =
    typeof available === "number" && Number.isSafeInteger(available) && available >= 0 &&
    typeof held === "number" && Number.isSafeInteger(held) && held >= 0 &&
    Number.isSafeInteger(available + held)
      ? available + held
      : null;

  const recent = recentSnapshot.docs.map((doc) => {
    const data = doc.data();
    const type = typeof data.type === "string" ? data.type : "OTHER";
    const amount = data.amount_poisha;
    const amountText =
      typeof amount === "number" && Number.isSafeInteger(amount) && amount >= 0
        ? `${isOutgoing(type) ? "−" : "+"}${formatMoney(amount)}`
        : "Unavailable";
    return {
      id: doc.id,
      title: transactionTitle(type, data.description),
      outgoing: isOutgoing(type),
      amountText,
      date: shortDate(data.created_at),
      status: typeof data.status === "string" ? data.status : "UNKNOWN",
    };
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-emerald-400/[0.07] blur-[125px]" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-[560px] w-[560px] rounded-full bg-blue-400/[0.06] blur-[135px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0b1625]/80 p-6 lg:flex">
          <Link href="/firebase-dashboard" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-[#05151a] shadow-lg shadow-emerald-900/30">KB</span>
            <span><span className="block text-lg font-extrabold tracking-tight">Kids Bank Ltd</span><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/70">Member workspace</span></span>
          </Link>
          <p className="mb-4 mt-12 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Navigation</p>
          <nav aria-label="Member navigation" className="space-y-1.5">
            {primaryNav.map((item, i) => (
              <Link key={item.href} href={item.href} aria-current={i === 0 ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition hover:bg-white/[0.07] hover:text-white ${i === 0 ? "border border-emerald-400/20 bg-emerald-400/[0.10] text-emerald-300" : "text-slate-400"}`}>
                <Icon name={item.icon} className="h-[19px] w-[19px]" />{item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-[22px] border border-white/[0.09] bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-sm font-extrabold text-emerald-200">{initials(fullName)}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-bold">{fullName}</span><span className="block truncate text-xs text-slate-500">{user.email}</span></span>
            </div>
            <Link href="/firebase-logout" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10"><Icon name="logout" className="h-4 w-4"/> Log out</Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-white/[0.08] bg-[#07111f]/70 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <Link href="/firebase-dashboard" className="flex items-center gap-2 lg:hidden">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-slate-950">KB</span><span className="font-extrabold">Kids Bank Ltd</span>
              </Link>
              <div className="hidden lg:block"><p className="text-xs font-semibold text-slate-500">Wallet workspace</p><p className="mt-1 text-sm font-bold text-slate-200">Overview</p></div>
              <div className="flex items-center gap-2.5">
                <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3.5 py-2 text-xs font-bold text-emerald-200 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Active account</span>
                <Link href="/firebase-profile" aria-label="Profile and settings" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-bold text-emerald-200">{initials(fullName)}</Link>
                <Link href="/firebase-logout" aria-label="Log out" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300 lg:hidden"><Icon name="logout"/></Link>
              </div>
            </div>
          </header>

          <nav aria-label="Mobile member navigation" className="border-b border-white/[0.07] px-4 py-3 lg:hidden">
            <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1">
              {primaryNav.map((item, i) => (
                <Link key={item.href} href={item.href} aria-current={i === 0 ? "page" : undefined} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${i === 0 ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"}`}><Icon name={item.icon} className="h-4 w-4"/>{item.label}</Link>
              ))}
            </div>
          </nav>

          <div className="mx-auto max-w-6xl px-4 pb-14 pt-9 sm:px-7 lg:px-10 lg:pt-12">
            <section className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-emerald-300">Your dashboard</p>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome back, {fullName.split(/\s+/)[0]}<span className="text-emerald-400">.</span></h1>
                <p className="mt-2 text-sm text-slate-400">Your wallet, shortcuts, and recent activity in one place.</p>
              </div>
              <Link href="/firebase-profile" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:border-emerald-400/25 hover:bg-emerald-400/10">Manage profile <Icon name="arrow" className="h-4 w-4"/></Link>
            </section>

            <section aria-label="Wallet balances" className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(270px,1fr)]">
              <div className="relative isolate overflow-hidden rounded-[30px] border border-emerald-300/20 bg-gradient-to-br from-[#194140] via-[#122f39] to-[#14233c] p-6 shadow-[0_22px_75px_-38px_rgba(16,185,129,0.55)] sm:p-8">
                <div className="pointer-events-none absolute -right-14 -top-14 h-64 w-64 rounded-full border border-white/[0.08]"/>
                <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/[0.06] blur-3xl"/>
                <div className="relative">
                  <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-emerald-100/80">Available balance</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80">BDT · ৳</span></div>
                  <p className="mt-7 break-words text-4xl font-black tracking-tight tabular-nums sm:text-5xl">{formatMoney(available)}</p>
                  <div className="my-7 h-px bg-gradient-to-r from-white/25 via-white/10 to-transparent"/>
                  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-emerald-50/70">Funds currently available to use</p><Link href="/firebase-transfer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#10272d] transition hover:bg-emerald-50">Send money <Icon name="arrow" className="h-4 w-4"/></Link></div>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[26px] border border-white/[0.09] bg-white/[0.045] p-6"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">On hold</p><span className="rounded-xl bg-amber-400/10 p-2.5 text-amber-300"><Icon name="wallet" className="h-4 w-4"/></span></div><p className="mt-5 text-2xl font-extrabold tabular-nums sm:text-3xl">{formatMoney(held)}</p><p className="mt-2 text-xs text-slate-500">Reserved for pending withdrawals</p></div>
                <div className="rounded-[26px] border border-white/[0.09] bg-white/[0.045] p-6"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">Total balance</p><span className="rounded-xl bg-sky-400/10 p-2.5 text-sky-300"><Icon name="wallet" className="h-4 w-4"/></span></div><p className="mt-5 text-2xl font-extrabold tabular-nums sm:text-3xl">{formatMoney(total)}</p><p className="mt-2 text-xs text-slate-500">Available plus held funds</p></div>
              </div>
            </section>

            <section aria-labelledby="tools-heading" className="mt-11">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="tools-heading" className="text-xl font-extrabold sm:text-2xl">Wallet tools</h2><p className="mt-1 text-sm text-slate-500">Choose what you want to do next.</p></div><span className="text-xs font-semibold text-slate-500">Quick actions</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href} className="group flex min-h-44 flex-col rounded-[23px] border border-white/[0.09] bg-[#101e2c]/90 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-[#142635]">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${action.background} ${action.color}`}><Icon name={action.icon} className="h-6 w-6"/></span>
                    <span className="mt-5 flex items-center justify-between gap-2 text-base font-bold"><span>{action.title}</span><Icon name="arrow" className="h-4 w-4 text-slate-500 transition group-hover:text-emerald-300"/></span>
                    <span className="mt-1.5 text-xs leading-5 text-slate-400">{action.subtitle}</span>
                  </Link>
                ))}
              </div>
            </section>

            <div className="mt-10 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
              <section className="rounded-[27px] border border-white/[0.09] bg-white/[0.04] p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.19em] text-emerald-300/80">Activity</p><h2 className="mt-2 text-xl font-bold">Recent transactions</h2></div><Link href="/firebase-transactions" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200">View all <Icon name="arrow" className="h-4 w-4"/></Link></div>
                {recent.length === 0 ? (
                  <div className="mt-7 rounded-2xl border border-dashed border-white/[0.12] bg-[#0a1623]/50 px-5 py-10 text-center"><Icon name="history" className="mx-auto h-9 w-9 text-slate-500"/><p className="mt-3 font-semibold">No activity yet</p><p className="mt-1 text-sm text-slate-500">Your wallet transactions will appear here.</p></div>
                ) : (
                  <div className="mt-5 divide-y divide-white/[0.07]">
                    {recent.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-4">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.outgoing ? "bg-amber-300/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}><Icon name={item.outgoing ? "withdraw" : "deposit"} className="h-5 w-5"/></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.date} · {item.status}</span></span>
                        <span className={`shrink-0 text-sm font-extrabold tabular-nums ${item.outgoing ? "text-amber-200" : "text-emerald-300"}`}>{item.amountText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[27px] border border-white/[0.09] bg-white/[0.04] p-5 sm:p-7">
                <div className="flex items-center justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.19em] text-emerald-300/80">Account</p><h2 className="mt-2 text-xl font-bold">Your profile</h2></div><span className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><Icon name="user"/></span></div>
                <div className="mt-6 flex min-w-0 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 text-sm font-black text-[#062323]">{initials(fullName)}</span><span className="min-w-0"><span className="block truncate font-bold">{fullName}</span><span className="block truncate text-xs text-slate-500">Wallet member</span></span></div>
                <div className="mt-6 space-y-4 border-t border-white/[0.07] pt-6"><div><p className="text-xs text-slate-500">Email</p><p className="mt-1 break-all text-sm font-medium text-slate-200">{user.email}</p></div><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Verification</span><span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300"><Icon name="shield" className="h-4 w-4"/> Verified</span></div><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Account status</span><span className="text-xs font-bold text-emerald-300">ACTIVE</span></div></div>
                <Link href="/firebase-profile" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-emerald-400/25 hover:bg-emerald-400/10">Profile &amp; settings <Icon name="arrow" className="h-4 w-4"/></Link>
              </section>
            </div>

            <p className="mt-10 text-center text-xs text-slate-600">Kids Bank Ltd · Simulated wallet · No real money is processed</p>
          </div>
        </div>
      </div>
    </main>
  );
}
