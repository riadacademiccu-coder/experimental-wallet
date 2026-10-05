import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-red-500">
              your kid&apos;s partner
            </p>
          </div>

          <Link
            href="/login"
            className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Login
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-300">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-amber-100 px-5 py-2 text-sm font-medium text-amber-800">
              Your Kid&apos;s Partner
            </div>

            <h2 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
              Kids Bank Ltd
            </h2>

            <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600">
              A secure wallet application being developed for learning,
              experimentation, and testing with a small number of users.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-xl bg-slate-900 px-7 py-4 font-semibold text-white transition hover:bg-slate-700"
              >
                Create Test Account
              </Link>

              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-7 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-blue-300">
              Example Wallet
            </p>

            <p className="mt-2 text-5xl font-bold">
              ৳0.00
            </p>

            <p className="mt-2 text-blue-300">
              Available Balance
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <Link
                href="/deposit"
                className="rounded-2xl bg-slate-800 p-5 transition hover:bg-slate-700"
              >
                <p className="text-blue-200">
                  Deposit
                </p>

                <p className="mt-2 text-xl font-bold">
                  Simulated bKash
                </p>
              </Link>

              <Link
                href="/withdraw"
                className="rounded-2xl bg-slate-800 p-5 transition hover:bg-slate-700"
              >
                <p className="text-blue-200">
                  Withdrawal
                </p>

                <p className="mt-2 text-xl font-bold">
                  Verified Agent
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white py-10 text-center text-sm font-medium text-slate-500">
        KIDS BANK LTD
      </footer>
    </main>
  );
}