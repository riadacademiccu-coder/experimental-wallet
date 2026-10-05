import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, status")
    .eq("id", user.id)
    .single();

  const { data: account } = await supabase
    .from("accounts")
    .select("available_balance_poisha, held_balance_poisha")
    .eq("user_id", user.id)
    .single();

  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      `
      id,
      reference,
      type,
      amount_poisha,
      status,
      description,
      created_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: notices } = await supabase
    .from("notices")
    .select(
      `
      id,
      title,
      message,
      type,
      created_at
      `
    )
    .order("created_at", { ascending: false })
    .limit(5);

  const availableBalancePoisha =
    account?.available_balance_poisha ?? 0;

  const heldBalancePoisha =
    account?.held_balance_poisha ?? 0;

  const availableBalanceTaka =
    availableBalancePoisha / 100;

  const heldBalanceTaka =
    heldBalancePoisha / 100;

  function formatMoney(amountPoisha: number) {
    return (amountPoisha / 100).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getTransactionSign(type: string) {
    if (
      type === "DEPOSIT" ||
      type === "BONUS" ||
      type === "ADMIN_CREDIT" ||
      type === "REFUND"
    ) {
      return "+";
    }

    if (
      type === "WITHDRAWAL" ||
      type === "ADMIN_DEBIT"
    ) {
      return "-";
    }

    return "";
  }

  function getStatusStyle(status?: string) {
    if (status === "ACTIVE") {
      return "bg-green-100 text-green-700";
    }

    if (status === "FROZEN") {
      return "bg-blue-100 text-blue-700";
    }

    if (status === "SUSPENDED") {
      return "bg-red-100 text-red-700";
    }

    if (status === "PENDING") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Welcome, {profile?.full_name ?? "User"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/deposit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Deposit
            </Link>

            <Link
              href="/withdraw"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Withdraw
            </Link>

            <Link
              href="/transactions"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Transactions
            </Link>

            <Link
              href="/profile"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Profile
            </Link>

            <a
              href="/logout"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Logout
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Main account cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-slate-900 p-7 text-white shadow-lg lg:col-span-2">
            <p className="text-sm font-medium text-slate-400">
              Available Balance
            </p>

            <p className="mt-2 text-4xl font-bold md:text-5xl">
              ৳
              {availableBalanceTaka.toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/deposit"
                className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Deposit
              </Link>

              <Link
                href="/withdraw"
                className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Withdraw
              </Link>

              <Link
                href="/transactions"
                className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                History
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow">
              <p className="text-sm text-slate-500">
                Account Status
              </p>

              <div className="mt-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusStyle(
                    profile?.status
                  )}`}
                >
                  {profile?.status ?? "UNKNOWN"}
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow">
              <p className="text-sm text-slate-500">
                Held Balance
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                ৳
                {heldBalanceTaka.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Money temporarily held for pending transactions will appear
                here.
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">
            Quick Actions
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/deposit"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-bold text-slate-900">
                Deposit
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add money using a test transaction.
              </p>
            </Link>

            <Link
              href="/withdraw"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-bold text-slate-900">
                Withdraw
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Request withdrawal through an agent.
              </p>
            </Link>

            <Link
              href="/transactions"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-bold text-slate-900">
                Transactions
              </p>

              <p className="mt-1 text-sm text-slate-500">
                View your complete transaction history.
              </p>
            </Link>

            <Link
              href="/profile"
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-bold text-slate-900">
                Profile
              </p>

              <p className="mt-1 text-sm text-slate-500">
                View your account information.
              </p>
            </Link>
          </div>
        </section>

        {/* Notices */}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Updates
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Notices
            </h2>
          </div>

          {!notices || notices.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-slate-500">
                No notices at the moment.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {notice.type}
                      </p>

                      <h3 className="mt-1 font-bold text-slate-900">
                        {notice.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-400">
                      {new Date(
                        notice.created_at
                      ).toLocaleDateString("en-BD")}
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {notice.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent transactions */}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Activity
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Recent Transactions
              </h2>
            </div>

            <Link
              href="/transactions"
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              View All
            </Link>
          </div>

          {!transactions || transactions.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="font-medium text-slate-700">
                No transactions yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Your latest wallet activity will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {transactions.map((transaction) => {
                const sign = getTransactionSign(
                  transaction.type
                );

                return (
                  <div
                    key={transaction.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {transaction.type.replaceAll(
                          "_",
                          " "
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {transaction.description ||
                          transaction.reference}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(
                          transaction.created_at
                        ).toLocaleString("en-BD")}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p
                        className={`text-lg font-bold ${
                          sign === "+"
                            ? "text-green-600"
                            : sign === "-"
                            ? "text-red-600"
                            : "text-slate-900"
                        }`}
                      >
                        {sign}৳
                        {formatMoney(
                          transaction.amount_poisha
                        )}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <footer className="mt-10 border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-slate-400">
          Kids Bank Ltd
        </div>
      </footer>
    </main>
  );
}