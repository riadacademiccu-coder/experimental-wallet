
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export default function FirebaseLogoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not end your session.");
      }

      // Clear the browser-side Firebase authentication state.
      try {
        await signOut(firebaseAuth);
      } catch {
        // The server session has already been cleared.
      }

      router.replace("/firebase-login");
      router.refresh();
    } catch {
      setError(
        "We couldn't sign you out. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070e1c] px-5 py-10 text-white">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-[110px]" />

      <div className="relative z-10 w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 text-xl font-black text-slate-950">
          KB
        </div>

        <p className="mt-6 text-sm font-semibold tracking-[0.18em] text-emerald-300">
          KIDS BANK LTD
        </p>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
          Ready to sign out?
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-400">
          You can securely end your session and sign back in
          whenever you want.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Signing out..." : "Yes, sign me out"}
        </button>

        <Link
          href="/firebase-dashboard"
          className="mt-4 inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-slate-300 transition hover:text-white"
        >
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}
