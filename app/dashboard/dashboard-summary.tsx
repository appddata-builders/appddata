"use client";

import { LuCheck, LuCreditCard, LuTicket } from "react-icons/lu";
import Link from "next/link";

import {
  sitePackageBadgeBackground,
  SitePackageIcon,
  SitePackageName,
} from "@/app/components/packages/site-package-identity";
import IminMark from "@/app/components/imin/imin-mark";
import type { PanelPlan } from "@/lib/plans";
import {
  getSitePackage,
  SHARED_SITE_FEATURES,
  SITE_PACKAGES,
} from "@/lib/site-packages";

export default function DashboardSummary({ plan }: { plan: PanelPlan }) {
  const activePackage = getSitePackage(plan.sitePlan);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
          Resumen de cuenta
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activePackage ? (
            <span className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-bold tracking-[0.08em] ${sitePackageBadgeBackground(activePackage.id)}`}>
              <SitePackageIcon plan={activePackage.id} className="h-3.5 w-3.5" />
              <SitePackageName plan={activePackage.id}>{activePackage.name}</SitePackageName>
            </span>
          ) : (
            <span className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-bold tracking-[0.08em] ${sitePackageBadgeBackground("free")}`}>
              <SitePackageIcon plan="free" className="h-3.5 w-3.5" />
              <SitePackageName plan="free">Free</SitePackageName>
            </span>
          )}
          {plan.hasImin ? (
            <span
              className="inline-grid h-9 w-9 place-items-center rounded-full border border-amber-200 bg-amber-50"
              title="IMIN incluido"
              aria-label="IMIN incluido"
            >
              <IminMark className="h-7 w-7" />
            </span>
          ) : null}
          {SITE_PACKAGES.map((sitePackage) => {
            const count = plan.availableSitePackages[sitePackage.id];
            return count > 0 ? (
              <span key={sitePackage.id} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#f3c49f] bg-[#fff4e8] px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b85f28]">
                <LuTicket className="h-3.5 w-3.5 text-[#df7a3a]" aria-hidden="true" />
                {count} Website{count === 1 ? "" : "s"} {sitePackage.name}
              </span>
            ) : null;
          })}
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-3xl">
          {plan.hasUnassignedSitePackage ? (
            "Tu paquete está listo para construir"
          ) : activePackage ? (
            <>
              Tu sitio está en el paquete{" "}
              <SitePackageName plan={activePackage.id}>{activePackage.name}</SitePackageName>
            </>
          ) : (
            "Elige el paquete ideal para tu sitio"
          )}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {plan.hasUnassignedSitePackage
            ? "El pago fue confirmado. Abre Appddata Build para crear y vincular el sitio incluido en tu compra."
            : activePackage
            ? activePackage.description
            : "Compara los tres paquetes y continúa al checkout cuando estés listo para construir tu sitio."}
        </p>
        {plan.hasUnassignedSitePackage ? (
          <Link
            href="/dashboard/build"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#df7a3a]/70 px-4 text-sm font-medium text-white transition hover:bg-[#df7a3a]"
          >
            <LuTicket className="h-4 w-4 mr-2" aria-hidden="true" />
            Appddata Build
          </Link>
        ) : null}
      </div>

      {!activePackage ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {SITE_PACKAGES.map((sitePackage) => {
            return (
              <article
                key={sitePackage.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_50px_rgba(12,108,198,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[#0C6CC6]">
                      Paquete
                    </p>
                    <h2 className="mt-2 text-xl font-bold tracking-[0.08em]">
                      <SitePackageName plan={sitePackage.id}>{sitePackage.name}</SitePackageName>
                    </h2>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                    <SitePackageIcon plan={sitePackage.id} className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{sitePackage.description}</p>
                <p className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0C6CC6]">
                  {sitePackage.price}
                </p>
                <ul className="mt-5 grid gap-2 border-t border-slate-100 py-5">
                  {[...SHARED_SITE_FEATURES, ...sitePackage.extras].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                      <LuCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <form action="/api/stripe/checkout" method="post" className="mt-auto">
                  <input type="hidden" name="plan" value={sitePackage.id} />
                  <button
                    type="submit"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0C6CC6] px-4 text-sm font-medium text-white transition hover:bg-[#0a5aa6]"
                  >
                    <LuCreditCard className="h-4 w-4" aria-hidden="true" />
                    Ir a checkout
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
