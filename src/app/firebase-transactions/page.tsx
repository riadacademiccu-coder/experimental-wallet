
import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatMoney(amountPoisha: number) {
  return (amountPoisha / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: unknown) {
  if (!(value instanceof Timestamp)) {
    return "Date unavailable";
  }

  return value.toDate().toLocaleString("en-BD", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTransactionDetails(type: string) {
  const creditTypes = [
    "ADMIN_CREDIT",
    "DEPOSIT",
    "BONUS",
    "REFUND",
    "TRANSFER_IN",
  ];

  const debitTypes = [
    "ADMIN_DEBIT",
    "WITHDRAWAL",
    "TRANSFER_OUT",
  ];

  if (creditTypes.includes(type)) {
    return {
      sign: "+",
      color: "text-emerald-400",
      background: "bg-emerald-400/10",
      icon: "↙",
    };
  }

  if (debitTypes.includes(type)) {
    return {
      sign: "-",
      color: "text-rose-400",
      background: "bg-rose-400/10",
      icon: "↗",
    };
  }

  return {
    sign: "",
    color: "text-white",
    background: "bg-white/10",
    icon: "↔",
  };
}

function getStatusClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "PENDING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "REJECTED":
    case "FAILED":
      return "border-rose-400/20 bg-rose-400/10 text-rose-300";
    default:
      return "border-white/10 bg-white/5 text-slate-300";
  }
}

export default async function FirebaseTransactionsPage() {
  const user = await getCurrentWalletUser();

  if (!user) {
    redirect("/firebase-login");
  }

  const snapshot = await getAdminDb()
    .collection("transactions")
    .where("user_id", "==", user.uid)
    .orderBy("created_at", "desc")
    .limit(25)
    .get();

  const transactions = snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      type:
        typeof data.type === "string"
          ? data.type
          : "UNKNOWN",
      amountPoisha:
        typeof data.amount_poisha === "number" &&
        Number.isSafeInteger(data.amount_poisha) &&
        data.amount_poisha >= 0
          ? data.amount_poisha
          : null,
      status:
        typeof data.status === "string"
          ? data.status
          : "UNKNOWN",
      description:
        typeof data.description === "string"
          ? data.description
          : "",
      reference:
        typeof data.reference === "string"
          ? data.reference
          : doc.id,
      createdAt: formatDate(data.created_at),
    };
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-96 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <Link
            href="/firebase-dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950 shadow-lg shadow-emerald-500/10">
              KB
            </div>

            <div>
              <p className="text-lg font-extrabold tracking-tight">
                Kids Bank Ltd
              </p>
              <p className="text-xs text-slate-400">
                Personal Banking
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-3">
            <Link
              href="/firebase-dashboard"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/firebase-transactions"
              aria-current="page"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300"
            >
              Transactions
            </Link>

            <Link
              href="/firebase-logout"
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Logout
            </Link>
          </nav>
        </header>

        <section className="pb-8 pt-12 sm:pt-16">
          <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Your activity
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Transaction
            <span className="text-emerald-400"> History</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Explore your latest wallet activity, payment
            references and transaction statuses in one place.
          </p>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Recent activity
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Your 25 most recent transaction records
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">
              {transactions.length} shown
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10 text-4xl text-emerald-300">
                ↗
              </div>

              <h3 className="mt-7 text-2xl font-extrabold">
                No transactions yet
              </h3>

              <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
                Once wallet transactions are enabled and
                completed, your activity will appear here
                automatically.
              </p>

              <Link
                href="/firebase-dashboard"
                className="mt-8 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:brightness-110"
              >
                Back to dashboard →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {transactions.map((transaction) => {
                const details = getTransactionDetails(
                  transaction.type
                );

                return (
                  <article
                    key={transaction.id}
                    className="flex flex-col gap-4 py-6 transition sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold ${details.background} ${details.color}`}
                      >
                        {details.icon}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-white">
                          {transaction.type.replaceAll("_", " ")}
                        </h3>

                        {transaction.description && (
                          <p className="mt-1 break-words text-sm text-slate-400">
                            {transaction.description}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          {transaction.createdAt}
                        </p>

                        <p className="mt-1 break-all text-xs text-slate-500">
                          Ref: {transaction.reference}
                        </p>
                      </div>
                    </div>

                    <div className="pl-16 sm:pl-0 sm:text-right">
                      <p
                        className={`text-xl font-extrabold tabular-nums ${details.color}`}
                      >
                        {transaction.amountPoisha === null
                          ? "Amount unavailable"
                          : `${details.sign}৳${formatMoney(
                              transaction.amountPoisha
                            )}`}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                          transaction.status
                        )}`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </article>
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
