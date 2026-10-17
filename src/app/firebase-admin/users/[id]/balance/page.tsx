
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import AdjustmentForm from "./AdjustmentForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return "Unavailable";
  }

  return `৳${(value / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminBalancePage({
  params,
}: PageProps) {
  const admin = await getCurrentWalletUser();

  if (!admin) {
    redirect("/firebase-login");
  }

  if (admin.role !== "ADMIN") {
    redirect("/firebase-dashboard");
  }

  const { id } = await params;

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    notFound();
  }

  const db = getAdminDb();

  const [profileSnapshot, accountSnapshot] =
    await Promise.all([
      db.collection("profiles").doc(id).get(),
      db.collection("accounts").doc(id).get(),
    ]);

  const profile = profileSnapshot.data();
  const account = accountSnapshot.data();

  if (!profileSnapshot.exists || profile?.user_id !== id) {
    notFound();
  }

  const fullName =
    typeof profile.full_name === "string"
      ? profile.full_name
      : "Unknown user";

  const email =
    typeof profile.email === "string"
      ? profile.email
      : "No email";

  const status =
    typeof profile.status === "string"
      ? profile.status
      : "UNKNOWN";

  const validAccount =
    accountSnapshot.exists &&
    account?.user_id === id &&
    Number.isSafeInteger(account?.available_balance_poisha) &&
    account.available_balance_poisha >= 0 &&
    Number.isSafeInteger(account?.held_balance_poisha) &&
    account.held_balance_poisha >= 0;

  const canAdjust = status === "ACTIVE" && validAccount;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-4 py-7 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <Link
            href="/firebase-admin"
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950">
              KB
            </div>

            <div>
              <h1 className="text-lg font-extrabold">
                Kids Bank Ltd
              </h1>
              <p className="text-xs text-slate-400">
                Administrator Workspace
              </p>
            </div>
          </Link>

          <Link
            href={`/firebase-admin/users/${id}`}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            ← User Details
          </Link>
        </header>

        <section className="pb-8 pt-12">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            Administrator Controls
          </span>

          <h2 className="mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Manage <span className="text-emerald-400">Balance</span>
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-400">
            Review the selected account and apply an
            authorized wallet adjustment.
          </p>
        </section>

        <section className="mb-7 rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Selected account
              </p>

              <h3 className="mt-3 break-words text-2xl font-extrabold">
                {fullName}
              </h3>

              <p className="mt-2 break-all text-sm text-slate-400">
                {email}
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200">
              {status}
            </span>
          </div>

          <div className="mt-7 grid gap-4 border-t border-white/10 pt-7 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07] p-5">
              <p className="text-sm text-slate-400">
                Available balance
              </p>
              <p className="mt-3 break-words text-3xl font-extrabold text-emerald-300">
                {validAccount
                  ? formatMoney(account?.available_balance_poisha)
                  : "Unavailable"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <p className="text-sm text-slate-400">
                Held balance
              </p>
              <p className="mt-3 break-words text-3xl font-extrabold">
                {validAccount
                  ? formatMoney(account?.held_balance_poisha)
                  : "Unavailable"}
              </p>
            </div>
          </div>
        </section>

        {canAdjust ? (
          <AdjustmentForm
            targetUid={id}
            targetName={fullName}
          />
        ) : (
          <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-7 text-amber-200">
            <h3 className="text-xl font-bold">
              Balance adjustments unavailable
            </h3>

            <p className="mt-3 text-sm leading-7">
              This account is not active or its wallet
              record is missing or invalid. No adjustment
              can be submitted until the issue is resolved.
            </p>
          </div>
        )}

        <footer className="py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
