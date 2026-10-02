/**
 * Cliente de solo-lectura de la API de DigitalOcean.
 *
 * IMPORTANTE: lo que se lee aqui es la cuenta de DigitalOcean de Appddata (la
 * que hospeda el cluster), no la de un cliente. La factura, el saldo y el
 * consumo de los nodos son datos internos del negocio, asi que todo consumidor
 * de este modulo va detras del gate `isRoot`, igual que el explorador de bases.
 *
 * Requiere DIGITALOCEAN_TOKEN con scopes de lectura: `monitoring:read`,
 * `kubernetes:read` y acceso a facturacion.
 */

import type { ClusterCredentials } from "@/lib/kubernetes-server";

const API_BASE = "https://api.digitalocean.com";

/**
 * Cada fuente se resuelve por separado para que la consola degrade tarjeta por
 * tarjeta: si facturacion falla, las graficas de nodos siguen dibujandose.
 */
export type Attempt<T> = { ok: true; data: T } | { ok: false; error: string };

export async function attempt<T>(load: () => Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error desconocido." };
  }
}

export function isDigitalOceanConfigured(): boolean {
  return Boolean(process.env.DIGITALOCEAN_TOKEN?.trim());
}

async function doRequest<T>(path: string): Promise<T> {
  const token = process.env.DIGITALOCEAN_TOKEN?.trim();
  if (!token) throw new Error("Falta el token de infraestructura en el entorno.");

  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    // Metricas y factura cambian a cada rato: nunca servir desde cache.
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 240);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`El token de infraestructura no tiene permiso para ${path} (${response.status}).`);
    }
    throw new Error(`El proveedor de infraestructura respondio ${response.status} en ${path}. ${detail}`);
  }

  return response.json() as Promise<T>;
}

/* ------------------------------------------------------------------ tiempo -- */

/**
 * Ventana del mes en curso, en segundos epoch (lo que espera la Monitoring API).
 * El panel solo desglosa por mes: es el periodo que coincide con el ciclo de
 * facturacion de DigitalOcean, y mezclarlo con rangos cortos hacia que el costo
 * y las metricas hablaran de periodos distintos en la misma pantalla.
 */
export function monthWindow(now = new Date()): { start: number; end: number } {
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { start: Math.floor(firstOfMonth.getTime() / 1000), end: Math.floor(now.getTime() / 1000) };
}

/* -------------------------------------------------------------- facturacion -- */

export type CostSummary = {
  /** Consumido en el periodo de facturacion actual, en USD. */
  monthToDateUsage: number;
  accountBalance: number;
  monthToDateBalance: number;
  generatedAt: string | null;
  /** Proyeccion lineal a fin de mes con el ritmo de consumo actual. */
  projectedMonthEnd: number;
  daysElapsed: number;
  daysInMonth: number;
};

type BalanceResponse = {
  month_to_date_balance?: string;
  account_balance?: string;
  month_to_date_usage?: string;
  generated_at?: string;
};

function toNumber(value: string | number | undefined | null): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getCostSummary(now = new Date()): Promise<CostSummary> {
  const balance = await doRequest<BalanceResponse>("/v2/customers/my/balance");
  return buildCostSummary(toNumber(balance.month_to_date_usage), balance, now);
}

/**
 * Arma el resumen a partir de un consumo ya resuelto. Existe aparte porque el
 * consumo tiene dos origenes: `/balance` y, si ese falla o vuelve en cero, la
 * suma de la factura preview.
 */
export function buildCostSummary(
  monthToDateUsage: number,
  balance: BalanceResponse,
  now = new Date(),
  /**
   * Proyeccion calculada por fuera con el ritmo reciente. Sin ella se usa el
   * promedio desde el dia 1, que subestima muchisimo cuando el recurso se creo
   * a mitad de mes: un cluster de dos dias parece costar una decima parte.
   */
  projectedOverride?: number,
): CostSummary {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Fraccion de dia incluida: a las 12:00 del dia 3 van 2.5 dias, no 3.
  const daysElapsed = Math.max(
    now.getDate() - 1 + (now.getHours() * 60 + now.getMinutes()) / 1440,
    1 / 24,
  );

  return {
    monthToDateUsage,
    accountBalance: toNumber(balance.account_balance),
    monthToDateBalance: toNumber(balance.month_to_date_balance),
    generatedAt: balance.generated_at ?? null,
    projectedMonthEnd: projectedOverride ?? (monthToDateUsage / daysElapsed) * daysInMonth,
    daysElapsed,
    daysInMonth,
  };
}

export type { BalanceResponse };

/**
 * Lineas de la factura que NO son consumo: creditos promocionales, descuentos y
 * ajustes. Son de la cuenta de Appddata y no deben abaratarle nada al cliente,
 * asi que se excluyen del calculo: lo que se cobra es el consumo neto.
 */
const CREDIT_ITEM = /credit|cr[eé]dito|discount|descuento|promo|adjustment|ajuste|refund|trial/i;

/**
 * Un renglon NEGATIVO es un credito por definicion, se llame como se llame.
 * DigitalOcean etiqueta algunos como "Inference Cloud Trial", que ninguna lista
 * de palabras iba a atrapar; el signo si.
 */
function isCreditItem(product: string, description: string, amount: number): boolean {
  return amount < 0 || CREDIT_ITEM.test(product) || CREDIT_ITEM.test(description);
}

export type CostBreakdownItem = {
  product: string;
  /** Nombre del recurso concreto (cluster, base, bucket) cuando DO lo agrupa. */
  group: string | null;
  amount: number;
};

type InvoicePreviewResponse = {
  invoice_items?: {
    product?: string;
    description?: string;
    group_description?: string;
    amount?: string;
  }[];
};

/**
 * Desglose del mes en curso por producto. `preview` es la factura que DO
 * regenera a diario con el consumo acumulado del periodo abierto.
 */
export async function getCostBreakdown(): Promise<CostBreakdownItem[]> {
  const preview = await doRequest<InvoicePreviewResponse>(
    "/v2/customers/my/invoices/preview?per_page=200",
  );

  const totals = new Map<string, CostBreakdownItem>();
  for (const item of preview.invoice_items ?? []) {
    const product = item.product?.trim() || "Otros";
    const group = item.group_description?.trim() || null;
    if (isCreditItem(product, item.description ?? "", toNumber(item.amount))) continue;
    const key = `${product}::${group ?? ""}`;
    const current = totals.get(key);
    if (current) current.amount += toNumber(item.amount);
    else totals.set(key, { product, group, amount: toNumber(item.amount) });
  }

  return [...totals.values()]
    .filter((item) => item.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
}

export type DailyCostPoint = { date: string; total: number; byProduct: Record<string, number> };

type InsightsResponse = {
  data_points?: {
    start_date?: string;
    sku?: string;
    description?: string;
    group_description?: string;
    total_amount?: string;
  }[];
};

/**
 * Etiqueta de producto para la serie diaria.
 *
 * El SKU de DigitalOcean no es legible ("1-KS-K8SWN-00106"), asi que la familia
 * sale del texto: `group_description` cuando viene ("HTTP Load Balancers") y si
 * no, la descripcion sin los parentesis, que es donde DO mete el detalle por
 * recurso ("Container Registry (basic)" -> "Container Registry"). Agrupar por
 * la descripcion completa generaria una categoria por recurso y la grafica
 * saldria de un solo color.
 */
function productLabel(point: { group_description?: string; description?: string }): string {
  const group = point.group_description?.trim();
  if (group) return group;

  const description = point.description?.trim();
  if (!description) return "Otros";
  const clean = description.replace(/\s*\([^)]*\)/g, "").trim();
  return clean || description;
}

type AccountResponse = { account?: { uuid?: string; team?: { uuid?: string } } };

/**
 * Serie diaria del gasto. El endpoint de insights pide el URN de la cuenta y no
 * esta en el OpenAPI publico, asi que se prueban las dos formas conocidas
 * (equipo y cuenta) y se deja que el llamador degrade si ninguna responde.
 *
 * DO advierte que la suma de los items nocturnos no cuadra exactamente con el
 * total de la factura: sirve para ver la tendencia, no para conciliar.
 */
export async function getDailyCost(start: Date, end: Date): Promise<DailyCostPoint[]> {
  const account = await doRequest<AccountResponse>("/v2/account");
  const candidates = [account.account?.team?.uuid, account.account?.uuid]
    .filter((uuid): uuid is string => Boolean(uuid))
    .flatMap((uuid) => [`do:team:${uuid}`, `do:account:${uuid}`]);

  if (candidates.length === 0) throw new Error("La cuenta de DigitalOcean no devolvio un UUID.");

  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  let lastError = "";
  for (const urn of candidates) {
    try {
      const insights = await doRequest<InsightsResponse>(
        `/v2/billing/${encodeURIComponent(urn)}/insights/${from}/${to}?per_page=500`,
      );
      return foldDailyCost(insights.data_points ?? []);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Error desconocido.";
    }
  }
  throw new Error(`No se pudo leer el gasto diario. ${lastError}`);
}

function foldDailyCost(points: NonNullable<InsightsResponse["data_points"]>): DailyCostPoint[] {
  const byDate = new Map<string, DailyCostPoint>();
  for (const point of points) {
    const date = point.start_date?.slice(0, 10);
    if (!date) continue;
    const amount = toNumber(point.total_amount);
    if (isCreditItem(point.sku ?? "", point.description ?? "", amount)) continue;
    const product = productLabel(point);
    const entry = byDate.get(date) ?? { date, total: 0, byProduct: {} };
    entry.total += amount;
    entry.byProduct[product] = (entry.byProduct[product] ?? 0) + amount;
    byDate.set(date, entry);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Consumo NETO de un mes ya cerrado, en USD.
 *
 * Para un periodo cerrado no hay que proyectar nada: se suman los cortes
 * diarios reales del mes. Devuelve tambien la parte atribuible al cluster, que
 * es la unica que se reparte entre los dominios.
 */
export async function getPeriodConsumption(
  period: string,
  isClusterProduct: (product: string) => boolean,
): Promise<{ netUsd: number; clusterUsd: number }> {
  const [year, month] = period.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  const points = await getDailyCost(from, to);
  let netUsd = 0;
  let clusterUsd = 0;
  for (const point of points) {
    for (const [product, amount] of Object.entries(point.byProduct)) {
      netUsd += amount;
      if (isClusterProduct(product)) clusterUsd += amount;
    }
  }
  return { netUsd, clusterUsd };
}

/* ----------------------------------------------------------------- cluster -- */

export type ClusterNode = { id: string; name: string; dropletId: string; status: string };
export type ClusterNodePool = { id: string; name: string; size: string; count: number; nodes: ClusterNode[] };
export type ClusterInfo = {
  id: string;
  name: string;
  region: string;
  version: string;
  status: string;
  createdAt: string | null;
  nodePools: ClusterNodePool[];
};

type ClustersResponse = {
  kubernetes_clusters?: {
    id?: string;
    name?: string;
    region?: string;
    version?: string;
    created_at?: string;
    status?: { state?: string };
    node_pools?: {
      id?: string;
      name?: string;
      size?: string;
      count?: number;
      nodes?: { id?: string; name?: string; droplet_id?: string; status?: { state?: string } }[];
    }[];
  }[];
};

export async function getClusters(): Promise<ClusterInfo[]> {
  const response = await doRequest<ClustersResponse>("/v2/kubernetes/clusters");
  return (response.kubernetes_clusters ?? []).map((cluster) => ({
    id: cluster.id ?? "",
    name: cluster.name ?? "sin nombre",
    region: (cluster.region ?? "").toUpperCase(),
    version: cluster.version ?? "",
    status: cluster.status?.state ?? "desconocido",
    createdAt: cluster.created_at ?? null,
    nodePools: (cluster.node_pools ?? []).map((pool) => ({
      id: pool.id ?? "",
      name: pool.name ?? "sin nombre",
      size: pool.size ?? "",
      count: pool.count ?? 0,
      nodes: (pool.nodes ?? [])
        .filter((node) => node.droplet_id)
        .map((node) => ({
          id: node.id ?? "",
          name: node.name ?? "sin nombre",
          dropletId: String(node.droplet_id),
          status: node.status?.state ?? "desconocido",
        })),
    })),
  }));
}

/**
 * Credenciales para el API server del cluster.
 *
 * Se usa la vigencia por omision de DigitalOcean (7 dias) en vez de pedir una
 * corta: el token solo vive en memoria durante la peticion, y acotarlo mas solo
 * agrega una variable propia si el cluster llega a rechazarlo.
 */
export async function getClusterCredentials(clusterId: string): Promise<ClusterCredentials> {
  const response = await doRequest<{
    server?: string;
    certificate_authority_data?: string;
    token?: string;
  }>(`/v2/kubernetes/clusters/${encodeURIComponent(clusterId)}/credentials`);

  if (!response.server || !response.token || !response.certificate_authority_data) {
    throw new Error(
      "El cluster no entrego credenciales por token. Requiere autenticacion por certificado, no soportada aqui.",
    );
  }

  return {
    server: response.server,
    token: response.token,
    ca: Buffer.from(response.certificate_authority_data, "base64"),
  };
}

/* ---------------------------------------------------------------- metricas -- */

type MetricResponse = {
  data?: {
    result?: { metric?: Record<string, string>; values?: [number, string][] }[];
  };
};

export type SeriesPoint = { t: number; v: number };
export type NodeSeries = { nodeName: string; dropletId: string; points: SeriesPoint[] };

async function dropletMetric(metric: string, hostId: string, start: number, end: number) {
  const query = new URLSearchParams({ host_id: hostId, start: String(start), end: String(end) });
  const response = await doRequest<MetricResponse>(
    `/v2/monitoring/metrics/droplet/${metric}?${query.toString()}`,
  );
  return response.data?.result ?? [];
}

/**
 * CPU en porcentaje de uso.
 *
 * La Monitoring API devuelve contadores ACUMULADOS por modo (idle, user,
 * system...), no un porcentaje: hay que derivarlos entre muestras consecutivas
 * y calcular `1 - idle/total` sobre cada delta. Leer el valor crudo como si
 * fuera un porcentaje es el error clasico con este endpoint.
 */
export async function getNodeCpu(node: ClusterNode, start: number, end: number): Promise<NodeSeries> {
  const result = await dropletMetric("cpu", node.dropletId, start, end);

  const modes = result.map((series) => ({
    mode: series.metric?.mode ?? "",
    values: series.values ?? [],
  }));
  const sampleCount = Math.min(...modes.map((series) => series.values.length));
  const points: SeriesPoint[] = [];

  for (let index = 1; index < sampleCount; index += 1) {
    let totalDelta = 0;
    let idleDelta = 0;
    for (const series of modes) {
      const delta = Number(series.values[index][1]) - Number(series.values[index - 1][1]);
      if (!Number.isFinite(delta) || delta < 0) continue;
      totalDelta += delta;
      if (series.mode === "idle") idleDelta += delta;
    }
    if (totalDelta <= 0) continue;
    points.push({
      t: modes[0].values[index][0],
      v: Math.min(Math.max((1 - idleDelta / totalDelta) * 100, 0), 100),
    });
  }

  return { nodeName: node.name, dropletId: node.dropletId, points };
}

/**
 * Memoria en porcentaje de uso: `(total - available) / total`. Se usa
 * `memory_available` y no `memory_free` porque el cache reclamable no es
 * memoria ocupada, y contarla infla la grafica.
 */
export async function getNodeMemory(node: ClusterNode, start: number, end: number): Promise<NodeSeries> {
  const [totalResult, availableResult] = await Promise.all([
    dropletMetric("memory_total", node.dropletId, start, end),
    dropletMetric("memory_available", node.dropletId, start, end),
  ]);

  const totals = totalResult[0]?.values ?? [];
  const available = new Map((availableResult[0]?.values ?? []).map(([t, v]) => [t, Number(v)]));

  const points: SeriesPoint[] = [];
  for (const [timestamp, rawTotal] of totals) {
    const total = Number(rawTotal);
    const free = available.get(timestamp);
    if (!Number.isFinite(total) || total <= 0 || free === undefined || !Number.isFinite(free)) continue;
    points.push({ t: timestamp, v: Math.min(Math.max(((total - free) / total) * 100, 0), 100) });
  }

  return { nodeName: node.name, dropletId: node.dropletId, points };
}

/** Ancho de banda publico en Mbps (la API ya entrega Mbps, no bytes). */
export async function getNodeBandwidth(
  node: ClusterNode,
  direction: "inbound" | "outbound",
  start: number,
  end: number,
): Promise<NodeSeries> {
  const query = new URLSearchParams({
    host_id: node.dropletId,
    interface: "public",
    direction,
    start: String(start),
    end: String(end),
  });
  const response = await doRequest<MetricResponse>(
    `/v2/monitoring/metrics/droplet/bandwidth?${query.toString()}`,
  );
  const values = response.data?.result?.[0]?.values ?? [];
  return {
    nodeName: node.name,
    dropletId: node.dropletId,
    points: values
      .map(([t, v]) => ({ t, v: Number(v) }))
      .filter((point) => Number.isFinite(point.v)),
  };
}
