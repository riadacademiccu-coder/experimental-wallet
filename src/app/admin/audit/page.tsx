import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    action?: string;
  }>;
};

export default async function AdminAuditPage({
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
  const actionFilter = params.action?.trim() ?? "";

  let query = supabase
    .from("admin_audit_logs")
    .select(`
      id,
      admin_id,
      action,
      target_user_id,
      description,
      amount_poisha,
      metadata,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  if (actionFilter) {
    query = query.eq("action", actionFilter);
  }

  const { data: logs, error } = await query;

  function formatMoney(poisha: number | null) {
    if (poisha === null) return "-";

    return (Number(poisha) / 100).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
              Admin — Audit Logs
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">
            Audit Logs
          </h2>

          <p className="mt-2 text-slate-500">
            Review important administrator actions.
          </p>
        </div>

        <form
          method="GET"
          className="mb-6 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow sm:flex-row"
        >
          <input
            type="text"
            name="action"
            defaultValue={actionFilter}
            placeholder="Example: BALANCE_CREDITED"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
          >
            Filter
          </button>

          {actionFilter && (
            <Link
              href="/admin/audit"
              className="rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="rounded-3xl bg-white p-6 shadow">
          {error ? (
            <div className="rounded-2xl bg-red-50 p-5 text-red-700">
              Unable to load audit logs.
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">
              No audit logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Target User</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Metadata</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 align-top last:border-none"
                    >
                      <td className="px-4 py-4 text-sm text-slate-500">
                        {new Date(log.created_at).toLocaleString("en-BD")}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="break-all font-mono text-xs text-slate-600">
                          {log.admin_id}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {log.target_user_id ? (
                          <Link
                            href={`/admin/users/${log.target_user_id}`}
                            className="break-all font-mono text-xs font-semibold text-blue-600"
                          >
                            {log.target_user_id}
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {log.amount_poisha !== null
                          ? `৳${formatMoney(log.amount_poisha)}`
                          : "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {log.description || "-"}
                      </td>

                      <td className="px-4 py-4">
                        <pre className="max-w-[320px] overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
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