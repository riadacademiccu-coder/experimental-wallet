import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAgentsPage() {
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

  const { data: agents, error } = await supabase
    .from("agents")
    .select(
      `
      id,
      name,
      email,
      phone,
      status,
      verified,
      created_at
      `
    )
    .order("created_at", {
      ascending: false,
    });

  function statusStyle(status: string) {
    if (status === "ACTIVE") {
      return "bg-green-100 text-green-700";
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
              Admin — Agent Management
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
              href="/admin/agents/new"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add Agent
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
            Agents
          </h2>

          <p className="mt-2 text-slate-500">
            Manage withdrawal agents.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          {error ? (
            <div className="rounded-2xl bg-red-50 p-5 text-red-700">
              Unable to load agents.
            </div>
          ) : !agents || agents.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">
              No agents found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Verified</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {agents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="border-b border-slate-100 last:border-none"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {agent.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {agent.email}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {agent.phone || "-"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            agent.verified
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {agent.verified ? "VERIFIED" : "NOT VERIFIED"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            agent.status
                          )}`}
                        >
                          {agent.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-500">
                        {new Date(
                          agent.created_at
                        ).toLocaleString("en-BD")}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/agents/${agent.id}`}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Manage
                        </Link>
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