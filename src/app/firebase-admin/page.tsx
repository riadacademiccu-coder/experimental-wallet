import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IconName =
  | "overview"
  | "users"
  | "wallet"
  | "activity"
  | "shield"
  | "arrow-up-right"
  | "arrow-right"
  | "logout"
  | "clock"
  | "check"
  | "sparkles"
  | "agents"
  | "receipt"
  | "withdrawals";

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const paths = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M3 9h18M16 15h2" />
      </>
    ),
    activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    "arrow-up-right": <path d="M7 17 17 7M8 7h9v9" />,
    "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5M21 12H9" />
      </>
    ),
    clock: <circle cx="12" cy="12" r="9" />,
    check: <path d="m5 12 4 4L19 6" />,
    agents: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M18 9h4m-2-2v4M17 20v-3a4 4 0 0 0-2-3.45" />
      </>
    ),
    receipt: (
      <>
        <path d="M4 3h16v18l-4-2-4 2-4-2-4 2V3Z" />
        <path d="M8 8h8M8 12h8M8 16h4" />
      </>
    ),
    withdrawals: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M8 15h4m3-2 3 3m0 0-3 3m3-3h-5" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m19 17 .7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17Z" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function displayDate(value: unknown): string {
  if (!(value instanceof Timestamp)) return "Not available";
  return value.toDate().toLocaleDateString("en-BD", {
    dateStyle: "medium",
    timeZone: "Asia/Dhaka",
  });
}

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  return (words[0] || "KB").slice(0, 2).toUpperCase();
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function amountLabel(value: unknown): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return "Amount unavailable";
  }
  return `৳${(value / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isCredit(type: string): boolean {
  return ["ADMIN_CREDIT", "DEPOSIT", "BONUS", "REFUND", "TRANSFER_IN"].includes(type);
}

function isDebit(type: string): boolean {
  return ["ADMIN_DEBIT", "WITHDRAWAL", "TRANSFER_OUT"].includes(type);
}

export default async function FirebaseAdminDashboardPage() {
  const admin = await getCurrentWalletUser();

  if (!admin) redirect("/firebase-login");
  if (admin.role !== "ADMIN") redirect("/firebase-dashboard");

  const db = getAdminDb();

  // Read-only queries. No balances or transactions are modified here.
  const [totalUsersResult, activeUsersResult, walletsResult, totalTransactionsResult, usersResult, activityResult] =
    await Promise.all([
      db.collection("profiles").count().get(),
      db.collection("profiles").where("status", "==", "ACTIVE").count().get(),
      db.collection("accounts").count().get(),
      db.collection("transactions").count().get(),
      db.collection("profiles").orderBy("created_at", "desc").limit(5).get(),
      db.collection("transactions").orderBy("created_at", "desc").limit(6).get(),
    ]);

  const stats = [
    {
      label: "Registered users",
      value: totalUsersResult.data().count.toLocaleString("en-BD"),
      icon: "users" as const,
      description: "Firebase profiles",
      accent: "text-emerald-300",
      tint: "bg-emerald-400/10",
    },
    {
      label: "Active accounts",
      value: activeUsersResult.data().count.toLocaleString("en-BD"),
      icon: "shield" as const,
      description: "Active user profiles",
      accent: "text-sky-300",
      tint: "bg-sky-400/10",
    },
    {
      label: "Wallets created",
      value: walletsResult.data().count.toLocaleString("en-BD"),
      icon: "wallet" as const,
      description: "Account records",
      accent: "text-violet-300",
      tint: "bg-violet-400/10",
    },
    {
      label: "Transactions",
      value: totalTransactionsResult.data().count.toLocaleString("en-BD"),
      icon: "activity" as const,
      description: "All recorded activity",
      accent: "text-amber-300",
      tint: "bg-amber-400/10",
    },
  ];

  const users = usersResult.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      name: safeString(data.full_name, "Unnamed user"),
      email: safeString(data.email, "No email"),
      role: safeString(data.role, "USER"),
      status: safeString(data.status, "UNKNOWN"),
      createdAt: displayDate(data.created_at),
    };
  });

  const activity = activityResult.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      type: safeString(data.type, "TRANSACTION"),
      userId: safeString(data.user_id, "Unknown user"),
      status: safeString(data.status, "UNKNOWN"),
      amount: amountLabel(data.amount_poisha),
      createdAt: displayDate(data.created_at),
    };
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111e] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 650px 520px at 92% 4%,rgba(16,185,129,.09),transparent 75%),radial-gradient(ellipse 650px 550px at 12% 88%,rgba(30,64,175,.08),transparent 80%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="hidden w-[274px] shrink-0 flex-col border-r border-white/[0.08] bg-[#091522]/90 px-5 py-8 xl:sticky xl:top-0 xl:flex xl:h-screen xl:overflow-y-auto">
          <Link href="/firebase-admin" className="flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 text-base font-black text-[#072121] shadow-lg shadow-emerald-900/30">
              KB
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Kids Bank Ltd</p>
              <p className="text-[10px] font-semibold tracking-[0.20em] text-emerald-300/80">
                ADMIN CONSOLE
              </p>
            </div>
          </Link>

          <p className="mb-4 mt-14 px-4 text-[10px] font-bold uppercase tracking-[0.23em] text-slate-500">
            Management
          </p>
          <nav aria-label="Admin sidebar" className="space-y-2">
            <Link
              href="/firebase-admin"
              aria-current="page"
              className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.10] px-4 py-3.5 text-sm font-semibold text-emerald-300"
            >
              <Icon name="overview" /> Overview
            </Link>
            <Link href="/firebase-admin/users" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="users" /> User management
            </Link>
            <Link href="/firebase-admin/user-status" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="shield" /> Account status
            </Link>
            <Link href="/firebase-admin/email-verification" className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.12]">
              <Icon name="check" /> Email verification
            </Link>
            <a href="#activity" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="activity" /> Recent activity
            </a>
          </nav>

          <p className="mb-4 mt-8 px-4 text-[10px] font-bold uppercase tracking-[0.23em] text-slate-500">
            Wallet operations
          </p>
          <nav aria-label="Wallet administration" className="space-y-2">
            <Link href="/firebase-admin/withdrawals" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="withdrawals" /> Withdrawals
            </Link>
            <Link href="/firebase-admin/agents" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="agents" /> Agents
            </Link>
            <Link href="/firebase-admin/bkash" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="receipt" /> Test deposits
            </Link>
          </nav>

          <p className="mb-4 mt-8 px-4 text-[10px] font-bold uppercase tracking-[0.23em] text-slate-500">
            Your account
          </p>
          <nav aria-label="Account navigation" className="space-y-2">
            <Link href="/firebase-dashboard" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="wallet" /> My wallet
            </Link>
            <Link href="/firebase-transactions" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="activity" /> My transactions
            </Link>
            <Link href="/firebase-logout" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
              <Icon name="logout" /> Sign out
            </Link>
          </nav>

          <div className="mt-auto rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 font-bold text-emerald-200">
                {initials(admin.fullName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{admin.fullName}</p>
                <p className="truncate text-xs text-slate-500">{admin.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-white/[0.08] pt-4 text-xs font-medium text-emerald-300">
              <Icon name="shield" className="h-4 w-4" /> Administrator access
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300 to-teal-500 text-sm font-black text-slate-950 xl:hidden">
                KB
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/80">Workspace / Administration</p>
                <p className="mt-1 text-sm text-slate-400">Overview</p>
              </div>
            </div>
            <nav aria-label="Quick navigation" className="flex flex-wrap items-center gap-2">
              <Link href="/firebase-admin/withdrawals" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/15 sm:text-sm">
                Withdrawal queue
              </Link>
              <Link href="/firebase-dashboard" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.07] sm:text-sm">
                My wallet
              </Link>
              <Link href="/firebase-logout" className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] sm:text-sm">
                <Icon name="logout" className="h-4 w-4" /> Logout
              </Link>
            </nav>
          </header>

          <div className="mx-auto max-w-[1350px] px-5 pb-14 pt-9 sm:px-8 lg:px-10 lg:pt-11">
            <section id="overview" className="scroll-mt-8">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                    <Icon name="sparkles" className="h-4 w-4" /> Command center
                  </div>
                  <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                    Welcome back, <span className="text-emerald-300">{admin.fullName.split(" ")[0] || "Admin"}</span>
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                    Manage members, agents, simulated deposit references, withdrawal requests, and wallet activity.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-slate-300">
                  <Icon name="shield" className="h-4 w-4 text-emerald-300" /> Firebase secured
                </div>
              </div>

              <div className="relative mt-9 overflow-hidden rounded-[30px] border border-emerald-300/15 bg-gradient-to-br from-[#0f3838] via-[#102c38] to-[#102034] px-6 py-8 shadow-2xl shadow-emerald-950/20 sm:px-9 sm:py-10">
                <div className="pointer-events-none absolute -right-16 -top-32 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 right-10 h-32 w-32 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -bottom-20 right-24 h-72 w-72 rounded-full border border-white/[0.07]" />
                <div className="relative max-w-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
                    <Icon name="shield" className="h-4 w-4" /> Administrator workspace
                  </div>
                  <h2 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Everything in one place.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                    Review Firebase accounts, manage test deposit references and agents, and process pending simulated withdrawal requests from one workspace.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link href="/firebase-admin/withdrawals" className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/15 px-4 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/25">
                      <Icon name="withdrawals" className="h-4 w-4" /> Review withdrawals <Icon name="arrow-right" className="h-4 w-4" />
                    </Link>
                    <Link href="/firebase-admin/bkash" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10">
                      <Icon name="receipt" className="h-4 w-4" /> Test deposits
                    </Link>
                  </div>
                </div>
              </div>

              <nav aria-label="Admin mobile quick links" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:hidden">
                <Link href="/firebase-admin/users" className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-slate-200">Users</Link>
                <Link href="/firebase-admin/withdrawals" className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-slate-200">Withdrawals</Link>
                <Link href="/firebase-admin/agents" className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-slate-200">Agents</Link>
                <Link href="/firebase-admin/bkash" className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-slate-200">Test deposits</Link>
                <Link href="/firebase-admin/audit" className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-slate-200">Audit logs</Link>
                <Link href="/firebase-admin/user-status" className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-slate-200">Account status</Link>
                <Link href="/firebase-admin/email-verification" className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center text-xs font-semibold text-slate-200">Email verification</Link>
              </nav>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.06]">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.tint} ${stat.accent}`}>
                        <Icon name={stat.icon} className="h-6 w-6" />
                      </div>
                      <Icon name="arrow-up-right" className="h-4 w-4 text-slate-600" />
                    </div>
                    <p className="mt-7 text-sm font-medium text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">{stat.value}</p>
                    <p className="mt-3 text-xs text-slate-500">{stat.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="admin-tools-heading" className="mt-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-emerald-300/80">Quick access</p>
                  <h2 id="admin-tools-heading" className="mt-2 text-xl font-extrabold">Administration tools</h2>
                </div>
                <p className="text-xs text-slate-500">Available to active administrators</p>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Link href="/firebase-admin/users" className="group rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300"><Icon name="users" /></div>
                  <h3 className="mt-5 font-bold">User management <span className="text-slate-500 transition group-hover:text-sky-300">↗</span></h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Browse users, view account details, and manage test balances.</p>
                </Link>
                <Link href="/firebase-admin/user-status" className="group rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Icon name="shield" /></div>
                  <h3 className="mt-5 font-bold">Account status <span className="text-slate-500 transition group-hover:text-violet-300">↗</span></h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Freeze, suspend, or reactivate eligible user accounts.</p>
                </Link>
                <Link href="/firebase-admin/email-verification" className="group rounded-[24px] border border-emerald-400/20 bg-emerald-400/[0.07] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-400/[0.12]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><Icon name="check" /></div>
                  <h3 className="mt-5 font-bold">Email verification <span className="text-emerald-300">↗</span></h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Review verification status or approve a documented manual override.</p>
                </Link>
                <Link href="/firebase-admin/withdrawals" className="group rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-white/[0.07]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Icon name="withdrawals" /></div>
                  <h3 className="mt-5 font-bold">Withdrawal requests <span className="text-slate-500 transition group-hover:text-emerald-300">↗</span></h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Review pending simulated withdrawals; approve or reject reserved funds.</p>
                </Link>
                <Link href="/firebase-admin/agents" className="group rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-white/[0.07]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300"><Icon name="agents" /></div>
                  <h3 className="mt-5 font-bold">Agent management <span className="text-slate-500 transition group-hover:text-sky-300">↗</span></h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Register agents and manage verification and active status.</p>
                </Link>
                <Link href="/firebase-admin/bkash" className="group rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.07]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Icon name="receipt" /></div>
                  <h3 className="mt-5 font-bold">Simulated bKash deposits <span className="text-slate-500 transition group-hover:text-violet-300">↗</span></h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Create test deposit references and view their usage status.</p>
                </Link>
                <Link href="/firebase-admin/audit" className="group rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-white/[0.07]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Icon name="activity" /></div>
                  <h3 className="mt-5 font-bold">Admin audit history <span className="text-slate-500 transition group-hover:text-emerald-300">↗</span></h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Review recent administrator balance, account, agent, and withdrawal actions.</p>
                </Link>
              </div>
            </section>

            <div className="mt-7 grid gap-6 2xl:grid-cols-2">
              <section id="members" className="scroll-mt-8 rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-emerald-300/80">Community</p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight">Recent members</h2>
                    <p className="mt-2 text-xs text-slate-500">Most recently created Firebase profiles</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.05] p-3 text-slate-300"><Icon name="users" /></div>
                </div>
                {users.length === 0 ? (
                  <div className="py-14 text-center text-sm text-slate-400">No members found yet.</div>
                ) : (
                  <div className="divide-y divide-white/[0.07]">
                    {users.map((member) => (
                      <div key={member.id} className="flex items-start gap-3 py-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-sm font-bold text-emerald-200">
                          {initials(member.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{member.name}</p>
                          <p className="truncate text-xs text-slate-500">{member.email}</p>
                          <p className="mt-1 text-xs text-slate-600">Joined {member.createdAt}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-xs font-bold ${member.status === "ACTIVE" ? "text-emerald-300" : "text-amber-300"}`}>
                            {member.status}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section id="activity" className="scroll-mt-8 rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-emerald-300/80">Monitoring</p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight">Recent transactions</h2>
                    <p className="mt-2 text-xs text-slate-500">Latest activity across Firebase wallets</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.05] p-3 text-slate-300"><Icon name="activity" /></div>
                </div>
                {activity.length === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <div className="rounded-2xl bg-white/[0.05] p-4 text-slate-400"><Icon name="clock" className="h-7 w-7" /></div>
                    <p className="mt-5 font-semibold">No transaction records yet</p>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Transactions will appear after wallet operations have been enabled.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.07]">
                    {activity.map((record) => (
                      <div key={record.id} className="flex items-start gap-3 py-4">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isCredit(record.type) ? "bg-emerald-400/10 text-emerald-300" : isDebit(record.type) ? "bg-rose-400/10 text-rose-300" : "bg-white/[0.07] text-slate-300"}`}>
                          <Icon name={isDebit(record.type) ? "arrow-up-right" : "arrow-right"} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{record.type.replaceAll("_", " ")}</p>
                          <p className="truncate text-xs text-slate-500">User: {record.userId}</p>
                          <p className="mt-1 text-xs text-slate-600">{record.createdAt}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold tabular-nums">{record.amount}</p>
                          <p className="mt-1 text-xs text-slate-500">{record.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="mt-7 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-6 py-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><Icon name="shield" /></div>
                <div>
                  <p className="text-sm font-bold">Access verified on every page request</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">Only an active Firebase ADMIN can access this page. All sensitive actions are checked by their server endpoints.</p>
                </div>
              </div>
              <Link href="/firebase-dashboard" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 transition hover:text-emerald-200 sm:mt-0">
                Open my wallet <Icon name="arrow-up-right" className="h-4 w-4" />
              </Link>
            </div>

            <footer className="mt-10 text-center text-xs text-slate-600">© {new Date().getFullYear()} Kids Bank Ltd</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
