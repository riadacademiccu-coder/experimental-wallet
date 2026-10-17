"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type VerificationUser = {
  uid: string;
  fullName: string;
  email: string;
  status: string;
  emailVerified: boolean;
  authState: "READY" | "DISABLED" | "EMAIL_MISMATCH" | "UNAVAILABLE";
};

type Props = {
  initialUsers: VerificationUser[];
};

function canVerify(user: VerificationUser | undefined): boolean {
  return Boolean(
    user && user.authState === "READY" && !user.emailVerified
  );
}

export default function EmailVerificationManager({ initialUsers }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [selectedUid, setSelectedUid] = useState(
    initialUsers.find((user) => canVerify(user))?.uid ??
      initialUsers[0]?.uid ??
      ""
  );
  const [reason, setReason] = useState("");
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = users.find((user) => user.uid === selectedUid);
  const allowed = canVerify(selected);

  function selectUser(uid: string) {
    if (busy) return;
    setSelectedUid(uid);
    setReason("");
    setOwnershipConfirmed(false);
    setUncertain(false);
    setMessage("");
    setError("");
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uncertain || !allowed || !selected) return;

    const cleanReason = reason.trim();
    setError("");
    setMessage("");

    if (cleanReason.length < 10 || cleanReason.length > 200) {
      setError("Enter a reason containing 10 to 200 characters.");
      return;
    }

    if (!ownershipConfirmed) {
      setError("Confirm that you independently checked email ownership.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/firebase-admin/verify-email", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUid: selected.uid,
          reason: cleanReason,
          confirmEmailOwnership: true,
        }),
      });

      let result: { success?: boolean; error?: string; message?: string };
      try {
        result = await response.json();
      } catch {
        throw new Error("UNCONFIRMED");
      }

      if (!response.ok || result.success !== true) {
        if (response.status >= 500) {
          throw new Error("UNCONFIRMED");
        }
        setError(result.error ?? "Email verification was not authorized.");
        return;
      }

      setUsers((previous) =>
        previous.map((user) =>
          user.uid === selected.uid
            ? { ...user, emailVerified: true }
            : user
        )
      );
      setMessage(result.message ?? "Email marked as verified.");
      setReason("");
      setOwnershipConfirmed(false);
      router.refresh();
    } catch {
      // A network/5xx error might occur after Firebase has already
      // changed the user's verification status. Never blindly retry.
      setUncertain(true);
      setError(
        "The result cannot be confirmed. Check Firebase Authentication and admin_audit_logs before trying again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-6 py-20 text-center">
        <p className="text-xl font-bold">No regular users found</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
          Register a regular Firebase user to see their email verification status here.
          Administrator accounts are excluded from this list.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-5 shadow-xl backdrop-blur-xl sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
              Email directory
            </p>
            <h2 className="mt-3 text-2xl font-extrabold">Registered members</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
            {users.length} shown
          </span>
        </div>

        <div className="mt-6 max-h-[620px] space-y-3 overflow-y-auto pr-1">
          {users.map((user) => (
            <button
              key={user.uid}
              type="button"
              disabled={busy}
              onClick={() => selectUser(user.uid)}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 disabled:opacity-60 ${
                selectedUid === user.uid
                  ? "border-emerald-400/50 bg-emerald-400/[0.10]"
                  : "border-white/10 bg-slate-950/30 hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl font-extrabold text-emerald-300">
                  {user.fullName.trim().charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-white">{user.fullName}</p>
                  <p className="mt-1 break-all text-xs text-slate-400">{user.email}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {user.authState !== "READY" ? (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-200">
                        Account needs review
                      </span>
                    ) : user.emailVerified ? (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-300">
                        Unverified
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                      {user.status}
                    </span>
                  </div>
                </div>
                {selectedUid === user.uid && (
                  <span className="text-emerald-300" aria-hidden="true">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <form
        onSubmit={handleVerify}
        className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
          Administrator control
        </p>
        <h2 className="mt-3 text-2xl font-extrabold">Email verification</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Users can verify their email using the Firebase email link. An admin may
          override this only after independently confirming that the user owns the address.
        </p>

        {selected && (
          <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/45 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected user</p>
            <p className="mt-3 break-words text-xl font-extrabold">{selected.fullName}</p>
            <p className="mt-2 break-all text-sm text-slate-300">{selected.email}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Account: {selected.status}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  selected.emailVerified
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-300"
                }`}
              >
                Email: {selected.emailVerified ? "Verified" : "Not verified"}
              </span>
            </div>
          </div>
        )}

        {selected?.authState !== "READY" && selected && (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-200">
            This account is unavailable, disabled, or its Firebase email does not match the profile.
            Review the account in Firebase Console before proceeding.
          </div>
        )}

        <div className="mt-7">
          <label htmlFor="verifyReason" className="mb-2 block text-sm font-semibold text-slate-200">
            Reason and evidence of ownership
          </label>
          <textarea
            id="verifyReason"
            rows={4}
            minLength={10}
            maxLength={200}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
            placeholder="Explain how you independently confirmed the email belongs to this user..."
            disabled={!allowed || busy || uncertain}
            required
            className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="mt-2 text-right text-xs text-slate-500">{reason.length}/200</p>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <input
            type="checkbox"
            checked={ownershipConfirmed}
            onChange={(event) => setOwnershipConfirmed(event.target.checked)}
            disabled={!allowed || busy || uncertain}
            className="mt-1 h-4 w-4 accent-emerald-400"
          />
          <span className="text-sm leading-6 text-slate-300">
            I independently confirmed that this person controls the selected email address,
            and I accept responsibility for manually marking it as verified.
          </span>
        </label>

        {message && (
          <p role="status" className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
            ✓ {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!allowed || !ownershipConfirmed || busy || uncertain}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-4 font-extrabold text-slate-950 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Verifying email..." : selected?.emailVerified ? "Already verified" : "Confirm Admin Verification →"}
        </button>

        {uncertain && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 w-full rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Reload verification status
          </button>
        )}

        <p className="mt-5 text-center text-xs leading-6 text-slate-500">
          Manual verification does not prove inbox ownership by itself. The user must sign in
          again to receive an updated Firebase authentication token.
        </p>
      </form>
    </div>
  );
}
