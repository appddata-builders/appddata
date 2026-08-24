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
import { getSitePackage, SITE_PACKAGES, sitePackageKey } from "@/lib/site-packages";
import { useT } from "@/lib/text/text-provider";

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
  const t = useT();
  const count = Math.max(availableSites, 1);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#f3c49f] bg-[#fff8f1] p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-[#f3c49f]">
          <LuTicket className="h-4 w-4 text-[#df7a3a]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#8a4718]">
            {count === 1
              ? t("es.dashboard.summary.pending.one")
              : t("es.dashboard.summary.pending.many", { count })}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-[#a3673a]">
            {t("es.dashboard.summary.pending.description")}
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/build"
        className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#df7a3a] px-3.5 text-sm font-medium text-white transition hover:bg-[#c96a2f] sm:w-auto"
      >
        <LuHammer className="h-4 w-4" aria-hidden="true" />
        {t("es.dashboard.summary.pending.action")}
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
  const t = useT();
  const activePackage = getSitePackage(plan.sitePlan);
  const publishedSites = sites.filter((site) => site.url);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      {plan.hasUnassignedSitePackage ? <PendingPackageAlert availableSites={plan.availableSites} /> : null}

      {activePackage || plan.hasUnassignedSitePackage || sites.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{t("es.dashboard.summary.eyebrow")}</p>
          <h1 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-2xl">
            {activePackage ? (
              <>
                {t("es.dashboard.summary.title")}{" "}
                <SitePackageName plan={activePackage.id}>
                  {t(sitePackageKey(activePackage.id, "name"))}
                </SitePackageName>
              </>
            ) : (
              t("es.dashboard.summary.titleNoPackage")
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
                {t(sitePackageKey(activePackage?.id ?? "free", "name"))}
              </SitePackageName>
            </span>
            {plan.hasImin ? (
              <span
                className="inline-grid h-9 w-9 place-items-center rounded-full border border-amber-200 bg-amber-50"
                title={t("es.dashboard.summary.iminIncluded")}
                aria-label={t("es.dashboard.summary.iminIncluded")}
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
                  {t(count === 1 ? "es.dashboard.summary.ticket.one" : "es.dashboard.summary.ticket.many", {
                    count,
                    name: t(sitePackageKey(sitePackage.id, "name")),
                  })}
                </span>
              ) : null;
            })}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SummaryBlock label={t("es.dashboard.summary.package.label")}>
              <p className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-900">
                {activePackage
                  ? t(sitePackageKey(activePackage.id, "name"))
                  : t("es.dashboard.summary.package.none")}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {activePackage
                  ? t(sitePackageKey(activePackage.id, "capacity"))
                  : t("es.dashboard.summary.package.hint")}
              </p>
              {plan.availableSites > 0 ? (
                <p className="mt-2 text-xs font-medium text-[#b85f28]">
                  {t(
                    plan.availableSites === 1
                      ? "es.dashboard.summary.package.available.one"
                      : "es.dashboard.summary.package.available.many",
                    { count: plan.availableSites },
                  )}
                </p>
              ) : null}
            </SummaryBlock>

            <SummaryBlock label={t("es.dashboard.summary.sites.label")}>
              <p className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-900">{sites.length}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {sites.length === 0
                  ? t("es.dashboard.summary.sites.empty")
                  : t(
                      publishedSites.length === 1
                        ? "es.dashboard.summary.sites.published.one"
                        : "es.dashboard.summary.sites.published.many",
                      { count: publishedSites.length },
                    )}
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
                        {site.url
                          ? t("es.dashboard.summary.sites.state.published")
                          : t("es.dashboard.summary.sites.state.unlinked")}
                      </span>
                    </li>
                  ))}
                  {sites.length > 3 ? (
                    <li className="text-xs text-slate-400">
                      {t("es.dashboard.summary.sites.more", { count: sites.length - 3 })}
                    </li>
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
