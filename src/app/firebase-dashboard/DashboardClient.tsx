"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export type IconName =
  | "bell"
  | "user"
  | "eye"
  | "eyeOff"
  | "home"
  | "accounts"
  | "deposit"
  | "withdraw"
  | "transfer"
  | "bill"
  | "mobile"
  | "utility"
  | "card"
  | "qr"
  | "savings"
  | "beneficiaries"
  | "calendar"
  | "statement"
  | "payments"
  | "more"
  | "sparkles"
  | "arrowRight"
  | "shield";

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const drawings: Record<IconName, ReactNode> = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    eye: <><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.2 0 9.5 6 9.5 6a16 16 0 0 1-3.1 3.7M6.2 6.3C3.8 8 2.5 12 2.5 12s3.3 6 9.5 6c1.3 0 2.5-.3 3.5-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-8h6v8" /></>,
    accounts: <><rect x="3" y="5" width="18" height="15" rx="2.5" /><path d="M3 9h18M7 15h4" /></>,
    deposit: <><path d="M12 3v13m-5-5 5 5 5-5" /><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
    withdraw: <><path d="M12 21V8m-5 5 5-5 5 5" /><path d="M4 7V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3" /></>,
    transfer: <><path d="M4 7h16m-5-4 5 4-5 4M20 17H4m5-4-5 4 5 4" /></>,
    bill: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    mobile: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M10 5.5h4M11 18.5h2" /></>,
    utility: <path d="m13 2-9 12h7l-1 8 10-13h-7Z" />,
    card: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
    qr: <><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" /><path d="M14 14h3v3h-3zM20 14v2M17 20h4M20 18v3" /></>,
    savings: <><path d="M5 11a7 7 0 0 1 13-3h2v4h-2a7 7 0 0 1-12 4H4v-3H2v-2h3Z" /><circle cx="14" cy="10" r="1" /><path d="M8 18v2M17 17l1 3" /></>,
    beneficiaries: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M17 8h5m-2.5-2.5v5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2" /></>,
    statement: <><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 12h8M8 16h8" /></>,
    payments: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15ZM5 3l.7 1.8L7.5 5.5l-1.8.7L5 8l-.7-1.8L2.5 5.5l1.8-.7L5 3Z" /></>,
    arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {drawings[name]}
    </svg>
  );
}

type NavigationItem = "home" | "accounts" | "transfer" | "payments" | "more";

export function DashboardNavigation({ active }: { active: NavigationItem }) {
  const items: {
    id: NavigationItem;
    label: string;
    href: string;
    icon: IconName;
  }[] = [
    { id: "home", label: "Home", href: "/firebase-dashboard", icon: "home" },
    { id: "accounts", label: "Accounts", href: "/firebase-dashboard#account-balance", icon: "accounts" },
    { id: "transfer", label: "Transfer", href: "/firebase-transfer", icon: "transfer" },
    { id: "payments", label: "Payments", href: "/firebase-services#payments", icon: "payments" },
    { id: "more", label: "More", href: "/firebase-services", icon: "more" },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-8px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[min(680px,calc(100%-2rem))] sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:px-3 sm:pb-3"
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-1">
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors sm:py-2.5 sm:text-[11px] ${selected ? "bg-sky-50 text-sky-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const quickActions: {
  label: string;
  icon: IconName;
  href?: string;
}[] = [
  { label: "Deposit", icon: "deposit", href: "/firebase-deposit" },
  { label: "Withdraw", icon: "withdraw", href: "/firebase-withdraw" },
  { label: "Transfer", icon: "transfer", href: "/firebase-transfer" },
  { label: "Pay Bills", icon: "bill" },
];

const services: {
  label: string;
  icon: IconName;
  href?: string;
}[] = [
  { label: "Mobile Recharge", icon: "mobile" },
  { label: "Utility Bills", icon: "utility" },
  { label: "Card Management", icon: "card" },
  { label: "QR Payment", icon: "qr" },
  { label: "Savings Account", icon: "savings" },
  { label: "Beneficiaries", icon: "beneficiaries" },
  { label: "Scheduled Payments", icon: "calendar" },
  { label: "Bank Statement", icon: "statement", href: "/firebase-transactions" },
];

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1
      ? `${words[0][0]}${words[words.length - 1][0]}`
      : (words[0] ?? "KB").slice(0, 2)
  ).toUpperCase();
}

type DashboardClientProps = {
  fullName: string;
  availableBalance: string;
  currency: string;
};

export default function DashboardClient({
  fullName,
  availableBalance,
  currency,
}: DashboardClientProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const initials = getInitials(fullName);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172554]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-6 sm:pt-7 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/firebase-dashboard" className="flex min-w-0 items-center gap-3" aria-label="Kids Bank Ltd home">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-sm font-black text-white shadow-sm shadow-sky-500/20">
              KB
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-extrabold tracking-tight text-[#172554] sm:text-lg">Kids Bank Ltd</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">Digital wallet</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled
              title="Notifications are not available yet"
              aria-label="Notifications not available yet"
              className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400"
            >
              <Icon name="bell" className="h-[18px] w-[18px]" />
            </button>
            <Link
              href="/firebase-profile"
              aria-label="Open profile and settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-100 bg-sky-100 text-xs font-extrabold text-sky-700 transition hover:bg-sky-200"
            >
              {initials}
            </Link>
          </div>
        </header>

        <section className="mt-8 sm:mt-10">
          <p className="text-sm font-semibold text-slate-500">Your wallet at a glance</p>
          <h1 className="mt-1.5 text-[27px] font-extrabold tracking-tight text-[#172554] sm:text-3xl">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Everything you need to manage your money, in one place.
          </p>
        </section>

        <section id="account-balance" aria-label="Account balance" className="mt-7 scroll-mt-6">
          <div className="relative isolate overflow-hidden rounded-[26px] border border-sky-100 bg-gradient-to-br from-[#E0F2FE] via-white to-[#F0F9FF] p-6 shadow-[0_14px_40px_rgba(14,165,233,0.08)] sm:rounded-[28px] sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-sky-200/70" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-9 h-40 w-40 rounded-full bg-sky-200/25 blur-2xl" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600">Available balance</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-sky-200 bg-white/75 px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-sky-800">
                    {currency} · ৳
                  </span>
                  <button
                    type="button"
                    onClick={() => setBalanceVisible((visible) => !visible)}
                    aria-label={balanceVisible ? "Hide balance" : "Show balance"}
                    title={balanceVisible ? "Hide balance" : "Show balance"}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-white/80 text-sky-700 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                  >
                    <Icon name={balanceVisible ? "eyeOff" : "eye"} className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>

              <p className="mt-6 break-words text-[34px] font-extrabold leading-tight tracking-tight text-[#172554] tabular-nums sm:text-5xl">
                {balanceVisible ? availableBalance : "৳ ••••••"}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-sky-200/80 pt-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-800/70">Kids Bank Ltd</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Member wallet · {currency}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Wallet offer" className="mt-4">
          <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-4 py-3.5 shadow-[0_4px_18px_rgba(15,23,42,0.025)] sm:px-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Icon name="sparkles" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#172554]">A simpler way to move money</p>
              <p className="mt-0.5 text-xs text-slate-500">Send funds to another Kids Bank member.</p>
            </div>
            <Link href="/firebase-transfer" className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-sky-600 transition hover:text-sky-700">
              Transfer <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="quick-actions-heading" className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="quick-actions-heading" className="text-lg font-extrabold tracking-tight text-[#172554]">Quick Actions</h2>
              <p className="mt-1 text-xs text-slate-500">Your most-used wallet tools.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2.5 sm:gap-4">
            {quickActions.map((action) => {
              const content = (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700 transition group-hover:bg-sky-200">
                    <Icon name={action.icon} className="h-5 w-5" />
                  </span>
                  <span className="mt-2 text-center text-[11px] font-bold leading-tight text-[#172554] sm:text-sm">
                    {action.label}
                  </span>
                  {!action.href && <span className="mt-1 text-center text-[9px] font-semibold text-slate-400 sm:text-[10px]">Coming soon</span>}
                </>
              );

              return action.href ? (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex min-h-[104px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-1.5 py-4 shadow-[0_3px_12px_rgba(15,23,42,0.025)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_8px_22px_rgba(14,165,233,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:min-h-[116px]"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={action.label}
                  aria-disabled="true"
                  className="flex min-h-[104px] cursor-not-allowed flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-1.5 py-4 sm:min-h-[116px]"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        <section id="more-services" aria-labelledby="more-services-heading" className="mt-9 scroll-mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="more-services-heading" className="text-lg font-extrabold tracking-tight text-[#172554]">More Services</h2>
              <p className="mt-1 text-xs text-slate-500">Everyday services, all in one place.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4 sm:gap-x-4 sm:gap-y-5">
            {services.map((service) => {
              const tile = (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 transition group-hover:bg-sky-100">
                    <Icon name={service.icon} className="h-5 w-5" />
                  </span>
                  <span className="mt-2 text-center text-[10px] font-semibold leading-snug text-slate-700 sm:text-xs">
                    {service.label}
                  </span>
                  <span className="mt-1 text-center text-[9px] font-medium text-slate-400">
                    {service.href ? "View history" : "Coming soon"}
                  </span>
                </>
              );

              return service.href ? (
                <Link
                  key={service.label}
                  href={service.href}
                  className="group flex min-w-0 flex-col items-center rounded-2xl px-1 py-2 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                >
                  {tile}
                </Link>
              ) : (
                <div key={service.label} aria-disabled="true" className="flex min-w-0 cursor-not-allowed flex-col items-center rounded-2xl px-1 py-2">
                  {tile}
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <Link
              href="/firebase-services"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              View More Services <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="mt-9 text-center text-[11px] text-slate-400">
          Kids Bank Ltd · Simulated wallet · No real payments are processed
        </footer>
      </div>

      <DashboardNavigation active="home" />
    </main>
  );
}
