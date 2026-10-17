import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import ProfileSettings from "./ProfileSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return words.slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "KB";
}

export default async function FirebaseProfilePage() {
  const user = await getCurrentWalletUser();
  if (!user) redirect("/firebase-login");

  const dashboardHref = user.role === "ADMIN" ? "/firebase-admin" : "/firebase-dashboard";
  const profileSnapshot = await getAdminDb().collection("profiles").doc(user.uid).get();
  const data = profileSnapshot.data();

  if (!profileSnapshot.exists || data?.user_id !== user.uid || data.status !== "ACTIVE") {
    redirect("/firebase-logout");
  }

  const name =
    typeof data.full_name === "string" && data.full_name.trim()
      ? data.full_name.trim()
      : user.fullName;
  const joined = data.created_at instanceof Timestamp
    ? data.created_at.toDate().toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute -left-36 top-0 h-[460px] w-[460px] rounded-full bg-emerald-400/[0.09] blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-[520px] w-[520px] rounded-full bg-teal-400/[0.06] blur-[130px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href={dashboardHref} className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950 shadow-lg shadow-emerald-400/15">KB</span>
            <span>
              <span className="block text-lg font-extrabold">Kids Bank Ltd</span>
              <span className="block text-xs text-slate-400">Account &amp; Security</span>
            </span>
          </Link>
          <nav aria-label="Account navigation" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Link href={dashboardHref} className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">Dashboard</Link>
            <Link href="/firebase-transactions" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">History</Link>
            <Link href="/firebase-logout" className="rounded-xl border border-white/10 px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">Logout</Link>
          </nav>
        </header>

        <section className="pb-9 pt-12 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/[0.09] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.17em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Your account
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
            Profile <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">&amp; Settings</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Manage the name shown on your wallet and keep your account secure.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-start">
          <section className="min-w-0">
            <ProfileSettings initialFullName={name} email={user.email} />
          </section>

          <aside className="space-y-5">
            <section className="relative overflow-hidden rounded-[30px] border border-emerald-400/15 bg-gradient-to-br from-[#143d3c] via-[#102938] to-[#142238] p-7 shadow-xl shadow-black/20">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/10" />
              <div className="relative flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-400 text-xl font-black text-slate-950">{getInitials(name)}</span>
                <div className="min-w-0">
                  <p className="break-words text-lg font-extrabold">{name}</p>
                  <p className="mt-1 break-all text-xs text-slate-300">{user.email}</p>
                </div>
              </div>
              <div className="relative mt-7 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">Active account</span>
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-slate-200">{user.role === "ADMIN" ? "Administrator" : "Wallet member"}</span>
              </div>
              {joined && <p className="relative mt-6 text-xs text-slate-300">Member since {joined}</p>}
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-7 backdrop-blur-xl">
              <h2 className="text-lg font-extrabold">Account protection</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <span className="text-slate-400">Email verification</span>
                  <span className="font-bold text-emerald-300">Verified ✓</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <span className="text-slate-400">Account status</span>
                  <span className="font-bold text-emerald-300">Active</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Sign-in method</span>
                  <span className="font-semibold text-slate-200">Email &amp; password</span>
                </div>
              </div>
            </section>

            <div className="rounded-[26px] border border-white/10 bg-slate-900/60 p-6 text-xs leading-6 text-slate-400">
              Kids Bank Ltd is a simulated wallet. Your profile settings do not enable real banking or payments.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
