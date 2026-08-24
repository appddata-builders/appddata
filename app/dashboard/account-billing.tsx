"use client";

import { useState } from "react";
import { LuCircleAlert } from "react-icons/lu";

import { CompositionBar } from "@/app/components/charts/chart-parts";
import { seriesColor } from "@/app/components/charts/chart-tokens";
import InfraPanel from "@/app/dashboard/infra-panel";
import type { AccountBilling } from "@/lib/account-billing-server";
import type { InfraConsole } from "@/lib/infra-console-server";
import { useT } from "@/lib/text/text-provider";

function money(cents: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}

function bytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`;
}

const ALL = "__todos__";

/** El dominio publicado; si no hay URL, el nombre del proyecto. */
function domainLabel(project: { name: string; url: string | null }): string {
  if (!project.url) return project.name;
  try {
    return new URL(project.url).hostname.replace(/^www\./, "");
  } catch {
    return project.name;
  }
}

export default function AccountBillingCard({
  billing,
  infra = null,
}: {
  billing: AccountBilling;
  /**
   * Detalle de infraestructura, solo para root. Va DENTRO de esta seccion y
   * sigue al dominio seleccionado: es la evidencia del cargo, no un tablero
   * aparte que hable de otra cosa.
   */
  infra?: InfraConsole | null;
}) {
  const t = useT();
  const multiple = billing.projects.length > 1;
  const [selected, setSelected] = useState<string>(multiple ? ALL : (billing.projects[0]?.slug ?? ALL));

  if (billing.projects.length === 0) return null;

  const project = billing.projects.find((item) => item.slug === selected) ?? null;
  const view = project
    ? {
        base: project.charge.baseCents,
        compute: project.charge.computeCents,
        database: project.charge.databaseCents,
        platform: project.charge.platformCents,
        fee: project.charge.stripeFeeCents,
        subtotal: project.charge.subtotalCents,
        tax: project.charge.taxCents,
        total: project.charge.totalCents,
        domains: 1,
      }
    : {
        base: billing.combined.baseCents,
        compute: billing.combined.computeCents,
        database: billing.combined.databaseCents,
        platform: billing.combined.platformCents,
        fee: billing.combined.stripeFeeCents,
        subtotal: billing.combined.subtotalCents,
        tax: billing.combined.taxCents,
        total: billing.combined.totalCents,
        domains: billing.projects.length,
      };

  // Las pistas nombran el pod que genera el cargo, no solo el concepto.
  const podLabel = project
    ? project.podNames.join(", ") || t("es.dashboard.billing.noPods")
    : billing.projects.flatMap((item) => item.podNames).join(", ") || t("es.dashboard.billing.noPods");
  const computeHint = podLabel;
  // El peso del esquema solo se menciona cuando de verdad se pudo medir: un
  // cero significa que el nombre no empato, no que la base este vacia.
  const databasePods = billing.databasePods.join(", ") || t("es.dashboard.billing.defaultDatabasePod");
  const databaseHint =
    project && project.schemaBytes > 0
      ? t("es.dashboard.billing.schemaHint", { pods: databasePods, size: bytes(project.schemaBytes) })
      : databasePods;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{t("es.dashboard.billing.eyebrow")}</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-900">{t("es.dashboard.billing.title")}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("es.dashboard.billing.description")}
          </p>
        </div>
      </div>

      {multiple ? (
        <div role="group" aria-label={t("es.dashboard.billing.domain")} className="mt-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setSelected(ALL)}
            aria-pressed={selected === ALL}
            className={`h-8 rounded-md px-3 text-xs font-medium transition ${
              selected === ALL ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t("es.dashboard.billing.all", { count: billing.projects.length })}
          </button>
          {billing.projects.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => setSelected(item.slug)}
              aria-pressed={selected === item.slug}
              className={`h-8 rounded-md px-3 text-xs font-medium transition ${
                selected === item.slug ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {domainLabel(item)}
            </button>
          ))}
        </div>
      ) : null}

      {billing.note ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{billing.note}</span>
        </div>
      ) : null}

      <p className="mt-5 text-3xl font-semibold tabular-nums tracking-[-0.03em] text-slate-900">{money(view.total)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {project
          ? t("es.dashboard.billing.estimate.one", { domain: domainLabel(project) })
          : t("es.dashboard.billing.estimate.many", { count: view.domains })}
      </p>

      {/* Todo lo que forma el cargo va DENTRO de la grafica, comision incluida:
          si un concepto se cobra, se ve de que color es y cuanto pesa. */}
      <div className="mt-5">
        <CompositionBar
          segments={[
            {
              label: t("es.dashboard.billing.segment.base"),
              value: view.base,
              color: seriesColor(0),
              hint:
                view.domains === 1
                  ? t("es.dashboard.billing.segment.base.hintOne")
                  : t("es.dashboard.billing.segment.base.hintMany", {
                      count: view.domains,
                      price: money(15000),
                    }),
            },
            {
              label: t("es.dashboard.billing.segment.compute"),
              value: view.compute,
              color: seriesColor(1),
              hint: computeHint,
            },
            {
              label: t("es.dashboard.billing.segment.database"),
              value: view.database,
              color: seriesColor(2),
              hint: databaseHint,
            },
            {
              label: t("es.dashboard.billing.segment.platform"),
              value: view.platform,
              color: seriesColor(3),
              hint: t("es.dashboard.billing.segment.platform.hint"),
            },
            {
              label: t("es.dashboard.billing.segment.fee"),
              value: view.fee,
              color: seriesColor(4),
              hint: t("es.dashboard.billing.segment.fee.hint"),
            },
            {
              label: t("es.dashboard.billing.segment.tax"),
              value: view.tax,
              color: seriesColor(5),
              hint: t("es.dashboard.billing.segment.tax.hint"),
            },
          ]}
          formatValue={money}
        />
      </div>

      {!project ? (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {billing.projects.map((item) => (
            <li key={item.slug} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setSelected(item.slug)}
                className="min-w-0 truncate text-left text-sm text-slate-700 underline-offset-2 hover:underline"
              >
                {domainLabel(item)}
              </button>
              <span className="shrink-0 text-sm tabular-nums text-slate-900">{money(item.charge.subtotalCents)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-600">{t("es.dashboard.billing.subtotal")}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{money(view.subtotal)}</span>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        {t("es.dashboard.billing.fxRate", { rate: billing.fxRate.toFixed(4) })}
      </p>

      {/* El detalle interno describe UN dominio. En "Todos" no hay un sujeto
          del que hablar, asi que no se dibuja. */}
      {infra && project ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <InfraPanel initial={infra} selectedSlug={project.slug} domain={domainLabel(project)} />
        </div>
      ) : null}
    </section>
  );
}
