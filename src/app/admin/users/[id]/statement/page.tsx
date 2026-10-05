"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserInfo = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
};

type Transaction = {
  id: string;
  reference: string;
  type: string;
  amount_poisha: number;
  status: string;
  description: string | null;
  created_at: string;
};

export default function UserStatementPage() {
  const supabase = createClient();
  const params = useParams();

  const userId = params.id as string;

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [heldBalance, setHeldBalance] = useState(0);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      setPageLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
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
        window.location.href = "/dashboard";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone,
          status
        `)
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        setMessage("User not found.");
        setPageLoading(false);
        return;
      }

      const { data: account } = await supabase
        .from("accounts")
        .select(`
          available_balance_poisha,
          held_balance_poisha
        `)
        .eq("user_id", userId)
        .single();

      const { data: transactionRows, error: transactionError } =
        await supabase
          .from("transactions")
          .select(`
            id,
            reference,
            type,
            amount_poisha,
            status,
            description,
            created_at
          `)
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          });

      if (transactionError) {
        setMessage("Unable to load transactions.");
        setPageLoading(false);
        return;
      }

      setUserInfo(profile as UserInfo);

      setAvailableBalance(
        Number(account?.available_balance_poisha ?? 0)
      );

      setHeldBalance(
        Number(account?.held_balance_poisha ?? 0)
      );

      setTransactions(
        (transactionRows || []) as Transaction[]
      );

      setPageLoading(false);
    }

    loadData();
  }, [userId]);

  function formatMoney(poisha: number) {
    return (Number(poisha) / 100).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function isCredit(type: string) {
    return [
      "DEPOSIT",
      "BONUS",
      "ADMIN_CREDIT",
      "REFUND",
    ].includes(type);
  }

  function isDebit(type: string) {
    return [
      "WITHDRAWAL",
      "ADMIN_DEBIT",
    ].includes(type);
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.created_at);

      if (fromDate) {
        const start = new Date(`${fromDate}T00:00:00`);

        if (transactionDate < start) {
          return false;
        }
      }

      if (toDate) {
        const end = new Date(`${toDate}T23:59:59.999`);

        if (transactionDate > end) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, fromDate, toDate]);

  const completedTransactions = filteredTransactions.filter(
    (transaction) => transaction.status === "COMPLETED"
  );

  const totalCredits = completedTransactions
    .filter((transaction) => isCredit(transaction.type))
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount_poisha),
      0
    );

  const totalDebits = completedTransactions
    .filter((transaction) => isDebit(transaction.type))
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount_poisha),
      0
    );

  const netMovement = totalCredits - totalDebits;

  function resetFilter() {
    setFromDate("");
    setToDate("");
  }

  function printStatement() {
    window.print();
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">
          Loading statement...
        </p>
      </main>
    );
  }

  if (!userInfo) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow">
          <p className="text-red-600">
            {message || "User not found."}
          </p>

          <Link
            href="/admin/users"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            Back to Users
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          html,
          body {
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          * {
            box-sizing: border-box !important;
          }

          .no-print {
            display: none !important;
          }

          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-card {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          .statement-table-wrapper {
            width: 100% !important;
            overflow: visible !important;
          }

          .statement-table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            font-size: 8.5px !important;
          }

          .statement-table th,
          .statement-table td {
            padding: 5px 3px !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            vertical-align: top !important;
          }

          .statement-table th:nth-child(1),
          .statement-table td:nth-child(1) {
            width: 15% !important;
          }

          .statement-table th:nth-child(2),
          .statement-table td:nth-child(2) {
            width: 16% !important;
          }

          .statement-table th:nth-child(3),
          .statement-table td:nth-child(3) {
            width: 12% !important;
          }

          .statement-table th:nth-child(4),
          .statement-table td:nth-child(4) {
            width: 23% !important;
          }

          .statement-table th:nth-child(5),
          .statement-table td:nth-child(5) {
            width: 10% !important;
          }

          .statement-table th:nth-child(6),
          .statement-table td:nth-child(6) {
            width: 12% !important;
          }

          .statement-table th:nth-child(7),
          .statement-table td:nth-child(7) {
            width: 12% !important;
          }

          table {
            page-break-inside: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          .summary-grid {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 8px !important;
          }

          .summary-grid p {
            font-size: 9px !important;
          }

          .summary-grid .summary-value {
            font-size: 14px !important;
          }

          .account-info-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 10px !important;
          }

          .statement-header {
            page-break-inside: avoid;
          }

          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        }
      `}</style>

      <main className="min-h-screen bg-slate-50">
        <nav className="no-print border-b bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Kids Bank Ltd
              </h1>

              <p className="text-sm text-slate-500">
                Admin — User Statement
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/users/${userId}`}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Back to User
              </Link>

              <Link
                href="/admin/users"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                All Users
              </Link>
            </div>
          </div>
        </nav>

        <div className="print-container mx-auto max-w-7xl px-6 py-10">
          <div className="no-print mb-8 rounded-3xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-slate-900">
              Statement Options
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={printStatement}
                className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
              >
                Print Statement
              </button>

              <button
                type="button"
                onClick={resetFilter}
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700"
              >
                Clear Dates
              </button>
            </div>
          </div>

          <div className="print-card rounded-3xl bg-white p-8 shadow">
            <div className="statement-header border-b border-slate-200 pb-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Kids Bank Ltd
                  </h1>

                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Account Statement
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-sm text-slate-500">
                    Generated
                  </p>

                  <p className="font-semibold text-slate-900">
                    {new Date().toLocaleString("en-BD")}
                  </p>
                </div>
              </div>
            </div>

            <div className="account-info-grid grid gap-6 border-b border-slate-200 py-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Account Holder
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {userInfo.full_name}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Email
                </p>

                <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                  {userInfo.email}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Phone
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {userInfo.phone || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {userInfo.status}
                </p>
              </div>
            </div>

            <div className="summary-grid grid gap-5 border-b border-slate-200 py-6 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs text-slate-500">
                  Available Balance
                </p>

                <p className="summary-value mt-1 text-xl font-bold text-slate-900">
                  ৳{formatMoney(availableBalance)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Held Balance
                </p>

                <p className="summary-value mt-1 text-xl font-bold text-slate-900">
                  ৳{formatMoney(heldBalance)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Total Credits
                </p>

                <p className="summary-value mt-1 text-xl font-bold text-green-600">
                  ৳{formatMoney(totalCredits)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Total Debits
                </p>

                <p className="summary-value mt-1 text-xl font-bold text-red-600">
                  ৳{formatMoney(totalDebits)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Net Movement
                </p>

                <p
                  className={`summary-value mt-1 text-xl font-bold ${
                    netMovement >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {netMovement >= 0 ? "+" : "-"}৳
                  {formatMoney(Math.abs(netMovement))}
                </p>
              </div>
            </div>

            <div className="py-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Transaction Statement
                </h2>

                <p className="text-sm text-slate-500">
                  {fromDate || toDate
                    ? `${fromDate || "Beginning"} to ${
                        toDate || "Present"
                      }`
                    : "All transactions"}
                </p>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-500">
                  No transactions found for this period.
                </div>
              ) : (
                <div className="statement-table-wrapper mt-6 overflow-x-auto">
                  <table className="statement-table w-full min-w-[850px] text-left">
                    <thead>
                      <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">
                          Date
                        </th>

                        <th className="px-3 py-3">
                          Reference
                        </th>

                        <th className="px-3 py-3">
                          Type
                        </th>

                        <th className="px-3 py-3">
                          Description
                        </th>

                        <th className="px-3 py-3">
                          Status
                        </th>

                        <th className="px-3 py-3 text-right">
                          Credit
                        </th>

                        <th className="px-3 py-3 text-right">
                          Debit
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTransactions.map((transaction) => {
                        const credit =
                          transaction.status === "COMPLETED" &&
                          isCredit(transaction.type);

                        const debit =
                          transaction.status === "COMPLETED" &&
                          isDebit(transaction.type);

                        return (
                          <tr
                            key={transaction.id}
                            className="border-b border-slate-100 text-sm"
                          >
                            <td className="px-3 py-4 text-slate-600">
                              {new Date(
                                transaction.created_at
                              ).toLocaleString("en-BD")}
                            </td>

                            <td className="px-3 py-4 font-mono text-xs text-slate-600">
                              {transaction.reference}
                            </td>

                            <td className="px-3 py-4 font-semibold text-slate-800">
                              {transaction.type.replaceAll(
                                "_",
                                " "
                              )}
                            </td>

                            <td className="px-3 py-4 text-slate-600">
                              {transaction.description || "-"}
                            </td>

                            <td className="px-3 py-4">
                              {transaction.status}
                            </td>

                            <td className="px-3 py-4 text-right font-semibold text-green-600">
                              {credit
                                ? `৳${formatMoney(
                                    transaction.amount_poisha
                                  )}`
                                : "-"}
                            </td>

                            <td className="px-3 py-4 text-right font-semibold text-red-600">
                              {debit
                                ? `৳${formatMoney(
                                    transaction.amount_poisha
                                  )}`
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    User ID
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-slate-600">
                    {userInfo.id}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-sm font-bold text-slate-900">
                    Kids Bank Ltd
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Generated by administration
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}