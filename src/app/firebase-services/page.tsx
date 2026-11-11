import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentWalletUser } from "@/lib/firebase/session";
import {
  DashboardNavigation,
  Icon,
  type IconName,
} from "../firebase-dashboard/DashboardClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Service = {
  label: string;
  description: string;
  icon: IconName;
  href?: string;
};

const paymentServices: Service[] = [
  {
    label: "Mobile Recharge",
    description: "Top up a mobile number.",
    icon: "mobile",
  },
  {
    label: "Utility Bills",
    description: "Manage household bill payments.",
    icon: "utility",
  },
  {
    label: "QR Payment",
    description: "Pay at supported merchants.",
    icon: "qr",
  },
];

const accountServices: Service[] = [
  {
    label: "Card Management",
    description: "Manage linked payment cards.",
    icon: "card",
  },
  {
    label: "Savings Account",
    description: "Explore savings account tools.",
    icon: "savings",
  },
  {
    label: "Beneficiaries",
    description: "Manage saved recipients.",
    icon: "beneficiaries",
  },
  {
    label: "Scheduled Payments",
    description: "Plan future payments.",
    icon: "calendar",
  },
  {
    label: "Bank Statement",
    description: "View your wallet activity and records.",
    icon: "statement",
    href: "/firebase-transactions",
  },
];

function ServiceCard({ service }: { service: Service }) {
  const content = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <Icon name={service.icon} className="h-5 w-5" />
      </span>
      <span className="mt-4 block text-sm font-bold text-[#172554]">{service.label}</span>
      <span className="mt-1.5 block text-xs leading-5 text-slate-500">{service.description}</span>
      <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
        {service.href ? "View wallet history" : "Not available yet"}
        {service.href && <Icon name="arrowRight" className="h-3.5 w-3.5" />}
      </span>
    </>
  );

  return service.href ? (
    <Link
      href={service.href}
      className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.025)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_8px_22px_rgba(14,165,233,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      {content}
    </Link>
  ) : (
    <div
      aria-disabled="true"
      className="cursor-not-allowed rounded-2xl border border-slate-200/80 bg-white p-4"
    >
      {content}
    </div>
  );
}

export default async function FirebaseServicesPage() {
  const user = await getCurrentWalletUser();

  if (!user) redirect("/firebase-login");
  if (user.role === "ADMIN") redirect("/firebase-admin");

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#172554]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/firebase-dashboard" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-sm font-black text-white">
              KB
            </span>
            <span>
              <span className="block text-base font-extrabold tracking-tight">Kids Bank Ltd</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">Digital wallet</span>
            </span>
          </Link>
          <Link
            href="/firebase-profile"
            aria-label="Open profile and settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-100 bg-sky-100 text-xs font-extrabold text-sky-700 transition hover:bg-sky-200"
          >
            {user.fullName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "KB"}
          </Link>
        </header>

        <section className="mt-9">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-sky-600">Explore</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#172554]">More Services</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Browse wallet services. Features that are not connected to an existing service are clearly marked as unavailable.
          </p>
        </section>

        <section id="payments" aria-labelledby="payment-services-heading" className="mt-9 scroll-mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="payment-services-heading" className="text-lg font-extrabold text-[#172554]">Payments</h2>
            <span className="text-xs font-medium text-slate-400">3 services</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {paymentServices.map((service) => (
              <ServiceCard key={service.label} service={service} />
            ))}
          </div>
        </section>

        <section aria-labelledby="account-services-heading" className="mt-9">
          <div className="flex items-center justify-between gap-3">
            <h2 id="account-services-heading" className="text-lg font-extrabold text-[#172554]">Account &amp; Wallet</h2>
            <span className="text-xs font-medium text-slate-400">5 services</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {accountServices.map((service) => (
              <ServiceCard key={service.label} service={service} />
            ))}
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <p className="text-xs leading-5 text-slate-600">
              Only existing wallet actions are enabled. Unavailable services are shown for clarity and will not submit or simulate a payment.
            </p>
          </div>
        </div>
      </div>

      <DashboardNavigation active="more" />
    </main>
  );
}
