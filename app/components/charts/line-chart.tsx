"use client";

import { useMemo, useState } from "react";

import { CHART_INK, decimalsForStep, niceScale } from "@/app/components/charts/chart-tokens";
import { useChartWidth } from "@/app/components/charts/use-chart-width";

export type LineSeries = { name: string; color: string; points: { t: number; v: number }[] };

type LineChartProps = {
  series: LineSeries[];
  /** Alto del area de trazo; la banda del eje X se suma aparte. */
  plotHeight?: number;
  formatValue: (value: number) => string;
  /** Rotulos del eje, con los decimales que impone el paso de la escala. */
  formatAxis: (value: number, decimals: number) => string;
  formatTime: (seconds: number) => string;
  /** Fija el tope del eje (100 para porcentajes) en vez de calcularlo. */
  maxValue?: number;
  emptyLabel?: string;
};

const MARGIN = { top: 12, right: 54, bottom: 26, left: 46 };
const GRID_LINES = 4;
/** Separacion minima entre etiquetas directas apiladas al final de las lineas. */
const LABEL_GAP = 13;

export default function LineChart({
  series,
  plotHeight = 200,
  formatValue,
  formatAxis,
  formatTime,
  maxValue,
  emptyLabel = "Sin datos en este periodo.",
}: LineChartProps) {
  const { ref, width } = useChartWidth();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const times = useMemo(() => {
    const all = new Set<number>();
    for (const line of series) for (const point of line.points) all.add(point.t);
    return [...all].sort((a, b) => a - b);
  }, [series]);

  const scale = useMemo(() => {
    const peak = maxValue ?? Math.max(0, ...series.flatMap((line) => line.points.map((point) => point.v)));
    return niceScale(peak, GRID_LINES);
  }, [series, maxValue]);

  if (times.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  const domainMax = scale.max;
  const axisDecimals = decimalsForStep(scale.step);
  const height = plotHeight + MARGIN.top + MARGIN.bottom;
  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const [firstTime, lastTime] = [times[0], times[times.length - 1]];
  const span = Math.max(lastTime - firstTime, 1);

  const xOf = (t: number) => MARGIN.left + ((t - firstTime) / span) * innerWidth;
  const yOf = (v: number) => MARGIN.top + plotHeight - (Math.min(v, domainMax) / domainMax) * plotHeight;

  // Tolerancia de emparejamiento: series distintas no muestrean en el mismo
  // instante exacto, pero si dentro del mismo intervalo.
  const tolerance = span / Math.max(times.length - 1, 1) * 1.5;
  const valueAt = (line: LineSeries, t: number) => {
    let best: { v: number; gap: number } | null = null;
    for (const point of line.points) {
      const gap = Math.abs(point.t - t);
      if (!best || gap < best.gap) best = { v: point.v, gap };
    }
    return best && best.gap <= tolerance ? best.v : null;
  };

  const hoverTime = hoverIndex === null ? null : times[hoverIndex];
  const showEndLabels = series.length <= 4;

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const ratio = (x - MARGIN.left) / innerWidth;
    const target = firstTime + Math.min(Math.max(ratio, 0), 1) * span;
    let nearest = 0;
    for (let index = 1; index < times.length; index += 1) {
      if (Math.abs(times[index] - target) < Math.abs(times[nearest] - target)) nearest = index;
    }
    setHoverIndex(nearest);
  };

  const hoverX = hoverTime === null ? 0 : xOf(hoverTime);
  // Al costado del crosshair, y volteado en la mitad derecha para no tapar
  // el tramo de las lineas que se esta leyendo.
  const flipTooltip = hoverX > width / 2;

  // Las etiquetas de fin de linea se separan verticalmente cuando dos series
  // terminan casi en el mismo valor; si no, se imprimen una encima de la otra.
  const endLabels = showEndLabels
    ? series
        .map((line) => {
          const last = line.points[line.points.length - 1];
          return last ? { name: line.name, color: line.color, value: last.v, y: yOf(last.v) } : null;
        })
        .filter((label): label is { name: string; color: string; value: number; y: number } => label !== null)
        .sort((a, b) => a.y - b.y)
        .map((label, index, all) => {
          if (index === 0) return label;
          const previous = all[index - 1].y;
          return label.y - previous < LABEL_GAP ? { ...label, y: previous + LABEL_GAP } : label;
        })
    : [];

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Serie de tiempo de ${series.map((line) => line.name).join(", ")}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
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

        {[0, 0.5, 1].map((fraction) => {
          const t = firstTime + fraction * span;
          return (
            <text
              key={fraction}
              x={xOf(t)}
              y={height - 8}
              textAnchor={fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}
              fontSize={11}
              fill={CHART_INK.muted}
            >
              {formatTime(t)}
            </text>
          );
        })}

        {hoverTime !== null ? (
          <line
            x1={xOf(hoverTime)}
            x2={xOf(hoverTime)}
            y1={MARGIN.top}
            y2={MARGIN.top + plotHeight}
            stroke={CHART_INK.axis}
            strokeWidth={1}
          />
        ) : null}

        {series.map((line) => {
          const path = line.points
            .slice()
            .sort((a, b) => a.t - b.t)
            .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(point.t)},${yOf(point.v)}`)
            .join(" ");
          return (
            <g key={`${line.name}-${line.color}`}>
              <path d={path} fill="none" stroke={line.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}

        {endLabels.map((label) => (
          <text
            key={`end-${label.name}`}
            x={width - MARGIN.right + 6}
            y={label.y + 4}
            textAnchor="start"
            fontSize={11}
            fontWeight={600}
            fill={label.color}
          >
            {formatValue(label.value)}
          </text>
        ))}

        {hoverTime !== null
          ? series.map((line) => {
              const value = valueAt(line, hoverTime);
              return value === null ? null : (
                <circle
                  key={`dot-${line.name}`}
                  cx={xOf(hoverTime)}
                  cy={yOf(value)}
                  r={4}
                  fill={line.color}
                  stroke={CHART_INK.surface}
                  strokeWidth={2}
                />
              );
            })
          : null}
      </svg>

      {hoverTime !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 w-52 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg"
          style={flipTooltip ? { right: width - hoverX + 10 } : { left: hoverX + 10 }}
        >
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-slate-400">
            {formatTime(hoverTime)}
          </p>
          <ul className="mt-1.5 space-y-1">
            {series.map((line) => {
              const value = valueAt(line, hoverTime);
              return (
                <li key={`tip-${line.name}`} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: line.color }} aria-hidden="true" />
                  <span className="truncate text-slate-600">{line.name}</span>
                  <span className="ml-auto font-semibold tabular-nums text-slate-900">
                    {value === null ? "—" : formatValue(value)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
