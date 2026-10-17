import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Your wallet, at a glance",
    description:
      "See your available balance, reserved funds, and latest wallet activity from one private dashboard.",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="15" rx="2.5" />
        <path d="M3 10h18M16 15h2M7 3h11" />
      </>
    ),
  },
  {
    number: "02",
    title: "Move test funds easily",
    description:
      "Redeem an administrator-issued test deposit and transfer simulated balances to other members.",
    icon: (
      <>
        <path d="M4 7h16m-5-4 5 4-5 4M20 17H4m5-4-5 4 5 4" />
      </>
    ),
  },
  {
    number: "03",
    title: "Controlled withdrawals",
    description:
      "Request a simulated withdrawal through an approved agent, with admin review and balance reservation.",
    icon: (
      <>
        <path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3" />
      </>
    ),
  },
];

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#07101e] text-white">
      <div className="pointer-events-none absolute -left-52 top-0 h-[580px] w-[580px] rounded-full bg-emerald-500/[0.13] blur-[130px]" />
      <div className="pointer-events-none absolute -right-48 top-[24rem] h-[570px] w-[570px] rounded-full bg-cyan-500/[0.10] blur-[150px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 py-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Kids Bank Ltd home">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-500 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/20">
              KB
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight">Kids Bank Ltd</span>
              <span className="block text-xs font-medium tracking-[0.13em] text-emerald-300/80">DIGITAL WALLET</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-extrabold text-[#052317] shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-300">
              Get started
            </Link>
          </nav>
        </header>

        <div className="grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:py-24">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/[0.07] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.6)]" />
              Your circle. One wallet.
            </div>

            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              A better way to manage your
              <span className="block bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                shared digital wallet.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              Keep track of balances, send test funds to members, and follow every transaction in a thoughtfully designed, private wallet experience.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-4 text-sm font-extrabold text-[#042317] shadow-xl shadow-emerald-500/15 transition hover:brightness-110">
                Create your account <ArrowIcon />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-sm font-bold text-white transition hover:bg-white/[0.11]">
                Open my wallet <ArrowIcon />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
              <span className="inline-flex items-center gap-2"><span className="text-emerald-300">✓</span> Firebase authentication</span>
              <span className="inline-flex items-center gap-2"><span className="text-emerald-300">✓</span> Protected wallet records</span>
              <span className="inline-flex items-center gap-2"><span className="text-emerald-300">✓</span> Mobile-friendly</span>
            </div>
          </section>

          <section aria-label="Illustrative wallet preview" className="relative mx-auto w-full max-w-[490px]">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/15 via-transparent to-cyan-400/10 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-sm font-black text-emerald-200">KB</span>
                  <div>
                    <p className="text-sm font-bold text-white">Wallet overview</p>
                    <p className="text-xs text-slate-400">Illustrative preview</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/[0.10] px-3 py-1.5 text-[11px] font-bold text-emerald-300">Active</span>
              </div>

              <div className="mt-7 rounded-[1.6rem] border border-emerald-300/15 bg-gradient-to-br from-[#163f39] via-[#102e35] to-[#0b1f37] p-6 shadow-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-emerald-200/80">Available balance</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">৳1,250<span className="text-2xl text-white/65">.00</span></p>
                <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-4 text-sm">
                  <span className="text-emerald-100/75">Reserved funds</span>
                  <span className="font-bold text-emerald-100">৳50.00</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Deposit", mark: "↓", href: "/deposit" },
                  { label: "Transfer", mark: "↔", href: "/transfer" },
                  { label: "Withdraw", mark: "↑", href: "/withdraw" },
                ].map((item) => (
                  <Link key={item.label} href={item.href} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-2 py-4 transition hover:border-emerald-300/30 hover:bg-white/[0.09]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-2xl text-emerald-300">{item.mark}</span>
                    <span className="text-xs font-semibold text-slate-200">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">✓</span>
                <span className="text-sm font-medium text-slate-300">A clear record for every wallet action</span>
              </div>
            </div>
          </section>
        </div>

        <section className="border-t border-white/10 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Made for your circle</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Everything in one place.</h2>
            </div>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 transition hover:text-emerald-200">
              Sign in to continue <ArrowIcon />
            </Link>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.number} className="group rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-7 transition hover:border-emerald-300/25 hover:bg-white/[0.07]">
                <div className="flex items-center justify-between">
                  <span className="flex h-13 w-13 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-300">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                      {feature.icon}
                    </svg>
                  </span>
                  <span className="text-xs font-extrabold tracking-[0.2em] text-slate-500">{feature.number}</span>
                </div>
                <h3 className="mt-7 text-lg font-extrabold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 py-8 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Kids Bank Ltd</span>
          <span>Simulated wallet · No real payments are processed.</span>
          <Link href="/login" className="font-semibold text-slate-300 hover:text-white">Member sign in</Link>
        </footer>
      </div>
    </main>
  );
}
