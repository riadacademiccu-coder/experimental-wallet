import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import EmailVerificationManager, {
  type VerificationUser,
} from "./EmailVerificationManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminEmailVerificationPage() {
  const admin = await getCurrentWalletUser();

  if (!admin) {
    redirect("/firebase-login");
  }

  if (admin.role !== "ADMIN") {
    redirect("/firebase-dashboard");
  }

  const db = getAdminDb();
  const firebaseAuth = getAdminAuth();

  // Show up to 30 recent regular USER profiles (enough for the initial pilot).
  const profilesSnapshot = await db
    .collection("profiles")
    .orderBy("created_at", "desc")
    .limit(30)
    .get();

  const regularProfiles = profilesSnapshot.docs.filter((document) => {
    const data = document.data();
    return data.role === "USER" && data.user_id === document.id;
  });

  const users: VerificationUser[] = await Promise.all(
    regularProfiles.map(async (document): Promise<VerificationUser> => {
      const profile = document.data();
      const profileEmail =
        typeof profile.email === "string" ? profile.email.trim() : "";

      const result: VerificationUser = {
        uid: document.id,
        fullName:
          typeof profile.full_name === "string" && profile.full_name.trim()
            ? profile.full_name
            : "Unknown user",
        email: profileEmail || "No email",
        status:
          typeof profile.status === "string" ? profile.status : "UNKNOWN",
        emailVerified: false,
        authState: "UNAVAILABLE",
      };

      try {
        const authUser = await firebaseAuth.getUser(document.id);

        if (
          !authUser.email ||
          !profileEmail ||
          authUser.email.toLowerCase() !== profileEmail.toLowerCase()
        ) {
          return { ...result, authState: "EMAIL_MISMATCH" };
        }

        return {
          ...result,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          authState: authUser.disabled ? "DISABLED" : "READY",
        };
      } catch {
        return result;
      }
    })
  );

  const verifiedCount = users.filter(
    (user) => user.authState === "READY" && user.emailVerified
  ).length;
  const awaitingCount = users.filter(
    (user) => user.authState === "READY" && !user.emailVerified
  ).length;
  const reviewCount = users.filter((user) => user.authState !== "READY").length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-emerald-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-96 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/firebase-admin" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 font-black text-slate-950">
              KB
            </div>
            <div>
              <p className="text-lg font-extrabold">Kids Bank Ltd</p>
              <p className="text-xs text-slate-400">Administrator Workspace</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-3">
            <Link
              href="/firebase-admin/users"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              All Users
            </Link>
            <Link
              href="/firebase-admin"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              ← Admin Dashboard
            </Link>
          </nav>
        </header>

        <section className="pb-8 pt-12">
          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            Identity and Access
          </span>
          <h1 className="mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Email <span className="text-emerald-400">Verification</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            Review Firebase email verification status and securely handle administrator
            overrides when email ownership has been independently established.
          </p>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[26px] border border-emerald-400/15 bg-emerald-400/[0.06] p-6">
            <p className="text-sm text-emerald-200">Verified</p>
            <p className="mt-3 text-4xl font-extrabold text-emerald-300">{verifiedCount}</p>
          </div>
          <div className="rounded-[26px] border border-amber-400/15 bg-amber-400/[0.06] p-6">
            <p className="text-sm text-amber-200">Awaiting verification</p>
            <p className="mt-3 text-4xl font-extrabold text-amber-300">{awaitingCount}</p>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm text-slate-300">Needs review</p>
            <p className="mt-3 text-4xl font-extrabold">{reviewCount}</p>
          </div>
        </section>

        <EmailVerificationManager initialUsers={users} />

        <footer className="py-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
