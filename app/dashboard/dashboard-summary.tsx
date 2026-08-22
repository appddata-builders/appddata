"use client";

import { LuGlobe, LuHammer, LuTicket } from "react-icons/lu";
import Link from "next/link";

import HomeDevelop from "@/app/components/home/home-develop";
import AccountBillingCard from "@/app/dashboard/account-billing";
import {
  sitePackageBadgeBackground,
  SitePackageIcon,
  SitePackageName,
} from "@/app/components/packages/site-package-identity";
import IminMark from "@/app/components/imin/imin-mark";
import type { AccountSite } from "@/lib/account-summary-server";
import type { AccountBilling } from "@/lib/account-billing-server";
import type { InfraConsole } from "@/lib/infra-console-server";
import type { PanelPlan } from "@/lib/plans";
import { getSitePackage, SITE_PACKAGES } from "@/lib/site-packages";

type DashboardSummaryProps = {
  plan: PanelPlan;
  sites: AccountSite[];
  /** Cobro por dominio: lo ve cualquier cliente. */
  billing: AccountBilling;
  /** Solo llega para cuentas root; para el resto es `null` y no se dibuja. */
  infra: InfraConsole | null;
};

/** El dominio publicado; si aun no hay URL, el nombre del proyecto. */
function siteDomain(site: AccountSite): string {
  if (!site.url) return site.name;
  try {
    return new URL(site.url).hostname.replace(/^www\./, "");
  } catch {
    return site.name;
  }
}

/**
 * Aviso de compra pendiente de usar.
 *
 * Antes esto ocupaba el titulo principal de la pantalla, lo que dejaba el
 * resumen sin encabezado propio y hacia que un estado transitorio se leyera
 * como la identidad de la cuenta. Ahora es una alerta contextual arriba del
 * resumen, con la accion al lado.
 */
function PendingPackageAlert({ availableSites }: { availableSites: number }) {
  const count = Math.max(availableSites, 1);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#f3c49f] bg-[#fff8f1] p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-[#f3c49f]">
          <LuTicket className="h-4 w-4 text-[#df7a3a]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#8a4718]">
            {count === 1 ? "Tienes 1 sitio por construir" : `Tienes ${count} sitios por construir`}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-[#a3673a]">
            El pago fue confirmado. Abre el Constructor Appddata para crear y vincular lo que incluye tu compra.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/build"
        className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#df7a3a] px-3.5 text-sm font-medium text-white transition hover:bg-[#c96a2f] sm:w-auto"
      >
        <LuHammer className="h-4 w-4" aria-hidden="true" />
        Construir
      </Link>
    </div>
  );
}

function SummaryBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

export default function DashboardSummary({
  plan,
  sites,
  billing,
  infra,
}: DashboardSummaryProps) {
  const activePackage = getSitePackage(plan.sitePlan);
  const publishedSites = sites.filter((site) => site.url);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      {plan.hasUnassignedSitePackage ? <PendingPackageAlert availableSites={plan.availableSites} /> : null}

      {activePackage || plan.hasUnassignedSitePackage || sites.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Resumen de cuenta</p>
          <h1 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-2xl">
            {activePackage ? (
              <>
                Tu sitio esta en el paquete{" "}
                <SitePackageName plan={activePackage.id}>{activePackage.name}</SitePackageName>
              </>
            ) : (
              "Tu cuenta Appddata"
            )}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-bold tracking-[0.08em] ${sitePackageBadgeBackground(
                activePackage?.id ?? "free",
              )}`}
            >
              <SitePackageIcon plan={activePackage?.id ?? "free"} className="h-3.5 w-3.5" />
              <SitePackageName plan={activePackage?.id ?? "free"}>
                {activePackage?.name ?? "Gratis"}
              </SitePackageName>
            </span>
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
                <span
                  key={sitePackage.id}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#f3c49f] bg-[#fff4e8] px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b85f28]"
                >
                  <LuTicket className="h-3.5 w-3.5 text-[#df7a3a]" aria-hidden="true" />
                  {count} {count === 1 ? "sitio" : "sitios"} {sitePackage.name}
                </span>
              ) : null;
            })}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SummaryBlock label="Paquete">
              <p className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-900">
                {activePackage?.name ?? "Sin paquete"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {activePackage
                  ? activePackage.capacity
                  : "Elige un paquete para publicar tu primer sitio."}
              </p>
              {plan.availableSites > 0 ? (
                <p className="mt-2 text-xs font-medium text-[#b85f28]">
                  {plan.availableSites} {plan.availableSites === 1 ? "sitio disponible" : "sitios disponibles"} por
                  construir
                </p>
              ) : null}
            </SummaryBlock>

            <SummaryBlock label="Sitios">
              <p className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-900">{sites.length}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {sites.length === 0
                  ? "Todavia no has creado sitios."
                  : `${publishedSites.length} ${publishedSites.length === 1 ? "publicado" : "publicados"}`}
              </p>
              {sites.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5">
                  {sites.slice(0, 3).map((site) => (
                    <li key={site.slug} className="flex items-center gap-1.5 text-xs">
                      <LuGlobe
                        className={`h-3.5 w-3.5 shrink-0 ${site.url ? "text-emerald-600" : "text-slate-300"}`}
                        aria-hidden="true"
                      />
                      {site.url ? (
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-slate-700 underline-offset-2 hover:underline"
                        >
                          {siteDomain(site)}
                        </a>
                      ) : (
                        <span className="truncate text-slate-500">{siteDomain(site)}</span>
                      )}
                      <span className="ml-auto shrink-0 text-[0.65rem] uppercase tracking-[0.12em] text-slate-400">
                        {site.url ? "Publicado" : "Sin vincular"}
                      </span>
                    </li>
                  ))}
                  {sites.length > 3 ? (
                    <li className="text-xs text-slate-400">y {sites.length - 3} mas</li>
                  ) : null}
                </ul>
              ) : null}
            </SummaryBlock>

          </div>
        </div>
      ) : null}

      <AccountBillingCard billing={billing} infra={infra} />

      {!activePackage ? <HomeDevelop compact /> : null}
    </section>
  );
}
