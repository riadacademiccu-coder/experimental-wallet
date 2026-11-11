import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import DashboardClient, { Icon } from "./DashboardClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatMoney(value: unknown): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return "Unavailable";
  }

  return `৳${(value / 100).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function FirebaseDashboardPage() {
  const user = await getCurrentWalletUser();

  if (!user) redirect("/firebase-login");
  if (user.role === "ADMIN") redirect("/firebase-admin");

  const db = getAdminDb();
  const [profileSnapshot, accountSnapshot] = await Promise.all([
    db.collection("profiles").doc(user.uid).get(),
    db.collection("accounts").doc(user.uid).get(),
  ]);

  const profile = profileSnapshot.data();
  const account = accountSnapshot.data();

  if (
    !profileSnapshot.exists ||
    profile?.user_id !== user.uid ||
    profile?.role !== "USER" ||
    profile?.status !== "ACTIVE" ||
    !accountSnapshot.exists ||
    account?.user_id !== user.uid
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 text-[#172554]">
        <div className="w-full max-w-md rounded-[26px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Icon name="shield" className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Wallet unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Your account details need attention. Please contact an administrator.
          </p>
          <Link
            href="/firebase-logout"
            className="mt-6 inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Log out
          </Link>
        </div>
      </main>
    );
  }

  const fullName =
    typeof profile.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : user.fullName;

  const currency =
    typeof account.currency === "string" && account.currency.trim()
      ? account.currency
      : "BDT";

  return (
    <DashboardClient
      fullName={fullName}
      availableBalance={formatMoney(account.available_balance_poisha)}
      currency={currency}
    />
  );
}
