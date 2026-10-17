
import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatMoney(amount: unknown) {
  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount < 0
  ) {
    return "Unavailable";
  }

  return `৳${(amount / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: unknown) {
  if (!(value instanceof Timestamp)) {
    return "Unavailable";
  }

  return value.toDate().toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "SUSPENDED":
      return "border-rose-400/20 bg-rose-400/10 text-rose-300";
    case "FROZEN":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
    default:
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }
}

export default async function FirebaseAdminUsersPage() {
  const admin = await getCurrentWalletUser();

  if (!admin) {
    redirect("/firebase-login");
  }

  if (admin.role !== "ADMIN") {
    redirect("/firebase-dashboard");
  }

  const db = getAdminDb();

  const profilesSnapshot = await db
    .collection("profiles")
    .orderBy("created_at", "desc")
    .limit(30)
    .get();

  const users = await Promise.all(
    profilesSnapshot.docs.map(async (profileDoc) => {
      const profile = profileDoc.data();

      const accountSnapshot = await db
        .collection("accounts")
        .doc(profileDoc.id)
        .get();

      const account = accountSnapshot.data();

      const validAccount =
        accountSnapshot.exists &&
        account?.user_id === profileDoc.id;

      return {
        id: profileDoc.id,
        fullName:
          typeof profile.full_name === "string"
            ? profile.full_name
            : "Unknown User",
        email:
          typeof profile.email === "string"
            ? profile.email
            : "No email",
        role:
          typeof profile.role === "string"
            ? profile.role
            : "USER",
        status:
          typeof profile.status === "string"
            ? profile.status
            : "UNKNOWN",
        createdAt: formatDate(profile.created_at),
        balance: validAccount
          ? formatMoney(account?.available_balance_poisha)
          : "No wallet",
        heldBalance: validAccount
          ? formatMoney(account?.held_balance_poisha)
          : "No wallet",
      };
    })
  );

  const activeUsers = users.filter(
    (user) => user.status === "ACTIVE"
  ).length;

  const adminUsers = users.filter(
    (user) => user.role === "ADMIN"
  ).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-[120px]" />

      <div className="pointer-events-none absolute -right-40 top-96 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <Link
            href="/firebase-admin"
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950">
              KB
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                Kids Bank Ltd
              </h1>

              <p className="text-xs text-slate-400">
                Administration
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-3">
            <Link
              href="/firebase-admin"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/firebase-admin/users"
              aria-current="page"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300"
            >
              Users
            </Link>

            <Link
              href="/firebase-logout"
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Logout
            </Link>
          </nav>
        </header>

        {/* Title */}
        <section className="pb-8 pt-12 sm:pt-16">
          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Administration
          </span>

          <h2 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            User{" "}
            <span className="text-emerald-400">
              Management
            </span>
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            View registered members, wallet balances,
            account details, and user activity.
          </p>
        </section>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-slate-400">
              Users displayed
            </p>
            <p className="mt-4 text-4xl font-extrabold">
              {users.length}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Latest 30 registered profiles
            </p>
          </div>

          <div className="rounded-[26px] border border-emerald-400/15 bg-emerald-400/[0.06] p-6 backdrop-blur-xl">
            <p className="text-sm text-emerald-200">
              Active accounts
            </p>
            <p className="mt-4 text-4xl font-extrabold text-emerald-300">
              {activeUsers}
            </p>
            <p className="mt-3 text-xs text-emerald-200/60">
              Among displayed users
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-slate-400">
              Administrators
            </p>
            <p className="mt-4 text-4xl font-extrabold">
              {adminUsers}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Among displayed users
            </p>
          </div>
        </section>

        {/* Users */}
        <section className="mt-8 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-6 sm:p-8">
            <div>
              <h3 className="text-xl font-bold">
                Registered Users
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Firebase accounts and wallet information
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">
              {users.length} records
            </span>
          </div>

          {users.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <p className="text-xl font-bold">
                No registered users
              </p>

              <p className="mt-3 text-sm text-slate-400">
                New accounts will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="p-5 transition duration-300 hover:bg-white/[0.035] sm:p-7"
                >
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    {/* User information */}
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xl font-extrabold text-emerald-300">
                        {user.fullName
                          .trim()
                          .charAt(0)
                          .toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <h4 className="break-words text-lg font-bold">
                          {user.fullName}
                        </h4>

                        <p className="mt-1 break-all text-sm text-slate-400">
                          {user.email}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Joined {user.createdAt}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(
                              user.status
                            )}`}
                          >
                            {user.status}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${
                              user.role === "ADMIN"
                                ? "border-violet-400/20 bg-violet-400/10 text-violet-300"
                                : "border-white/10 bg-white/5 text-slate-300"
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Balances and action */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-36 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-xs text-slate-400">
                          Available Balance
                        </p>

                        <p className="mt-2 break-words text-lg font-extrabold tabular-nums text-emerald-300">
                          {user.balance}
                        </p>
                      </div>

                      <div className="min-w-36 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-xs text-slate-400">
                          Held Balance
                        </p>

                        <p className="mt-2 break-words text-lg font-extrabold tabular-nums text-white">
                          {user.heldBalance}
                        </p>
                      </div>

                      <Link
                        href={`/firebase-admin/users/${user.id}`}
                        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-5 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/10 transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
                      >
                        View Details
                        <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8">
          <Link
            href="/firebase-admin"
            className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/30 hover:text-emerald-300"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        <footer className="py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
