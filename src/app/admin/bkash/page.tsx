import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminBkashPage() {
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

  const { data: rows, error } = await supabase
    .from("bkash_test_transactions")
    .select(`
      id,
      bkash_number,
      transaction_id,
      amount_poisha,
      status,
      used_by,
      used_at,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  function formatMoney(poisha: number) {
    return (Number(poisha) / 100).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function statusStyle(status: string) {
    if (status === "UNUSED") {
      return "bg-green-100 text-green-700";
    }

    if (status === "USED") {
      return "bg-blue-100 text-blue-700";
    }

    if (status === "INVALID") {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  const unusedCount =
    rows?.filter((row) => row.status === "UNUSED").length ?? 0;

  const usedCount =
    rows?.filter((row) => row.status === "USED").length ?? 0;

  const invalidCount =
    rows?.filter((row) => row.status === "INVALID").length ?? 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — Simulated bKash Transactions
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
              href="/admin/bkash/new"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add Test Transaction
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
            Test bKash Transactions
          </h2>

          <p className="mt-2 text-slate-500">
            View and manage simulated deposit transaction records.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Unused</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {unusedCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Used</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {usedCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Invalid</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {invalidCount}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow">
          {error ? (
            <div className="rounded-2xl bg-red-50 p-5 text-red-700">
              Unable to load test transactions.
            </div>
          ) : !rows || rows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">
              No test transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">bKash Number</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Used By</th>
                    <th className="px-4 py-3">Used At</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 last:border-none"
                    >
                      <td className="px-4 py-4">
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {row.transaction_id}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {row.bkash_number}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        ৳{formatMoney(row.amount_poisha)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {row.used_by ? (
                          <Link
                            href={`/admin/users/${row.used_by}`}
                            className="font-mono text-xs font-semibold text-blue-600"
                          >
                            {row.used_by}
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-500">
                        {row.used_at
                          ? new Date(row.used_at).toLocaleString("en-BD")
                          : "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-500">
                        {new Date(row.created_at).toLocaleString("en-BD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}