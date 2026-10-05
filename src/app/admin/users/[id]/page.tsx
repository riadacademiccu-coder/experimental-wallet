import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminUserDetailsPage({
  params,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", currentUser.id)
    .single();

  if (
    !adminProfile ||
    adminProfile.role !== "ADMIN" ||
    adminProfile.status !== "ACTIVE"
  ) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      phone,
      role,
      status,
      created_at
      `
    )
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: account } = await supabase
    .from("accounts")
    .select(
      `
      available_balance_poisha,
      held_balance_poisha
      `
    )
    .eq("user_id", id)
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
    .eq("user_id", id)
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  const { data: withdrawals } = await supabase
    .from("withdrawal_requests")
    .select(
      `
      id,
      reference,
      amount_poisha,
      status,
      created_at
      `
    )
    .eq("user_id", id)
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  function formatMoney(poisha: number) {
    return (Number(poisha) / 100).toLocaleString("en-BD", {
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

  function statusStyle(status: string) {
    if (
      status === "ACTIVE" ||
      status === "COMPLETED"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (status === "PENDING") {
      return "bg-amber-100 text-amber-700";
    }

    if (status === "FROZEN") {
      return "bg-blue-100 text-blue-700";
    }

    if (
      status === "SUSPENDED" ||
      status === "REJECTED" ||
      status === "FAILED" ||
      status === "CANCELLED"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  const availableBalance =
    account?.available_balance_poisha ?? 0;

  const heldBalance =
    account?.held_balance_poisha ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — User Details
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/users"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Users
            </Link>

            <Link
              href="/admin"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Admin Dashboard
            </Link>

            <a
              href="/logout"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Logout
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* User Heading */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            User Account
          </p>

          <h2 className="mt-1 text-3xl font-bold text-slate-900">
            {profile.full_name}
          </h2>

          <p className="mt-2 text-slate-500">
            {profile.email}
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow">
            <p className="text-sm text-slate-400">
              Available Balance
            </p>

            <p className="mt-2 text-3xl font-bold">
              ৳{formatMoney(availableBalance)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Held Balance
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              ৳{formatMoney(heldBalance)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Account Status
            </p>

            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyle(
                  profile.status
                )}`}
              >
                {profile.status}
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">
              Role
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {profile.role}
            </p>
          </div>
        </div>

        {/* Admin Actions */}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold text-slate-900">
            Admin Actions
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Financial changes and account controls for this user.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={`/admin/users/${profile.id}/balance?type=credit`}
              className="rounded-xl bg-green-600 px-5 py-3 text-center font-semibold text-white"
            >
              Add Balance
            </Link>

            <Link
              href={`/admin/users/${profile.id}/balance?type=debit`}
              className="rounded-xl bg-red-600 px-5 py-3 text-center font-semibold text-white"
            >
              Deduct Balance
            </Link>

            <Link
              href={`/admin/users/${profile.id}/balance?type=bonus`}
              className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white"
            >
              Give Bonus
            </Link>

            <Link
              href={`/admin/users/${profile.id}/balance?type=refund`}
              className="rounded-xl bg-slate-700 px-5 py-3 text-center font-semibold text-white"
            >
              Refund
            </Link>

            <Link
              href={`/admin/users/${profile.id}/status`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700"
            >
              Change Account Status
            </Link>

            <Link
              href={`/admin/users/${profile.id}/statement`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700"
            >
              Generate Statement
            </Link>
          </div>
        </section>

        {/* User Information */}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold text-slate-900">
            Account Information
          </h3>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">
                Full Name
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile.full_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Email
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile.email}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Phone
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile.phone || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                User ID
              </p>

              <p className="mt-1 break-all font-mono text-xs text-slate-700">
                {profile.id}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Account Created
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {new Date(
                  profile.created_at
                ).toLocaleString("en-BD")}
              </p>
            </div>
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold text-slate-900">
            Recent Transactions
          </h3>

          {!transactions ||
          transactions.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-500">
              No transactions found.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {transactions.map((transaction) => {
                const sign =
                  getTransactionSign(
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

                      <p className="mt-1 font-mono text-xs text-slate-400">
                        {transaction.reference}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {transaction.description || "-"}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p
                        className={`font-bold ${
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

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                          transaction.status
                        )}`}
                      >
                        {transaction.status}
                      </span>

                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(
                          transaction.created_at
                        ).toLocaleString("en-BD")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Withdrawal Requests */}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold text-slate-900">
            Withdrawal Requests
          </h3>

          {!withdrawals ||
          withdrawals.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-500">
              No withdrawal requests found.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {withdrawal.reference}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(
                        withdrawal.created_at
                      ).toLocaleString("en-BD")}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="font-bold text-slate-900">
                      ৳
                      {formatMoney(
                        withdrawal.amount_poisha
                      )}
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                        withdrawal.status
                      )}`}
                    >
                      {withdrawal.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}