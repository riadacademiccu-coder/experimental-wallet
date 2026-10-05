import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function AdminUsersPage({
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
  const search = params.search?.trim() ?? "";

  let query = supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      status,
      created_at,
      accounts (
        available_balance_poisha,
        held_balance_poisha
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data: users, error } = await query;

  function formatMoney(poisha: number) {
    return (Number(poisha) / 100).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function statusStyle(status: string) {
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
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — User Management
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
              href="/dashboard"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              User Dashboard
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
            Users
          </h2>

          <p className="mt-2 text-slate-500">
            View users, balances, status and account details.
          </p>
        </div>

        <form
          method="GET"
          className="mb-6 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow sm:flex-row"
        >
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name, email or phone"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
          >
            Search
          </button>

          {search && (
            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="rounded-3xl bg-white p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              All Users
            </h3>

            <p className="text-sm text-slate-500">
              {users?.length ?? 0} users
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-50 p-5 text-red-700">
              Unable to load users.
            </div>
          ) : !users || users.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">
              No users found.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1000px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-sm text-slate-500">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Available</th>
                      <th className="px-4 py-3">Held</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((profile) => {
                      const account = Array.isArray(profile.accounts)
                        ? profile.accounts[0]
                        : profile.accounts;

                      return (
                        <tr
                          key={profile.id}
                          className="border-b border-slate-100 last:border-none"
                        >
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">
                              {profile.full_name}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {profile.email}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {profile.phone || "-"}
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {profile.role}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                                profile.status
                              )}`}
                            >
                              {profile.status}
                            </span>
                          </td>

                          <td className="px-4 py-4 font-semibold text-slate-900">
                            ৳
                            {formatMoney(
                              account?.available_balance_poisha ?? 0
                            )}
                          </td>

                          <td className="px-4 py-4 font-semibold text-slate-700">
                            ৳
                            {formatMoney(
                              account?.held_balance_poisha ?? 0
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/admin/users/${profile.id}`}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 md:hidden">
                {users.map((profile) => {
                  const account = Array.isArray(profile.accounts)
                    ? profile.accounts[0]
                    : profile.accounts;

                  return (
                    <div
                      key={profile.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">
                            {profile.full_name}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {profile.email}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            profile.status
                          )}`}
                        >
                          {profile.status}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400">
                            Available
                          </p>

                          <p className="mt-1 font-bold text-slate-900">
                            ৳
                            {formatMoney(
                              account?.available_balance_poisha ?? 0
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Held
                          </p>

                          <p className="mt-1 font-bold text-slate-900">
                            ৳
                            {formatMoney(
                              account?.held_balance_poisha ?? 0
                            )}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/admin/users/${profile.id}`}
                        className="mt-5 block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
                      >
                        View User
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}