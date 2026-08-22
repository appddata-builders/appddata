"use client";

import { useState } from "react";

import { CHART_INK, decimalsForStep, niceScale, verticalBarPath } from "@/app/components/charts/chart-tokens";
import { useChartWidth } from "@/app/components/charts/use-chart-width";

export type StackedSeries = { name: string; color: string; values: number[] };

type StackedBarChartProps = {
  categories: { key: string; label: string }[];
  /** Cada `values` va alineado con `categories` por indice. */
  series: StackedSeries[];
  formatValue: (value: number) => string;
  /** Rotulos del eje, con los decimales que impone el paso de la escala. */
  formatAxis: (value: number, decimals: number) => string;
  plotHeight?: number;
  emptyLabel?: string;
};

const MARGIN = { top: 12, right: 16, bottom: 26, left: 52 };
const GRID_LINES = 4;
/** Hueco de superficie entre segmentos apilados: separa sin dibujar bordes. */
const SEGMENT_GAP = 2;

export default function StackedBarChart({
  categories,
  series,
  formatValue,
  formatAxis,
  plotHeight = 200,
  emptyLabel = "Sin datos en este periodo.",
}: StackedBarChartProps) {
  const { ref, width } = useChartWidth();
  const [hovered, setHovered] = useState<number | null>(null);

  if (categories.length === 0 || series.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  const totals = categories.map((_, index) =>
    series.reduce((sum, line) => sum + (line.values[index] ?? 0), 0),
  );
  const scale = niceScale(Math.max(...totals, 0), GRID_LINES);
  const domainMax = scale.max;
  const axisDecimals = decimalsForStep(scale.step);

  const height = plotHeight + MARGIN.top + MARGIN.bottom;
  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const band = innerWidth / categories.length;
  const barWidth = Math.min(band * 0.66, 30);
  const yOf = (value: number) => MARGIN.top + plotHeight - (value / domainMax) * plotHeight;
  const bandCenter = (index: number) => MARGIN.left + band * index + band / 2;

  // Se etiqueta uno de cada N para que las fechas no se encimen.
  const labelStep = Math.max(1, Math.ceil(categories.length / Math.max(Math.floor(innerWidth / 52), 1)));
  const hoverX = hovered === null ? 0 : bandCenter(hovered);
  // A la derecha de la barra, salvo en la mitad derecha del area, donde se
  // voltea: centrarlo taparia la barra consultada.
  const flipTooltip = hoverX > width / 2;

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label="Gasto diario por producto">
        {scale.ticks.map((value) => {
          const y = yOf(value);
          return (
            <g key={value}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y} y2={y} stroke={CHART_INK.grid} strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill={CHART_INK.muted}>
                {formatAxis(value, axisDecimals)}
              </text>
            </g>
          );
        })}

        {categories.map((category, index) => {
          let cursor = MARGIN.top + plotHeight;
          const segments = series.map((line) => {
            const value = line.values[index] ?? 0;
            if (value <= 0) return null;
            const rawHeight = (value / domainMax) * plotHeight;
            const top = cursor - rawHeight;
            cursor = top;
            return { line, value, top, height: rawHeight };
          });

          const topMost = segments.reduce<number>(
            (best, segment, position) => (segment ? position : best),
            -1,
          );

          return (
            <g key={category.key}>
              {segments.map((segment, position) => {
                if (!segment) return null;
                const gapped = Math.max(segment.height - (position === topMost ? 0 : SEGMENT_GAP), 1);
                const x = bandCenter(index) - barWidth / 2;
                const y = segment.top + (segment.height - gapped);
                return (
                  <path
                    key={`${category.key}-${segment.line.name}`}
                    d={
                      position === topMost
                        ? verticalBarPath(x, y, barWidth, gapped, 4)
                        : verticalBarPath(x, y, barWidth, gapped, 0)
                    }
                    fill={segment.line.color}
                    opacity={hovered === null || hovered === index ? 1 : 0.35}
                  />
                );
              })}
              {index % labelStep === 0 ? (
                <text x={bandCenter(index)} y={height - 8} textAnchor="middle" fontSize={11} fill={CHART_INK.muted}>
                  {category.label}
                </text>
              ) : null}
              {/* Blanco de hover mas ancho que la barra: el objetivo no es el mark. */}
              <rect
                x={MARGIN.left + band * index}
                y={MARGIN.top}
                width={band}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>

      {hovered !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg"
          style={flipTooltip ? { right: width - hoverX + 10 } : { left: hoverX + 10 }}
        >
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-slate-400">
            {categories[hovered].label}
          </p>
          <ul className="mt-1.5 space-y-1">
            {series.map((line) => {
              const value = line.values[hovered] ?? 0;
              return value <= 0 ? null : (
                <li key={`tip-${line.name}`} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: line.color }} aria-hidden="true" />
                  <span className="truncate text-slate-600">{line.name}</span>
                  <span className="ml-auto font-semibold tabular-nums text-slate-900">{formatValue(value)}</span>
                </li>
              );
            })}
            <li className="flex items-center gap-1.5 border-t border-slate-100 pt-1 text-xs">
              <span className="text-slate-500">Total</span>
              <span className="ml-auto font-semibold tabular-nums text-slate-900">
                {formatValue(totals[hovered])}
              </span>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
