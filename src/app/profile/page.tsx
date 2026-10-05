import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, status, created_at")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Profile
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
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

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow">
          <h2 className="text-2xl font-bold text-slate-900">
            My Profile
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">
                Full Name
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile?.full_name ?? "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Email
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile?.email ?? user.email ?? "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Phone Number
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile?.phone ?? "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Account Status
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile?.status ?? "UNKNOWN"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Account ID
              </p>

              <p className="mt-1 break-all font-mono text-sm text-slate-900">
                {user.id}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Account Created
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleString("en-BD")
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}