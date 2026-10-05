import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type TransactionFilter =
  | "ALL"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "BONUS"
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT"
  | "REFUND";

type PageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

const filters: {
  label: string;
  value: TransactionFilter;
}[] = [
  {
    label: "All",
    value: "ALL",
  },
  {
    label: "Deposit",
    value: "DEPOSIT",
  },
  {
    label: "Withdrawal",
    value: "WITHDRAWAL",
  },
  {
    label: "Bonus",
    value: "BONUS",
  },
  {
    label: "Admin Credit",
    value: "ADMIN_CREDIT",
  },
  {
    label: "Admin Debit",
    value: "ADMIN_DEBIT",
  },
  {
    label: "Refund",
    value: "REFUND",
  },
];

export default async function TransactionsPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  const requestedFilter =
    params.type?.toUpperCase() ?? "ALL";

  const validFilter = filters.some(
    (filter) => filter.value === requestedFilter
  );

  const activeFilter: TransactionFilter =
    validFilter
      ? (requestedFilter as TransactionFilter)
      : "ALL";

  let query = supabase
    .from("transactions")
    .select(
      `
      id,
      reference,
      type,
      amount_poisha,
      status,
      description,
      created_at
      `
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (activeFilter !== "ALL") {
    query = query.eq("type", activeFilter);
  }

  const { data: transactions, error } = await query;

  function formatMoney(amountPoisha: number) {
    return (amountPoisha / 100).toLocaleString(
      "en-BD",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  function getTransactionSign(type: string) {
    if (
      type === "DEPOSIT" ||
      type === "BONUS" ||
      type === "ADMIN_CREDIT" ||
      type === "REFUND"
    ) {
      return "+";
    }

    if (
      type === "WITHDRAWAL" ||
      type === "ADMIN_DEBIT"
    ) {
      return "-";
    }

    return "";
  }

  function getAmountColor(type: string) {
    const sign = getTransactionSign(type);

    if (sign === "+") {
      return "text-green-600";
    }

    if (sign === "-") {
      return "text-red-600";
    }

    return "text-slate-900";
  }

  function getStatusStyle(status: string) {
    if (status === "COMPLETED") {
      return "bg-green-100 text-green-700";
    }

    if (status === "PENDING") {
      return "bg-amber-100 text-amber-700";
    }

    if (
      status === "FAILED" ||
      status === "CANCELLED"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (status === "REVERSED") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Transaction History
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
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Transactions
            </Link>

            <Link
              href="/profile"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">
            Transactions
          </h2>

          <p className="mt-2 text-slate-500">
            View and filter your wallet activity.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-3xl bg-white p-5 shadow">
          <p className="mb-4 text-sm font-semibold text-slate-700">
            Filter by transaction type
          </p>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active =
                activeFilter === filter.value;

              const href =
                filter.value === "ALL"
                  ? "/transactions"
                  : `/transactions?type=${filter.value}`;

              return (
                <Link
                  key={filter.value}
                  href={href}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Transactions */}
        <div className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {activeFilter === "ALL"
                  ? "All Transactions"
                  : filters.find(
                      (filter) =>
                        filter.value === activeFilter
                    )?.label}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {transactions?.length ?? 0} transaction
                {(transactions?.length ?? 0) === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            {activeFilter !== "ALL" && (
              <Link
                href="/transactions"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear Filter
              </Link>
            )}
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl bg-red-50 p-5">
              <p className="font-semibold text-red-700">
                Unable to load transactions.
              </p>

              <p className="mt-1 text-sm text-red-600">
                Please refresh the page and try again.
              </p>
            </div>
          ) : !transactions ||
            transactions.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center">
              <p className="font-semibold text-slate-700">
                No transactions found.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Transactions matching this filter will
                appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-sm text-slate-500">
                      <th className="px-4 py-3">
                        Date
                      </th>

                      <th className="px-4 py-3">
                        Transaction ID
                      </th>

                      <th className="px-4 py-3">
                        Type
                      </th>

                      <th className="px-4 py-3">
                        Amount
                      </th>

                      <th className="px-4 py-3">
                        Status
                      </th>

                      <th className="px-4 py-3">
                        Description
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map(
                      (transaction) => {
                        const sign =
                          getTransactionSign(
                            transaction.type
                          );

                        return (
                          <tr
                            key={transaction.id}
                            className="border-b border-slate-100 last:border-none"
                          >
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {new Date(
                                transaction.created_at
                              ).toLocaleString(
                                "en-BD"
                              )}
                            </td>

                            <td className="px-4 py-4 font-mono text-sm text-slate-700">
                              {
                                transaction.reference
                              }
                            </td>

                            <td className="px-4 py-4 font-semibold text-slate-900">
                              {transaction.type.replaceAll(
                                "_",
                                " "
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`font-bold ${getAmountColor(
                                  transaction.type
                                )}`}
                              >
                                {sign}৳
                                {formatMoney(
                                  Number(
                                    transaction.amount_poisha
                                  )
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                                  transaction.status
                                )}`}
                              >
                                {
                                  transaction.status
                                }
                              </span>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-500">
                              {transaction.description ||
                                "-"}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="mt-6 space-y-4 md:hidden">
                {transactions.map((transaction) => {
                  const sign =
                    getTransactionSign(
                      transaction.type
                    );

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">
                            {transaction.type.replaceAll(
                              "_",
                              " "
                            )}
                          </p>

                          <p className="mt-1 font-mono text-xs text-slate-400">
                            {transaction.reference}
                          </p>
                        </div>

                        <p
                          className={`font-bold ${getAmountColor(
                            transaction.type
                          )}`}
                        >
                          {sign}৳
                          {formatMoney(
                            Number(
                              transaction.amount_poisha
                            )
                          )}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            transaction.status
                          )}`}
                        >
                          {transaction.status}
                        </span>

                        <p className="text-xs text-slate-400">
                          {new Date(
                            transaction.created_at
                          ).toLocaleString("en-BD")}
                        </p>
                      </div>

                      {transaction.description && (
                        <p className="mt-4 text-sm text-slate-500">
                          {
                            transaction.description
                          }
                        </p>
                      )}
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