"use client";

import { useState } from "react";

/**
 * Leyenda. Obligatoria en cuanto hay dos o mas series: la identidad nunca se
 * comunica solo por color.
 */
export function ChartLegend({ items }: { items: { name: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
          <span className="truncate">{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>
          {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums tracking-[-0.03em] ${
          tone === "accent" ? "text-[#b85f28]" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Barras horizontales rankeadas: una sola serie, un solo color por entidad. El
 * valor va como etiqueta visible, que es el relieve que exige la paleta.
 *
 * Se dibuja con CSS y no con SVG porque el ancho es porcentual: un path en
 * unidades de usuario dentro de un `svg width="100%"` no escala con el
 * contenedor.
 */
export function BarList({
  items,
  formatValue,
  emptyLabel = "Sin cargos en este periodo.",
}: {
  items: { label: string; sublabel?: string | null; value: number; color: string }[];
  formatValue: (value: number) => string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(...items.map((item) => item.value), 0) || 1;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.label}-${item.sublabel ?? ""}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-slate-700">
              {item.label}
              {item.sublabel ? <span className="ml-1.5 text-xs text-slate-400">{item.sublabel}</span> : null}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
              {formatValue(item.value)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2 rounded-r-full"
              style={{
                width: `${Math.max((item.value / max) * 100, 1.5)}%`,
                background: item.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Barra de composicion: una sola magnitud partida por el componente que la
 * genera, al estilo de un desglose de costos por servicio.
 *
 * Cada segmento lleva su color y su renglon en la leyenda con el monto: el
 * lector nunca depende solo del color para saber que esta viendo. Los
 * componentes que valen cero no se dibujan, para no meter rebanadas invisibles.
 */
export function CompositionBar({
  segments,
  formatValue,
}: {
  segments: { label: string; value: number; color: string; hint?: string }[];
  formatValue: (value: number) => string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return (
      <div className="flex h-16 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
        Sin cargos que desglosar.
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full">
        {visible.map((segment, index) => (
          <div
            key={segment.label}
            role="presentation"
            onMouseEnter={() => setActive(segment.label)}
            onMouseLeave={() => setActive(null)}
            title={`${segment.label}: ${formatValue(segment.value)}`}
            className={`h-full transition-opacity ${index === 0 ? "rounded-l-full" : ""} ${
              index === visible.length - 1 ? "rounded-r-full" : ""
            } ${active && active !== segment.label ? "opacity-40" : "opacity-100"}`}
            style={{ width: `${(segment.value / total) * 100}%`, background: segment.color }}
          />
        ))}
      </div>

      <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
        {visible.map((segment) => (
          <li
            key={segment.label}
            onMouseEnter={() => setActive(segment.label)}
            onMouseLeave={() => setActive(null)}
            className={`flex items-baseline justify-between gap-3 py-2.5 transition-opacity ${
              active && active !== segment.label ? "opacity-50" : "opacity-100"
            }`}
          >
            <div className="flex min-w-0 items-baseline gap-2">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: segment.color }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-700">{segment.label}</p>
                {segment.hint ? <p className="mt-0.5 text-xs leading-5 text-slate-400">{segment.hint}</p> : null}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-slate-900">{formatValue(segment.value)}</p>
              <p className="text-xs tabular-nums text-slate-400">{((segment.value / total) * 100).toFixed(1)}%</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
