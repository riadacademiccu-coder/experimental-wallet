
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

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

function formatDate(value: unknown) {
  if (!(value instanceof Timestamp)) {
    return "Not available";
  }

  return value.toDate().toLocaleString("en-BD", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value
    : fallback;
}

function getTransactionSign(type: string) {
  if (
    ["DEPOSIT", "ADMIN_CREDIT", "BONUS", "REFUND", "TRANSFER_IN"].includes(
      type
    )
  ) {
    return "+";
  }

  if (
    ["WITHDRAWAL", "ADMIN_DEBIT", "TRANSFER_OUT"].includes(type)
  ) {
    return "-";
  }

  return "";
}

export default async function FirebaseAdminUserDetailsPage({
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

  const profileRef = db.collection("profiles").doc(id);
  const accountRef = db.collection("accounts").doc(id);

  const [profileSnapshot, accountSnapshot] = await Promise.all([
    profileRef.get(),
    accountRef.get(),
  ]);

  if (!profileSnapshot.exists) {
    notFound();
  }

  const profile = profileSnapshot.data();

  if (!profile || profile.user_id !== id) {
    notFound();
  }

  const account = accountSnapshot.data();

  const validAccount =
    accountSnapshot.exists && account?.user_id === id;

  const transactionSnapshot = await db
    .collection("transactions")
    .where("user_id", "==", id)
    .orderBy("created_at", "desc")
    .limit(10)
    .get();

  const transactions = transactionSnapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,
      type: getText(data.type, "UNKNOWN"),
      amount: data.amount_poisha,
      status: getText(data.status, "UNKNOWN"),
      description: getText(data.description, "No description"),
      reference: getText(data.reference, document.id),
      createdAt: data.created_at,
    };
  });

  const fullName = getText(profile.full_name, "Unknown User");
  const email = getText(profile.email, "No email");
  const role = getText(profile.role, "UNKNOWN");
  const status = getText(profile.status, "UNKNOWN");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-emerald-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-96 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link
            href="/firebase-admin"
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950">
              KB
            </div>

            <div>
              <p className="text-lg font-extrabold">Kids Bank Ltd</p>
              <p className="text-xs text-slate-400">Administration</p>
            </div>
          </Link>

          <Link
            href="/firebase-admin/users"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            ← All Users
          </Link>
        </header>

        <section className="pb-8 pt-12">
          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            User Management
          </span>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Account <span className="text-emerald-400">Details</span>
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-400">
            Review account information, wallet balances,
            and recent transaction activity.
          </p>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10 text-3xl font-extrabold text-emerald-300">
              {fullName.trim().charAt(0).toUpperCase() || "U"}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="break-words text-3xl font-extrabold">
                {fullName}
              </h2>

              <p className="mt-2 break-all text-sm text-slate-400">
                {email}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  {status}
                </span>

                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-300">
                  {role}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Joined
              </p>
              <p className="mt-2 text-sm font-semibold">
                {formatDate(profile.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Firebase User ID
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-300">
                {id}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-5 text-xl font-bold">Wallet Overview</h2>

          {!validAccount && (
            <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-200">
              This user's wallet record is missing or does not
              match their Firebase profile.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[26px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 p-6">
              <p className="text-sm text-emerald-200">
                Available Balance
              </p>
              <p className="mt-4 break-words text-3xl font-extrabold tabular-nums">
                {validAccount
                  ? formatMoney(account?.available_balance_poisha)
                  : "Unavailable"}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-6">
              <p className="text-sm text-slate-400">Held Balance</p>
              <p className="mt-4 break-words text-3xl font-extrabold tabular-nums">
                {validAccount
                  ? formatMoney(account?.held_balance_poisha)
                  : "Unavailable"}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-6">
              <p className="text-sm text-slate-400">
                Recent Transactions
              </p>
              <p className="mt-4 text-3xl font-extrabold">
                {transactions.length}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Last 10 records maximum
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
          <div className="border-b border-white/10 p-6 sm:p-8">
            <h2 className="text-xl font-bold">
              Recent Transaction Activity
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Latest wallet records for this account
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-bold">
                No transactions found
              </p>
              <p className="mt-2 text-sm text-slate-400">
                This account has no recorded wallet activity yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {transactions.map((item) => {
                const sign = getTransactionSign(item.type);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
                  >
                    <div className="min-w-0">
                      <p className="font-bold">
                        {item.type.replaceAll("_", " ")}
                      </p>

                      <p className="mt-2 break-words text-sm text-slate-400">
                        {item.description}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(item.createdAt)}
                      </p>

                      <p className="mt-1 break-all text-xs text-slate-500">
                        Ref: {item.reference}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p
                        className={`text-xl font-extrabold tabular-nums ${
                          sign === "+"
                            ? "text-emerald-300"
                            : sign === "-"
                              ? "text-rose-300"
                              : "text-white"
                        }`}
                      >
                        {sign}
                        {formatMoney(item.amount)}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {item.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
