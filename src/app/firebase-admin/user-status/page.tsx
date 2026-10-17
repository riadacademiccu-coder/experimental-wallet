
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

import StatusManager from "./StatusManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminUserStatusPage() {
  const admin = await getCurrentWalletUser();

  if (!admin) {
    redirect("/firebase-login");
  }

  if (admin.role !== "ADMIN") {
    redirect("/firebase-dashboard");
  }

  const snapshot = await getAdminDb()
    .collection("profiles")
    .orderBy("created_at", "desc")
    .limit(30)
    .get();

  // Only regular users may be changed by this tool.
  const users = snapshot.docs
    .map((document) => {
      const data = document.data();

      if (
        data.role !== "USER" ||
        data.user_id !== document.id
      ) {
        return null;
      }

      return {
        id: document.id,
        fullName:
          typeof data.full_name === "string"
            ? data.full_name
            : "Unknown user",
        email:
          typeof data.email === "string"
            ? data.email
            : "No email",
        status:
          typeof data.status === "string"
            ? data.status
            : "UNKNOWN",
      };
    })
    .filter((user): user is NonNullable<typeof user> => user !== null);

  const activeCount = users.filter(
    (user) => user.status === "ACTIVE"
  ).length;

  const frozenCount = users.filter(
    (user) => user.status === "FROZEN"
  ).length;

  const suspendedCount = users.filter(
    (user) => user.status === "SUSPENDED"
  ).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-emerald-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 top-96 h-96 w-96 rounded-full bg-cyan-400/10 blur-[110px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link
            href="/firebase-admin"
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950">
              KB
            </div>

            <div>
              <p className="text-lg font-extrabold">
                Kids Bank Ltd
              </p>

              <p className="text-xs text-slate-400">
                Administrator Workspace
              </p>
            </div>
          </Link>

          <Link
            href="/firebase-admin/users"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            ← User Management
          </Link>
        </header>

        <section className="pb-8 pt-12">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            Access Management
          </span>

          <h1 className="mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Account{" "}
            <span className="text-emerald-400">
              Status Controls
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            Manage account access, review current statuses,
            and record administrator decisions.
          </p>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.06] p-6">
            <p className="text-sm text-emerald-200">
              Active users
            </p>

            <p className="mt-3 text-4xl font-extrabold text-emerald-300">
              {activeCount}
            </p>
          </div>

          <div className="rounded-[24px] border border-sky-400/15 bg-sky-400/[0.06] p-6">
            <p className="text-sm text-sky-200">
              Frozen users
            </p>

            <p className="mt-3 text-4xl font-extrabold text-sky-300">
              {frozenCount}
            </p>
          </div>

          <div className="rounded-[24px] border border-rose-400/15 bg-rose-400/[0.06] p-6">
            <p className="text-sm text-rose-200">
              Suspended users
            </p>

            <p className="mt-3 text-4xl font-extrabold text-rose-300">
              {suspendedCount}
            </p>
          </div>
        </section>

        <StatusManager initialUsers={users} />

        <footer className="py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
