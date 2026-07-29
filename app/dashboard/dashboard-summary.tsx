"use client";

import { LuTicket } from "react-icons/lu";
import Link from "next/link";

import HomeDevelop from "@/app/components/home/home-develop";
import {
  sitePackageBadgeBackground,
  SitePackageIcon,
  SitePackageName,
} from "@/app/components/packages/site-package-identity";
import IminMark from "@/app/components/imin/imin-mark";
import type { PanelPlan } from "@/lib/plans";
import { getSitePackage, SITE_PACKAGES } from "@/lib/site-packages";

export default function DashboardSummary({ plan }: { plan: PanelPlan }) {
  const activePackage = getSitePackage(plan.sitePlan);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      {activePackage || plan.hasUnassignedSitePackage ? (
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
              <SitePackageName plan="free">Gratis</SitePackageName>
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
                {count} {count === 1 ? "sitio" : "sitios"} {sitePackage.name}
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
            ? "El pago fue confirmado. Abre el Constructor Appddata para crear y vincular el sitio incluido en tu compra."
            : activePackage
            ? activePackage.idealFor
            : "Compara los tres paquetes y continúa al checkout cuando estés listo para construir tu sitio."}
        </p>
        {plan.hasUnassignedSitePackage ? (
          <Link
            href="/dashboard/build"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#df7a3a]/70 px-4 text-sm font-medium text-white transition hover:bg-[#df7a3a]"
          >
            <LuTicket className="h-4 w-4 mr-2" aria-hidden="true" />
            Constructor Appddata
          </Link>
        ) : null}
        </div>
      ) : null}

      {!activePackage ? <HomeDevelop compact /> : null}
    </section>
  );
}
