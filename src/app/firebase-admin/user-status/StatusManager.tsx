
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AccountStatus = "ACTIVE" | "FROZEN" | "SUSPENDED";

type ManagedUser = {
  id: string;
  fullName: string;
  email: string;
  status: string;
};

type Props = {
  initialUsers: ManagedUser[];
};

function statusStyle(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
    case "FROZEN":
      return "border-sky-400/25 bg-sky-400/10 text-sky-300";
    case "SUSPENDED":
      return "border-rose-400/25 bg-rose-400/10 text-rose-300";
    default:
      return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  }
}

export default function StatusManager({ initialUsers }: Props) {
  const router = useRouter();

  const [users, setUsers] = useState(initialUsers);

  const [selectedId, setSelectedId] = useState(
    initialUsers[0]?.id ?? ""
  );

  const [newStatus, setNewStatus] = useState<
    AccountStatus | ""
  >("");

  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedUser = users.find(
    (user) => user.id === selectedId
  );

  function resetMessages() {
    setError("");
    setSuccess("");
    setConfirmed(false);
  }

  function changeUser(id: string) {
    setSelectedId(id);
    setNewStatus("");
    setReason("");
    resetMessages();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    if (!selectedUser) {
      setError("Please select a user.");
      return;
    }

    if (
      newStatus !== "ACTIVE" &&
      newStatus !== "FROZEN" &&
      newStatus !== "SUSPENDED"
    ) {
      setError("Please select an account status.");
      return;
    }

    if (newStatus === selectedUser.status) {
      setError("This user already has that status.");
      return;
    }

    const cleanReason = reason.trim();

    if (
      cleanReason.length < 5 ||
      cleanReason.length > 200
    ) {
      setError(
        "Enter a reason between 5 and 200 characters."
      );
      return;
    }

    if (!confirmed) {
      setError("Please confirm your decision.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/firebase-admin/user-status",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetUid: selectedUser.id,
            status: newStatus,
            reason: cleanReason,
          }),
        }
      );

      const result: {
        success?: boolean;
        error?: string;
        changed?: boolean;
        newStatus?: string;
      } = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.error ?? "Unable to update account status."
        );
      }

      const updatedStatus = newStatus;

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === selectedUser.id
            ? { ...user, status: updatedStatus }
            : user
        )
      );

      setSuccess(
        result.changed === false
          ? "This account already has the selected status."
          : `${selectedUser.fullName}'s account status is now ${updatedStatus}.`
      );

      setNewStatus("");
      setReason("");
      setConfirmed(false);

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The result could not be confirmed. Refresh and check the account status before trying again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-3xl">
          ♧
        </div>

        <h2 className="mt-6 text-2xl font-bold">
          No regular users yet
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
          This page manages regular USER accounts.
          Administrator accounts are excluded.
          Register another Firebase account to test these controls.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
          Select account
        </p>

        <h2 className="mt-3 text-2xl font-extrabold">
          Registered users
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Choose the account you want to manage.
        </p>

        <div className="mt-7 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              disabled={loading}
              onClick={() => changeUser(user.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 disabled:opacity-60 ${
                selectedId === user.id
                  ? "border-emerald-400/50 bg-emerald-400/10 shadow-lg shadow-emerald-500/5"
                  : "border-white/10 bg-slate-950/30 hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-lg font-black text-emerald-300">
                  {user.fullName.charAt(0).toUpperCase() || "U"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-white">
                    {user.fullName}
                  </p>

                  <p className="mt-1 break-all text-xs text-slate-400">
                    {user.email}
                  </p>

                  <span
                    className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${statusStyle(
                      user.status
                    )}`}
                  >
                    {user.status}
                  </span>
                </div>

                {selectedId === user.id && (
                  <span className="text-lg text-emerald-300">
                    ✓
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
          Administrator controls
        </p>

        <h2 className="mt-3 text-2xl font-extrabold">
          Account status
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-400">
          Change account access with an administrator reason
          recorded for every actual status change.
        </p>

        {selectedUser && (
          <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Selected account
            </p>

            <h3 className="mt-3 break-words text-xl font-extrabold">
              {selectedUser.fullName}
            </h3>

            <p className="mt-1 break-all text-sm text-slate-400">
              {selectedUser.email}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400">
                Current status
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(
                  selectedUser.status
                )}`}
              >
                {selectedUser.status}
              </span>
            </div>
          </div>
        )}

        <div className="mt-7">
          <label
            htmlFor="newStatus"
            className="mb-3 block text-sm font-semibold text-slate-200"
          >
            New account status
          </label>

          <select
            id="newStatus"
            required
            disabled={loading}
            value={newStatus}
            onChange={(event) => {
              setNewStatus(
                event.target.value as AccountStatus | ""
              );
              resetMessages();
            }}
            className="w-full rounded-2xl border border-white/10 bg-[#101b2b] px-4 py-4 text-sm font-semibold text-white outline-none focus:border-emerald-400/60 disabled:opacity-60"
          >
            <option value="">Choose a status</option>
            <option value="ACTIVE">
              ACTIVE — Restore wallet access
            </option>
            <option value="FROZEN">
              FROZEN — Temporarily block wallet access
            </option>
            <option value="SUSPENDED">
              SUSPENDED — Block wallet access
            </option>
          </select>
        </div>

        <div className="mt-7">
          <label
            htmlFor="statusReason"
            className="mb-3 block text-sm font-semibold text-slate-200"
          >
            Administrator reason
          </label>

          <textarea
            id="statusReason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              resetMessages();
            }}
            disabled={loading}
            maxLength={200}
            rows={4}
            required
            placeholder="Explain why this account status is being changed..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm leading-7 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/60 disabled:opacity-60"
          />

          <p className="mt-2 text-right text-xs text-slate-500">
            {reason.length}/200 characters
          </p>
        </div>

        <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={loading}
            onChange={(event) =>
              setConfirmed(event.target.checked)
            }
            className="mt-1 h-4 w-4 accent-emerald-400"
          />

          <span className="text-sm leading-6 text-slate-300">
            I have checked the selected account, new status,
            and reason.
          </span>
        </label>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-200"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200"
          >
            ✓ {success}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            !confirmed ||
            !newStatus ||
            newStatus === selectedUser?.status
          }
          className="mt-7 w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-4 font-extrabold text-slate-950 shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Updating account..." : "Confirm Status Change →"}
        </button>
      </form>
    </div>
  );
}
