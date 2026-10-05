export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-xs font-medium text-red-600">
              your kid's partner
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Login
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
              Your Kid's Partner
            </div>

            <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              Kids Bank Ltd
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              A secure wallet application being developed for learning,
              experimentation, and testing with a small number of users.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
              >
                Create Test Account
              </button>

              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700"
              >
                Sign In
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
            <p className="text-sm font-medium text-slate-400">
              Example Wallet
            </p>

            <p className="mt-3 text-4xl font-bold">
              ৳0.00
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Available Balance
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">
                  Deposit
                </p>

                <p className="mt-1 font-semibold">
                  Simulated bKash
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">
                  Withdrawal
                </p>

                <p className="mt-1 font-semibold">
                  Verified Agent
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-sm text-amber-200">
                Simulated bKash Deposit — No real payment is processed.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-slate-500">
          KIDS BANK LTD
        </div>
      </footer>
    </main>
  );
}