import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    type?: string;
    status?: string;
    user?: string;
  }>;
};

export default async function AdminTransactionsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (
    !adminProfile ||
    adminProfile.role !== "ADMIN" ||
    adminProfile.status !== "ACTIVE"
  ) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const typeFilter = params.type?.trim() ?? "";
  const statusFilter = params.status?.trim() ?? "";
  const userSearch = params.user?.trim() ?? "";

  let matchingUserIds: string[] | null = null;

  if (userSearch) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or(
        `full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%,phone.ilike.%${userSearch}%`
      );

    matchingUserIds =
      matchingProfiles?.map((profile) => profile.id) ?? [];

    if (matchingUserIds.length === 0) {
      return (
        <main className="min-h-screen bg-slate-50">
          <nav className="border-b bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Kids Bank Ltd
                </h1>

                <p className="text-sm text-slate-500">
                  Admin — Transactions
                </p>
              </div>

              <Link
                href="/admin"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Admin Dashboard
              </Link>
            </div>
          </nav>

          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="rounded-3xl bg-white p-6 shadow">
              <p className="text-slate-500">
                No user found matching "{userSearch}".
              </p>

              <Link
                href="/admin/transactions"
                className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white"
              >
                Clear Filters
              </Link>
            </div>
          </div>
        </main>
      );
    }
  }

  let query = supabase
    .from("transactions")
    .select(`
      id,
      reference,
      user_id,
      type,
      amount_poisha,
      status,
      description,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(500);

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (matchingUserIds) {
    query = query.in("user_id", matchingUserIds);
  }

  const { data: transactions, error } = await query;

  const userIds = [
    ...new Set(
      (transactions ?? []).map(
        (transaction) => transaction.user_id
      )
    ),
  ];

  let profileMap: Record<
    string,
    {
      full_name: string;
      email: string;
    }
  > = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    for (const profile of profiles ?? []) {
      profileMap[profile.id] = {
        full_name: profile.full_name,
        email: profile.email,
      };
    }
  }

  function formatMoney(poisha: number) {
    return (Number(poisha) / 100).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function typeSign(type: string) {
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
    if (status === "COMPLETED") {
      return "bg-green-100 text-green-700";
    }

    if (status === "PENDING") {
      return "bg-amber-100 text-amber-700";
    }

    if (
      status === "FAILED" ||
      status === "CANCELLED"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (status === "REVERSED") {
      return "bg-purple-100 text-purple-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — Transaction Management
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Admin Dashboard
            </Link>

            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Users
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">
            Transactions
          </h2>

          <p className="mt-2 text-slate-500">
            Search and filter transactions across all users.
          </p>
        </div>

        <form
          method="GET"
          className="mb-6 grid gap-4 rounded-3xl bg-white p-6 shadow md:grid-cols-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              User
            </label>

            <input
              type="text"
              name="user"
              defaultValue={userSearch}
              placeholder="Name, email or phone"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Type
            </label>

            <select
              name="type"
              defaultValue={typeFilter}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">All Types</option>
              <option value="DEPOSIT">DEPOSIT</option>
              <option value="WITHDRAWAL">WITHDRAWAL</option>
              <option value="BONUS">BONUS</option>
              <option value="ADMIN_CREDIT">ADMIN_CREDIT</option>
              <option value="ADMIN_DEBIT">ADMIN_DEBIT</option>
              <option value="REFUND">REFUND</option>
              <option value="REVERSAL">REVERSAL</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>

            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REVERSED">REVERSED</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              Filter
            </button>

            <Link
              href="/admin/transactions"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700"
            >
              Clear
            </Link>
          </div>
        </form>

        <div className="rounded-3xl bg-white p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              Transaction Records
            </h3>

            <p className="text-sm text-slate-500">
              {transactions?.length ?? 0} records
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-50 p-5 text-red-700">
              Unable to load transactions.
            </div>
          ) : !transactions ||
            transactions.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => {
                    const profile =
                      profileMap[transaction.user_id];

                    const sign = typeSign(
                      transaction.type
                    );

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-100 align-top last:border-none"
                      >
                        <td className="px-4 py-4 text-sm text-slate-500">
                          {new Date(
                            transaction.created_at
                          ).toLocaleString("en-BD")}
                        </td>

                        <td className="px-4 py-4">
                          {profile ? (
                            <>
                              <Link
                                href={`/admin/users/${transaction.user_id}`}
                                className="font-semibold text-blue-600"
                              >
                                {profile.full_name}
                              </Link>

                              <p className="mt-1 text-xs text-slate-500">
                                {profile.email}
                              </p>
                            </>
                          ) : (
                            <p className="font-mono text-xs text-slate-500">
                              {transaction.user_id}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-slate-600">
                          {transaction.reference}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {transaction.type}
                          </span>
                        </td>

                        <td className="px-4 py-4">
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
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                              transaction.status
                            )}`}
                          >
                            {transaction.status}
                          </span>
                        </td>

                        <td className="max-w-[320px] px-4 py-4 text-sm text-slate-600">
                          {transaction.description || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}