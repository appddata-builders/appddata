/**
 * Tokens de visualizacion del panel.
 *
 * La paleta categorica esta VALIDADA (separacion para daltonismo y vision
 * normal sobre superficie clara). No agregues ni reordenes colores sin volver a
 * correr el validador: el orden es el mecanismo de seguridad, no decoracion.
 *
 * Tres de los slots quedan bajo 3:1 de contraste contra el blanco, asi que toda
 * grafica que los use debe traer relieve: leyenda con etiqueta visible y vista
 * de tabla. Ninguna grafica identifica series solo por color.
 *
 * El panel es light-only (ver app/globals.css), asi que no hay rama oscura.
 */

/** Slots categoricos en orden fijo. Nunca se ciclan. */
export const SERIES_COLORS = [
  "#2a78d6", // azul
  "#eb6834", // naranja
  "#1baf7a", // aqua
  "#eda100", // amarillo
  "#e87ba4", // magenta
  "#008300", // verde
] as const;

/** Cuantas categorias reales se pintan antes de plegar la cola en "Otros". */
export const MAX_SERIES = 5;

/** Gris neutro del agregado "Otros": no es un slot categorico. */
export const OTHER_COLOR = "#94a3b8";

export const CHART_INK = {
  primary: "#0f172a",
  secondary: "#475569",
  muted: "#94a3b8",
  grid: "#e2e8f0",
  axis: "#cbd5e1",
  surface: "#ffffff",
} as const;

/**
 * Color por posicion en el orden fijo. El indice es la identidad de la serie,
 * no su ranking del momento: filtrar no debe repintar a las sobrevivientes.
 */
export function seriesColor(index: number): string {
  return SERIES_COLORS[index] ?? OTHER_COLOR;
}

export type FoldedSeries<T> = { name: string; color: string; items: T[]; value: number };

/**
 * Pliega una lista rankeada a `MAX_SERIES` categorias mas "Otros". Evita el
 * anti-patron de generar tonos nuevos cuando hay mas categorias que slots.
 */
export function foldToSeries<T>(
  items: T[],
  nameOf: (item: T) => string,
  valueOf: (item: T) => number,
): FoldedSeries<T>[] {
  const byName = new Map<string, T[]>();
  for (const item of items) {
    const name = nameOf(item);
    byName.set(name, [...(byName.get(name) ?? []), item]);
  }

  const ranked = [...byName.entries()]
    .map(([name, group]) => ({ name, items: group, value: group.reduce((sum, item) => sum + valueOf(item), 0) }))
    .sort((a, b) => b.value - a.value);

  const head = ranked.slice(0, MAX_SERIES).map((entry, index) => ({ ...entry, color: seriesColor(index) }));
  const tail = ranked.slice(MAX_SERIES);
  if (tail.length === 0) return head;

  return [
    ...head,
    {
      name: "Otros",
      color: OTHER_COLOR,
      items: tail.flatMap((entry) => entry.items),
      value: tail.reduce((sum, entry) => sum + entry.value, 0),
    },
  ];
}

/* ------------------------------------------------------------------ formato -- */

const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

/**
 * Todo el dinero del panel se muestra en MXN. DigitalOcean factura en USD, asi
 * que la conversion ocurre antes de formatear: el cliente nunca ve dolares.
 */
export function formatMxn(value: number): string {
  return MXN.format(value);
}

/** Monto con exactamente los decimales que pide la escala del eje. */
export function formatMxnAxis(value: number, decimals: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDay(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatTimestamp(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

/** CPU en cores, con milicores cuando el valor es menor a uno. */
export function formatCores(cores: number): string {
  if (!Number.isFinite(cores)) return "—";
  return cores < 1 ? `${Math.round(cores * 1000)} m` : `${cores.toFixed(2)} cores`;
}

/** Memoria en unidades binarias, que es como las reporta Kubernetes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Mi";
  const units = ["B", "Ki", "Mi", "Gi", "Ti"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/* ----------------------------------------------------------------- geometria -- */

/** Barra vertical con las esquinas superiores redondeadas, anclada a la base. */
export function verticalBarPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    "Z",
  ].join(" ");
}

/** Barra horizontal con las esquinas derechas redondeadas, anclada al eje. */
export function horizontalBarPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, height / 2, width));
  return [
    `M${x},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height - r}`,
    `Q${x + width},${y + height} ${x + width - r},${y + height}`,
    `H${x}`,
    "Z",
  ].join(" ");
}

/** Paso "bonito": 1/2/2.5/5 x potencia de 10, siempre >= el valor pedido. */
export function niceStep(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * Escala del eje Y.
 *
 * Devuelve las marcas explicitas en vez de solo el tope, porque dividir un tope
 * "bonito" entre N no da valores bonitos: con tope 5 y 4 divisiones salen pasos
 * de 1.25 que, redondeados a entero, se imprimen como 5/4/3/1/0. El eje se
 * construye desde el PASO, no desde el tope.
 */
export function niceScale(max: number, tickCount = 4): { max: number; ticks: number[]; step: number } {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1], step: 1 };
  const step = niceStep(max / tickCount);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let index = 0; index * step <= top + step / 2; index += 1) {
    ticks.push(Number((index * step).toPrecision(12)));
  }
  return { max: top, ticks, step };
}

/** Decimales necesarios para imprimir un paso sin perder informacion. */
export function decimalsForStep(step: number): number {
  if (Number.isInteger(step)) return 0;
  const text = String(step);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : Math.min(text.length - dot - 1, 4);
}
