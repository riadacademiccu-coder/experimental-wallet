"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserInfo = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: "ACTIVE" | "PENDING" | "FROZEN" | "SUSPENDED";
};

type AccountStatus = "ACTIVE" | "PENDING" | "FROZEN" | "SUSPENDED";

export default function AdminUserStatusPage() {
  const supabase = createClient();
  const params = useParams();
  const userId = params.id as string;

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<AccountStatus>("ACTIVE");
  const [reason, setReason] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function loadUser() {
    setPageLoading(true);
    setMessage("");

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      window.location.href = "/login";
      return;
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", currentUser.id)
      .single();

    if (
      !adminProfile ||
      adminProfile.role !== "ADMIN" ||
      adminProfile.status !== "ACTIVE"
    ) {
      window.location.href = "/dashboard";
      return;
    }

    const { data: profile, error } = await supabase
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

    if (error || !profile) {
      setMessage("User not found.");
      setPageLoading(false);
      return;
    }

    setUserInfo(profile as UserInfo);
    setSelectedStatus(profile.status as AccountStatus);
    setPageLoading(false);
  }

  useEffect(() => {
    loadUser();
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!userInfo) return;

    setMessage("");
    setSuccess(false);

    if (reason.trim().length < 3) {
      setMessage("Please provide a reason.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc(
      "admin_set_user_status",
      {
        p_user_id: userId,
        p_status: selectedStatus,
        p_reason: reason.trim(),
      }
    );

    setLoading(false);

    if (error) {
      if (
        error.message.includes(
          "You cannot change your own account status"
        )
      ) {
        setMessage(
          "You cannot change your own admin account status."
        );
        return;
      }

      if (error.message.includes("Admin access required")) {
        setMessage("Admin access required.");
        return;
      }

      if (error.message.includes("Reason is required")) {
        setMessage("Please provide a reason.");
        return;
      }

      setMessage(
        error.message || "Unable to update account status."
      );
      return;
    }

    setSuccess(true);
    setMessage(
      `Account status changed to ${selectedStatus}.`
    );

    setReason("");

    await loadUser();
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

  function statusDescription(status: AccountStatus) {
    if (status === "ACTIVE") {
      return "User can normally use the account.";
    }

    if (status === "FROZEN") {
      return "User keeps the account but financial actions are blocked.";
    }

    if (status === "SUSPENDED") {
      return "Account is suspended and should not be used for financial actions.";
    }

    return "Account is waiting for admin review or activation.";
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">
          Loading...
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
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — User Status
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

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Account
            </p>

            <h2 className="mt-1 text-3xl font-bold text-slate-900">
              {userInfo.full_name}
            </h2>

            <p className="mt-2 text-slate-500">
              {userInfo.email}
            </p>

            <p className="text-sm text-slate-400">
              {userInfo.phone || "No phone number"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Current Status
            </p>

            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusStyle(
                  userInfo.status
                )}`}
              >
                {userInfo.status}
              </span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                New Account Status
              </label>

              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(
                    e.target.value as AccountStatus
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
              >
                <option value="ACTIVE">
                  ACTIVE
                </option>

                <option value="FROZEN">
                  FROZEN
                </option>

                <option value="SUSPENDED">
                  SUSPENDED
                </option>

                <option value="PENDING">
                  PENDING
                </option>
              </select>

              <p className="mt-2 text-sm text-slate-500">
                {statusDescription(selectedStatus)}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Reason
              </label>

              <textarea
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                placeholder="Example: Temporarily frozen for account review"
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                required
              />
            </div>

            {message && (
              <div
                className={`rounded-xl p-4 text-sm ${
                  success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                selectedStatus === userInfo.status
              }
              className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Updating..."
                : selectedStatus === userInfo.status
                ? "Status Already Selected"
                : `Change Status to ${selectedStatus}`}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}