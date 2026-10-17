"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  inMemoryPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

function getLoginError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact the administrator.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a little and try again.";
    case "auth/network-request-failed":
      return "Connection problem. Check your internet and try again.";
    default:
      return "Unable to sign in right now. Please try again.";
  }
}

const inputClass =
  "w-full rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 py-3.5 text-[15px] text-slate-950 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10";

export default function FirebaseLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || resetting) return;

    setLoading(true);
    setError("");
    setInfo("");

    try {
      // We use a server session cookie rather than a persistent browser token.
      await setPersistence(firebaseAuth, inMemoryPersistence);

      const result = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim().toLowerCase(),
        password
      );

      // Fetch the latest email-verification state before requesting a session.
      await result.user.reload();
      if (!result.user.emailVerified) {
        setError("Please verify your email using the link sent to your inbox before signing in.");
        return;
      }

      const idToken = await result.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      });

      if (!response.ok) {
        const body: { error?: string } | null = await response
          .json()
          .catch(() => null);
        setError(body?.error ?? "Could not create a secure session. Try signing in again.");
        return;
      }

      setSuccess(true);
      setPassword("");
      // Let the server choose the correct dashboard for USER or ADMIN.
      // A full-page navigation guarantees the new HttpOnly cookie is included.
      window.location.replace("/firebase-home");
    } catch (caught) {
      setError(getLoginError(caught));
    } finally {
      // The HttpOnly session cookie is issued by Next.js, not stored in JS.
      // Clear the temporary Firebase browser sign-in after the request.
      try {
        await signOut(firebaseAuth);
      } catch {
        // Next.js session authentication remains independent of browser sign-out.
      }
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (resetting || loading) return;

    setError("");
    setInfo("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Enter your email address first, then select Forgot password.");
      return;
    }

    setResetting(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, cleanEmail);
      setInfo("If the email is registered, a password reset link has been sent.");
    } catch (caught) {
      const code =
        typeof caught === "object" && caught !== null && "code" in caught
          ? String(caught.code)
          : "";
      if (code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Please wait before requesting another reset email.");
      } else {
        setError("Couldn't send a reset email right now. Please try again.");
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#070e1c] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 10% 18%, rgba(16,185,129,.20), transparent 35%), radial-gradient(ellipse at 92% 4%, rgba(56,189,248,.14), transparent 34%), radial-gradient(ellipse at 55% 100%, rgba(99,102,241,.20), transparent 50%), linear-gradient(145deg, #070e1c 15%, #0a1729 58%, #101c31 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,.17) 0.65px, transparent 0.65px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-1/4 -z-10 h-80 w-80 rounded-full bg-emerald-400/10 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-12 -z-10 h-96 w-96 rounded-full bg-indigo-400/15 blur-[110px]" />

      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4 py-7 sm:py-9">
          <Link href="/firebase-login" className="group inline-flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/20 bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-[#06251c] shadow-[0_8px_25px_rgba(16,185,129,.20)] transition-transform duration-300 group-hover:-rotate-6">
              KB
            </span>
            <span className="text-[17px] font-extrabold tracking-tight">Kids Bank Ltd</span>
          </Link>

          <Link
            href="/firebase-signup"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/90 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-white/10 sm:text-sm"
          >
            Create account
            <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 pb-12 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,510px)] lg:gap-16 lg:pb-16 lg:pt-8 xl:gap-24">
          <section className="relative hidden min-h-[580px] flex-col justify-center lg:flex">
            <div className="relative z-10 max-w-[610px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200 backdrop-blur-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.95)]" />
                Good to have you back
              </div>

              <h1 className="mt-8 max-w-[610px] text-5xl font-extrabold leading-[1.1] tracking-[-0.055em] text-white xl:text-[68px]">
                Welcome back to
                <span className="mt-2 block bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                  something better.
                </span>
              </h1>

              <p className="mt-7 max-w-[470px] text-[16px] leading-8 text-slate-300/80 xl:text-[17px]">
                A thoughtfully designed space to stay connected, stay organized,
                and move through your day with ease.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur-md">
                  ✦ Beautifully simple
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur-md">
                  ✦ Seamless experience
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur-md">
                  ✦ Designed for you
                </span>
              </div>
            </div>

            <div aria-hidden="true" className="relative mt-10 h-[225px] w-full max-w-[530px]">
              <div className="absolute left-10 top-8 h-48 w-48 rounded-full bg-emerald-400/15 blur-[75px]" />
              <div className="absolute left-14 top-0 h-[210px] w-[390px] -rotate-12 rounded-[100%] border border-emerald-300/20" />
              <div className="absolute left-14 top-4 h-[175px] w-[390px] rotate-12 rounded-[100%] border border-cyan-300/20" />
              <div className="absolute left-28 top-0 h-44 w-44 rounded-full border border-white/10 bg-gradient-to-br from-emerald-300/25 via-teal-200/10 to-transparent shadow-[inset_0_0_40px_rgba(110,231,183,.07),0_0_70px_rgba(16,185,129,.10)] backdrop-blur-xl" />
              <div className="absolute left-[167px] top-[49px] flex h-24 w-24 items-center justify-center rounded-[30px] border border-emerald-200/30 bg-gradient-to-br from-emerald-200/30 to-cyan-500/10 text-4xl font-black tracking-tighter text-emerald-100 shadow-2xl shadow-emerald-900/30 backdrop-blur-xl">
                K
              </div>
              <div className="absolute left-[84px] top-[15px] h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,.9)]" />
              <div className="absolute left-[390px] top-[165px] h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.75)]" />
            </div>
          </section>

          <section className="w-full">
            <div className="rounded-[30px] border border-white/20 bg-white/[0.96] p-6 shadow-[0_36px_100px_rgba(0,0,0,.35)] backdrop-blur-2xl sm:rounded-[36px] sm:p-9 xl:p-11">
              {success ? (
                <div className="py-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-50 text-3xl font-bold text-emerald-600 ring-1 ring-emerald-100">
                    ✓
                  </div>
                  <p className="mt-8 text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
                    Signed in
                  </p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
                    Welcome back.
                  </h2>
                  <p className="mt-5 text-sm leading-7 text-slate-600">
                    Your secure Firebase session is ready. Taking you to your dashboard...
                  </p>
                  <Link
                    href="/firebase-home"
                    className="mt-8 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Open dashboard <span aria-hidden="true" className="ml-2">↗</span>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-700 ring-1 ring-emerald-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Your space awaits
                    </div>
                    <h2 className="mt-5 text-[32px] font-extrabold tracking-[-0.04em] text-slate-950 sm:text-[38px]">
                      Sign in to continue<span className="text-emerald-500">.</span>
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      Enter your details and pick up right where you left off.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="mb-2 block text-[13px] font-bold text-slate-700">
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor="password" className="text-[13px] font-bold text-slate-700">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={handlePasswordReset}
                          disabled={loading || resetting}
                          className="text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-900 disabled:opacity-50"
                        >
                          {resetting ? "Sending..." : "Forgot password?"}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Enter your password"
                          className={`${inputClass} pr-20`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg px-1 text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] leading-6 text-rose-700">
                        {error}
                      </div>
                    )}
                    {info && (
                      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] leading-6 text-emerald-800">
                        {info}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || resetting}
                      className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-5 py-4 text-[15px] font-extrabold text-slate-950 shadow-[0_14px_30px_rgba(16,185,129,.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(16,185,129,.30)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {loading ? "Signing you in..." : "Sign in"}
                      {!loading && (
                        <span aria-hidden="true" className="text-lg transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </button>
                  </form>

                  <p className="mt-7 text-center text-sm text-slate-500">
                    Don't have an account?{" "}
                    <Link href="/firebase-signup" className="font-extrabold text-emerald-700 transition-colors hover:text-emerald-900">
                      Create an account
                    </Link>
                  </p>
                </>
              )}
            </div>
            <p className="mt-6 text-center text-xs tracking-wide text-slate-400/70">
              © {new Date().getFullYear()} Kids Bank Ltd
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
