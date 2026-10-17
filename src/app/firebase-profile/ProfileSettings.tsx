"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { useRef, useState, type FormEvent } from "react";

import { firebaseAuth } from "@/lib/firebase/client";

type Props = {
  initialFullName: string;
  email: string;
};

export default function ProfileSettings({ initialFullName, email }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [savedName, setSavedName] = useState(initialFullName);
  const [saving, setSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const savingRef = useRef(false);
  const sendingResetRef = useRef(false);

  const normalizedName = fullName.trim().replace(/\s+/g, " ");
  const nameIsValid = normalizedName.length >= 2 && normalizedName.length <= 80;
  const hasChanges = normalizedName !== savedName;

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || !hasChanges) return;
    setNameError("");
    setNameMessage("");

    if (!nameIsValid) {
      setNameError("Please enter a name with 2 to 80 characters.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/firebase/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: normalizedName }),
      });
      const result: { success?: boolean; error?: string; fullName?: string } = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to update your profile.");
      }
      const nextName = result.fullName ?? normalizedName;
      setFullName(nextName);
      setSavedName(nextName);
      setNameMessage("Your display name has been updated.");
      router.refresh();
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "Unable to update your profile.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function sendResetEmail() {
    if (sendingResetRef.current) return;
    setResetError("");
    setResetMessage("");
    sendingResetRef.current = true;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      setResetMessage(`Password reset instructions have been sent to ${email}. Check your inbox and spam folder.`);
    } catch {
      setResetError("Unable to send the reset email right now. Try again later.");
    } finally {
      sendingResetRef.current = false;
      setSendingReset(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveName} className="rounded-[30px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">Personal details</p>
            <h2 className="mt-3 text-2xl font-extrabold">Profile information</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">Update the name displayed on your account.</p>
          </div>
          <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-xs font-bold text-emerald-200">Firebase secured</span>
        </div>

        <div className="mt-8">
          <label htmlFor="profileFullName" className="mb-3 block text-sm font-semibold text-slate-200">Full name</label>
          <input
            id="profileFullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            minLength={2}
            maxLength={80}
            value={fullName}
            disabled={saving}
            onChange={(event) => {
              setFullName(event.target.value);
              setNameMessage("");
              setNameError("");
            }}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10 disabled:opacity-60"
            placeholder="Enter your full name"
          />
          <p className="mt-2 text-xs text-slate-500">2–80 characters. This won't change your login email.</p>
        </div>

        <div className="mt-7">
          <label htmlFor="profileEmail" className="mb-3 block text-sm font-semibold text-slate-200">Verified email address</label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-5 py-4">
            <input id="profileEmail" type="email" value={email} readOnly className="min-w-0 flex-1 bg-transparent text-sm text-slate-300 outline-none" />
            <span className="shrink-0 text-xs font-bold text-emerald-300">✓ Verified</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Email changes are disabled to protect wallet identity and transaction records.</p>
        </div>

        {nameError && <p role="alert" className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{nameError}</p>}
        {nameMessage && <p role="status" className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{nameMessage}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || !hasChanges || !nameIsValid}
            className="rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-7 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:from-emerald-200 hover:to-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {hasChanges && <button type="button" disabled={saving} onClick={() => { setFullName(savedName); setNameError(""); }} className="rounded-2xl border border-white/10 px-5 py-3.5 text-sm font-bold text-slate-300 hover:bg-white/[0.07]">Cancel</button>}
        </div>
      </form>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">Account security</p>
        <h2 className="mt-3 text-2xl font-extrabold">Password &amp; login</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">Need a new password? We'll send a secure password-reset link to your verified email address.</p>
        <button
          type="button"
          disabled={sendingReset}
          onClick={sendResetEmail}
          className="mt-6 inline-flex rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.08] px-6 py-3.5 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendingReset ? "Sending email..." : "Email me a password reset link"}
        </button>
        {resetError && <p role="alert" className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{resetError}</p>}
        {resetMessage && <p role="status" className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{resetMessage}</p>}
        <div className="mt-7 border-t border-white/10 pt-6">
          <Link href="/firebase-logout" className="inline-flex rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.07]">Sign out of this device →</Link>
        </div>
      </section>
    </div>
  );
}
