import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import AgentsManager, { type AgentRecord } from "./AgentsManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function asDate(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

export default async function FirebaseAdminAgentsPage() {
  const admin = await getCurrentWalletUser();

  if (!admin) {
    redirect("/firebase-login");
  }

  if (admin.role !== "ADMIN") {
    redirect("/firebase-dashboard");
  }

  // Admin SDK access is server-side only. Firestore browser rules stay locked.
  const snapshot = await getAdminDb()
    .collection("agents")
    .orderBy("created_at", "desc")
    .limit(100)
    .get();

  const agents: AgentRecord[] = snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      name: asText(data.name, "Unnamed agent"),
      phone: asText(data.phone, "Not provided"),
      area: asText(data.area, "Not provided"),
      status: data.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      verified: data.verified === true,
      createdAt: asDate(data.created_at),
    };
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-emerald-400/[0.08] blur-[130px]" />
      <div className="pointer-events-none absolute -right-40 top-[360px] h-[480px] w-[480px] rounded-full bg-cyan-400/[0.07] blur-[130px]" />
      <div className="pointer-events-none absolute left-1/3 top-0 h-[420px] w-[420px] rounded-full bg-indigo-500/[0.055] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <Link href="/firebase-admin" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-400 font-black text-slate-950 shadow-lg shadow-emerald-400/10">
              KB
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Kids Bank Ltd</p>
              <p className="text-xs text-slate-400">Administrator Workspace</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Link href="/firebase-admin" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
              Dashboard
            </Link>
            <Link href="/firebase-admin/users" className="rounded-xl px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
              Users
            </Link>
            <span aria-current="page" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-emerald-300">
              Agents
            </span>
            <Link href="/firebase-logout" className="rounded-xl border border-white/10 px-4 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
              Logout
            </Link>
          </nav>
        </header>

        <section className="pb-9 pt-12 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Operations / Agent network
          </span>

          <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Agent <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Register withdrawal agents, review verification status, and control which agents can accept new requests.
              </p>
            </div>
            <Link href="/firebase-admin" className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10">
              ← Back to Admin
            </Link>
          </div>
        </section>

        <AgentsManager initialAgents={agents} />

        <footer className="py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
