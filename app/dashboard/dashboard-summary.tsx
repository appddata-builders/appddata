"use client";

import { Check, CreditCard, Sparkles } from "lucide-react";

import { SitePackageIcon, SitePackageName } from "@/app/components/packages/site-package-identity";
import type { PanelPlan } from "@/lib/plans";
import {
  getSitePackage,
  SHARED_SITE_FEATURES,
  SITE_PACKAGES,
} from "@/lib/site-packages";

const checkoutUrls: Record<(typeof SITE_PACKAGES)[number]["id"], string | undefined> = {
  beginner: process.env.NEXT_PUBLIC_CHECKOUT_BEGINNER_URL,
  super: process.env.NEXT_PUBLIC_CHECKOUT_SUPER_URL,
  premium: process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM_URL,
};

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]">
              <SitePackageIcon plan={activePackage.id} className="h-3.5 w-3.5" />
              <SitePackageName plan={activePackage.id}>{activePackage.name}</SitePackageName>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#589bf9]/25 bg-[#589bf9]/10 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-[#0C6CC6]">
              <SitePackageIcon plan="free" className="h-3.5 w-3.5" />
              <SitePackageName plan="free">Free</SitePackageName>
            </span>
          )}
          {plan.hasImin ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              IMIN
            </span>
          ) : null}
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-3xl">
          {activePackage ? (
            <>
              Tu sitio está en el paquete{" "}
              <SitePackageName plan={activePackage.id}>{activePackage.name}</SitePackageName>
            </>
          ) : (
            "Elige el paquete ideal para tu sitio"
          )}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {activePackage
            ? activePackage.description
            : "Compara los tres paquetes y continúa al checkout cuando estés listo para construir tu sitio."}
        </p>
      </div>

      {!activePackage ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {SITE_PACKAGES.map((sitePackage) => {
            const checkoutUrl = checkoutUrls[sitePackage.id];
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
                    <h2 className="mt-2 text-xl font-bold">
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
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href={checkoutUrl ?? `/products?checkout=${sitePackage.id}`}
                  className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0C6CC6] px-4 pt-0 text-sm font-medium text-white transition hover:bg-[#0a5aa6]"
                >
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Ir a checkout
                </a>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
