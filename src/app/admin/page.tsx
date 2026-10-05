import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("full_name, role, status")
    .eq("id", user.id)
    .single();

  if (
    !adminProfile ||
    adminProfile.role !== "ADMIN" ||
    adminProfile.status !== "ACTIVE"
  ) {
    redirect("/dashboard");
  }

  const [
    usersResult,
    transactionsResult,
    withdrawalsResult,
    agentsResult,
    bkashResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("withdrawal_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),

    supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .eq("verified", true),

    supabase
      .from("bkash_test_transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "UNUSED"),
  ]);

  const totalUsers = usersResult.count ?? 0;
  const totalTransactions = transactionsResult.count ?? 0;
  const pendingWithdrawals = withdrawalsResult.count ?? 0;
  const activeAgents = agentsResult.count ?? 0;
  const unusedBkashTransactions = bkashResult.count ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin Dashboard
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              User Dashboard
            </Link>

            <a
              href="/logout"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Logout
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Administration
          </p>

          <h2 className="mt-1 text-3xl font-bold text-slate-900">
            Welcome, {adminProfile.full_name}
          </h2>

          <p className="mt-2 text-slate-500">
            Manage users, balances, withdrawals, agents and system records.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Total Users
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalUsers}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Transactions
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalTransactions}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Pending Withdrawals
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              {pendingWithdrawals}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Active Agents
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {activeAgents}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Unused bKash Tests
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {unusedBkashTransactions}
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h3 className="text-xl font-bold text-slate-900">
            Admin Tools
          </h3>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/users"
              className="rounded-3xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h4 className="text-lg font-bold text-slate-900">
                User Management
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                View users, balances, status, statements and account controls.
              </p>
            </Link>

            <Link
              href="/admin/transactions"
              className="rounded-3xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h4 className="text-lg font-bold text-slate-900">
                Transactions
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Search and review transaction records.
              </p>
            </Link>

            <Link
              href="/admin/withdrawals"
              className="rounded-3xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h4 className="text-lg font-bold text-slate-900">
                Withdrawals
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Approve or reject pending withdrawal requests.
              </p>
            </Link>

            <Link
              href="/admin/agents"
              className="rounded-3xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h4 className="text-lg font-bold text-slate-900">
                Agents
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Add, verify, activate and deactivate agents.
              </p>
            </Link>

            <Link
              href="/admin/bkash"
              className="rounded-3xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h4 className="text-lg font-bold text-slate-900">
                Simulated bKash
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Create and review test deposit transaction records.
              </p>
            </Link>

            <Link
              href="/admin/audit"
              className="rounded-3xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h4 className="text-lg font-bold text-slate-900">
                Audit Logs
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Review important administrator activity.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}