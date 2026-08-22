/**
 * Compone la carga util del panel de infraestructura.
 *
 * Cada fuente se resuelve por separado a proposito: la API de DigitalOcean
 * puede tener el scope de monitoreo pero no el de facturacion (o al reves), y
 * una tarjeta rota no debe tumbar la pantalla completa. Por eso todo viaja
 * envuelto en `Attempt` y la vista dibuja el error por tarjeta.
 *
 * El periodo es siempre el mes en curso: es el ciclo con el que factura
 * DigitalOcean, y asi el costo y las metricas hablan del mismo lapso.
 */
import {
  attempt,
  buildCostSummary,
  getClusterCredentials,
  getClusters,
  getCostBreakdown,
  getCostSummary,
  getDailyCost,
  getNodeCpu,
  getNodeMemory,
  isDigitalOceanConfigured,
  monthWindow,
  type Attempt,
  type ClusterInfo,
  type ClusterNode,
  type CostBreakdownItem,
  type CostSummary,
  type DailyCostPoint,
  type NodeSeries,
} from "@/lib/digitalocean-server";
import { listNamespacePods, listProjectNamespaces, type PodInfo } from "@/lib/kubernetes-server";
import { getSchemaSizes, type SchemaSize } from "@/lib/postgres-schemas-server";
import { getUsdMxnRate, type FxRate } from "@/lib/fx-rate-server";

export type ProjectWorkload = {
  /** El namespace ES el proyecto: appddata, refautomex, etc. */
  namespace: string;
  pods: PodInfo[];
  runningPods: number;
  cpuUsage: number;
  memoryUsage: number;
  cpuRequest: number;
  memoryRequest: number;
  /** false cuando metrics-server no reporto ningun pod del namespace. */
  hasUsage: boolean;
};

export type InfraConsole = {
  configured: boolean;
  /** Tipo de cambio en vivo con el que se convierte a MXN. DO factura en USD. */
  fx: FxRate;
  start: number;
  end: number;
  cost: Attempt<CostSummary>;
  breakdown: Attempt<CostBreakdownItem[]>;
  daily: Attempt<DailyCostPoint[]>;
  clusters: Attempt<ClusterInfo[]>;
  cpu: Attempt<NodeSeries[]>;
  memory: Attempt<NodeSeries[]>;
  workloads: Attempt<ProjectWorkload[]>;
  /** Peso de cada esquema: reparte el costo del pod de la base por dominio. */
  schemas: Attempt<SchemaSize[]>;
};

const NOT_CONFIGURED = "Falta el token de infraestructura (DIGITALOCEAN_TOKEN). Sin el no hay lecturas de consumo.";
/** Falta el droplet detras del nodo: sin el, la Monitoring API no tiene que medir. */
const NO_NODES = "El cluster no reporta nodos con droplet asociado.";
/** Los pods no dependen del droplet, sino de poder hablarle al API server. */
const NO_CLUSTER_ACCESS = "No se pudo leer el cluster para listar los pods del proyecto.";

export async function getInfraConsole(): Promise<InfraConsole> {
  const now = new Date();
  const { start, end } = monthWindow(now);

  if (!isDigitalOceanConfigured()) {
    const missing = { ok: false, error: NOT_CONFIGURED } as const;
    return {
      configured: false,
      fx: await getUsdMxnRate(),
      start,
      end,
      cost: missing,
      breakdown: missing,
      daily: missing,
      clusters: missing,
      cpu: missing,
      memory: missing,
      workloads: missing,
      schemas: missing,
    };
  }

  const [fx, rawCost, breakdown, daily, clusters, schemas] = await Promise.all([
    getUsdMxnRate(),
    attempt(() => getCostSummary(now)),
    attempt(() => getCostBreakdown()),
    attempt(() => getDailyCost(new Date(start * 1000), now)),
    attempt(() => getClusters()),
    attempt(() => getSchemaSizes()),
  ]);

  const cost = withNetConsumption(rawCost, breakdown, daily, now);

  const nodes: ClusterNode[] = clusters.ok
    ? clusters.data.flatMap((cluster) => cluster.nodePools.flatMap((pool) => pool.nodes))
    : [];

  const [cpu, memory, workloads] = await Promise.all([
    nodes.length
      ? attempt(() => Promise.all(nodes.map((node) => getNodeCpu(node, start, end))))
      : Promise.resolve({ ok: false, error: NO_NODES } as Attempt<NodeSeries[]>),
    nodes.length
      ? attempt(() => Promise.all(nodes.map((node) => getNodeMemory(node, start, end))))
      : Promise.resolve({ ok: false, error: NO_NODES } as Attempt<NodeSeries[]>),
    clusters.ok && clusters.data[0]
      ? attempt(() => getWorkloads(clusters.data[0].id))
      : Promise.resolve({ ok: false, error: NO_CLUSTER_ACCESS } as Attempt<ProjectWorkload[]>),
  ]);

  return {
    configured: true,
    fx,
    start,
    end,
    cost,
    breakdown,
    daily,
    clusters,
    cpu,
    memory,
    workloads,
    schemas,
  };
}

/**
 * Cache corto en memoria.
 *
 * El resumen de la cuenta lo abre cualquier cliente y esta carga dispara una
 * decena de llamadas a DigitalOcean mas una consulta al cluster. Sin cache,
 * cada visita al panel pagaria esa latencia y se acercaria al limite de tasa
 * de la API.
 */
const CACHE_TTL_MS = 60_000;
let cached: { at: number; value: InfraConsole } | null = null;

export async function getInfraConsoleCached(): Promise<InfraConsole> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  const value = await getInfraConsole();
  cached = { at: Date.now(), value };
  return value;
}

/** Invalida el cache para que el boton de actualizar traiga datos frescos. */
export function clearInfraConsoleCache(): void {
  cached = null;
}

/**
 * Consumo NETO del mes.
 *
 * Se prefiere la suma del desglose sobre `/balance` por dos razones: el
 * desglose ya viene sin lineas de credito ni descuentos (esos son de la cuenta
 * de Appddata y no deben abaratarle el cobro al cliente), y funciona aunque el
 * token no alcance para leer el saldo. `/balance` queda como respaldo.
 */
function withNetConsumption(
  cost: Attempt<CostSummary>,
  breakdown: Attempt<CostBreakdownItem[]>,
  daily: Attempt<DailyCostPoint[]>,
  now: Date,
): Attempt<CostSummary> {
  const projected = daily.ok ? projectFromRunRate(daily.data, now) : null;

  if (breakdown.ok) {
    const net = breakdown.data.reduce((sum, item) => sum + item.amount, 0);
    if (net > 0) return { ok: true, data: buildCostSummary(net, {}, now, projected ?? undefined) };
  }
  if (cost.ok && projected !== null) {
    return { ok: true, data: { ...cost.data, projectedMonthEnd: projected } };
  }
  return cost;
}

/** Cuantos dias completos se promedian para estimar el ritmo actual. */
const RUN_RATE_DAYS = 3;

/**
 * Proyeccion a fin de mes con el ritmo de los ultimos dias COMPLETOS.
 *
 * Promediar desde el dia 1 supone que la infraestructura existio todo el mes.
 * Un cluster creado hace dos dias lleva poco gasto acumulado y esa division lo
 * proyecta ridiculamente bajo, aunque su costo diario ya sea el definitivo. El
 * ritmo reciente es lo que de verdad se va a facturar el resto del mes.
 */
function projectFromRunRate(points: DailyCostPoint[], now: Date): number | null {
  const today = now.toISOString().slice(0, 10);
  // El dia en curso va incompleto: incluirlo subestima el ritmo.
  const complete = points.filter((point) => point.date < today && point.total > 0);
  if (complete.length === 0) return null;

  const recent = complete.slice(-RUN_RATE_DAYS);
  const perDay = recent.reduce((sum, point) => sum + point.total, 0) / recent.length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return perDay * daysInMonth;
}

async function getWorkloads(clusterId: string): Promise<ProjectWorkload[]> {
  const credentials = await getClusterCredentials(clusterId);
  const namespaces = await listProjectNamespaces(credentials);

  const workloads = await Promise.all(
    namespaces.map(async (namespace): Promise<ProjectWorkload> => {
      const pods = await listNamespacePods(credentials, namespace);
      return {
        namespace,
        pods,
        runningPods: pods.filter((pod) => pod.phase === "Running").length,
        cpuUsage: pods.reduce((sum, pod) => sum + (pod.cpuUsage ?? 0), 0),
        memoryUsage: pods.reduce((sum, pod) => sum + (pod.memoryUsage ?? 0), 0),
        cpuRequest: pods.reduce((sum, pod) => sum + pod.cpuRequest, 0),
        memoryRequest: pods.reduce((sum, pod) => sum + pod.memoryRequest, 0),
        hasUsage: pods.some((pod) => pod.cpuUsage !== null),
      };
    }),
  );

  // Un namespace sin pods no es un proyecto: no se muestra.
  return workloads.filter((workload) => workload.pods.length > 0);
}
