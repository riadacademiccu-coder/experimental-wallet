import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentWalletUser } from "@/lib/firebase/session";
import DepositForm from "./DepositForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FirebaseDepositPage() {
  const user = await getCurrentWalletUser();

  if (!user) {
    redirect("/firebase-login");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-44 top-10 h-[480px] w-[480px] rounded-full bg-emerald-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -right-44 top-80 h-[520px] w-[520px] rounded-full bg-cyan-400/[0.08] blur-[145px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "linear-gradient(to bottom,black,transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/firebase-dashboard" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 text-lg font-black text-[#07101e] shadow-lg shadow-emerald-500/10">
              KB
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Kids Bank Ltd</p>
              <p className="text-xs text-slate-400">Personal Wallet</p>
            </div>
          </Link>

          <nav aria-label="Account navigation" className="flex flex-wrap items-center gap-2">
            <Link href="/firebase-dashboard" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
              Dashboard
            </Link>
            <Link href="/firebase-transactions" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
              Transactions
            </Link>
            <Link href="/firebase-logout" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white">
              Log out
            </Link>
          </nav>
        </header>

        <section className="pb-9 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.19em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Wallet funding
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Make a <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">deposit.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Redeem your admin-issued test reference and track the credit in your wallet history.
          </p>
        </section>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
          <DepositForm />

          <aside className="space-y-5">
            <div className="relative overflow-hidden rounded-[30px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/15 via-white/[0.045] to-cyan-400/[0.035] p-7 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-8">
              <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border border-emerald-300/15" />
              <div className="absolute -right-2 -top-2 h-28 w-28 rounded-full border border-emerald-300/10" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-xl text-emerald-300">
                  ✦
                </div>
                <h2 className="mt-6 text-2xl font-extrabold tracking-tight">How it works</h2>
                <div className="mt-7 space-y-6">
                  <div className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-xs font-extrabold text-emerald-300">01</div>
                    <div>
                      <p className="font-bold">Get a test reference</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">Your administrator provides a sender number, exact amount and unique reference.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-xs font-extrabold text-emerald-300">02</div>
                    <div>
                      <p className="font-bold">Enter matching details</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">Fill in all three fields exactly as shown on the reference.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-xs font-extrabold text-emerald-300">03</div>
                    <div>
                      <p className="font-bold">Receive wallet credit</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">The server verifies the details and credits the wallet once if the reference is unused.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-lg text-sky-300">ⓘ</span>
                <div>
                  <h3 className="font-bold">About your reference</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Each reference can be redeemed only once. If a submission has an uncertain result, check Transactions before trying anything else.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="pt-14 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Kids Bank Ltd
        </footer>
      </div>
    </main>
  );
}
