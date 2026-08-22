/**
 * Cobro mensual que ve el CLIENTE, por dominio.
 *
 * Traduce el costo interno de infraestructura al precio de Appddata y expone
 * unicamente el resultado: base, consumo, comision y total. Nunca el costo de
 * DigitalOcean ni el saldo de la cuenta, que son internos.
 */
import type { AccountSite } from "@/lib/account-summary-server";
import { fxSourceLabel } from "@/lib/fx-rate-server";
import type { InfraConsole, ProjectWorkload } from "@/lib/infra-console-server";
import { schemaBytesForSlug, type SchemaSize } from "@/lib/postgres-schemas-server";
import {
  chargeForProject,
  combineCharges,
  prorateProjects,
  serviceMargin,
  type ProjectCharge,
  type ProjectShare,
} from "@/lib/service-billing";

/** Pods que son la base compartida, no la app de un dominio. */
const DATABASE_POD = /postgres|pgbouncer|timescale/i;

/**
 * Namespaces que sostienen la plataforma, no un sitio de cliente.
 *
 * Aparecen como namespaces normales del cluster, pero cobrarlos como si fueran
 * proyectos seria inventarle un dominio a `ingress-nginx`. Su costo es real y
 * sirve a todos los sitios, asi que se reparte igual que el de la base.
 */
export const PLATFORM_NAMESPACES = new Set([
  "cert-manager",
  "ingress-nginx",
  "data",
  "monitoring",
  "observability",
]);

/**
 * Productos de DigitalOcean que sostienen el cluster.
 *
 * La factura de la cuenta incluye cosas que no son el cluster (Spaces, bases
 * administradas, snapshots). Repartir la factura COMPLETA entre los dominios
 * les cobraria infraestructura que no usan.
 */
export const CLUSTER_PRODUCT = /kubernetes|droplet|load balancer|volume|bandwidth|registry/i;

/**
 * Costo mensual proyectado que es atribuible al cluster.
 *
 * El desglose viene acumulado del mes en curso y la proyeccion es del total de
 * la cuenta, asi que se escala el acumulado del cluster con la misma razon.
 */
function clusterMonthlyUsd(infra: InfraConsole): number {
  if (!infra.cost.ok) return 0;
  const { monthToDateUsage, projectedMonthEnd } = infra.cost.data;
  if (!infra.breakdown.ok || monthToDateUsage <= 0) return projectedMonthEnd;

  const clusterToDate = infra.breakdown.data
    .filter((item) => CLUSTER_PRODUCT.test(item.product))
    .reduce((sum, item) => sum + item.amount, 0);
  if (clusterToDate <= 0) return projectedMonthEnd;

  return projectedMonthEnd * (clusterToDate / monthToDateUsage);
}

export type ProjectBilling = {
  slug: string;
  name: string;
  url: string | null;
  /** Parte del cluster que le corresponde, de 0 a 1. */
  share: number;
  pods: number;
  /** Nombres de sus pods: la grafica dice QUE genera el cargo, no solo cuanto. */
  podNames: string[];
  cpuRequest: number;
  memoryRequest: number;
  schemaBytes: number;
  charge: ProjectCharge;
};

export type AccountBilling = {
  projects: ProjectBilling[];
  combined: ReturnType<typeof combineCharges>;
  fxRate: number;
  /** De donde salio ese tipo de cambio, para poder auditarlo en pantalla. */
  fxLabel: string;
  margin: number;
  /** Pods de la base compartida (postgres-0, etc.). */
  databasePods: string[];
  /** Pods de plataforma compartida (ingress, cert-manager). */
  platformPods: string[];
  /** false cuando no se pudo medir la infra y solo se cobra la base. */
  measured: boolean;
  /** Aviso para el cliente cuando el calculo va incompleto. */
  note: string | null;
};


/**
 * Reparto del cluster entre los dominios de una cuenta.
 *
 * Vive aparte porque lo consumen dos caminos: el estimado que se muestra en
 * vivo y el cierre mensual que congela el cobro. Si cada uno tuviera su propia
 * version, el cliente veria un numero y se le cobraria otro.
 */
export function resolveShares(sites: AccountSite[], infra: InfraConsole): Map<string, ProjectShare> {
  const { shares } = collectClusterUsage(sites, infra);
  return new Map(shares.map((entry) => [entry.slug, entry]));
}

type ClusterUsage = {
  shares: ProjectShare[];
  appResources: Map<string, { cpu: number; memory: number; pods: number; names: string[] }>;
  databasePods: string[];
  platformPods: string[];
  schemaBytes: Record<string, number>;
};

function collectClusterUsage(sites: AccountSite[], infra: InfraConsole): ClusterUsage {
  const workloads: ProjectWorkload[] = infra.workloads.ok ? infra.workloads.data : [];
  const schemas: SchemaSize[] = infra.schemas.ok ? infra.schemas.data : [];

  // El pod de la base se separa de los pods de aplicacion: su costo no es de
  // ningun dominio en particular, se reparte por peso de esquema mas abajo.
  let databaseCpu = 0;
  let databaseMemory = 0;
  let platformCpu = 0;
  let platformMemory = 0;
  const databasePods: string[] = [];
  const platformPods: string[] = [];
  const appResources = new Map<string, { cpu: number; memory: number; pods: number; names: string[] }>();

  for (const workload of workloads) {
    for (const pod of workload.pods) {
      if (DATABASE_POD.test(pod.name)) {
        databaseCpu += pod.cpuRequest;
        databaseMemory += pod.memoryRequest;
        databasePods.push(pod.name);
        continue;
      }
      if (PLATFORM_NAMESPACES.has(workload.namespace)) {
        platformCpu += pod.cpuRequest;
        platformMemory += pod.memoryRequest;
        platformPods.push(pod.name);
        continue;
      }
      const current = appResources.get(workload.namespace) ?? { cpu: 0, memory: 0, pods: 0, names: [] };
      current.cpu += pod.cpuRequest;
      current.memory += pod.memoryRequest;
      current.pods += 1;
      current.names.push(pod.name);
      appResources.set(workload.namespace, current);
    }
  }

  const schemaBytes: Record<string, number> = {};
  for (const site of sites) schemaBytes[site.slug] = schemaBytesForSlug(schemas, site.slug);

  // El reparto se hace contra TODOS los namespaces del cluster, no solo los de
  // esta cuenta: si el denominador fueran nada mas sus proyectos, cada cliente
  // cargaria con el 100% del cluster y se cobraria varias veces lo mismo.
  // Se incluyen los sitios del cliente aunque el cluster no los reporte: su
  // plaza existe y se cobra igual (ver `standardSlot` en service-billing).
  const allNamespaces = [...new Set([...appResources.keys(), ...sites.map((site) => site.slug)])];
  const allSchemaBytes: Record<string, number> = { ...schemaBytes };
  for (const namespace of allNamespaces) {
    if (allSchemaBytes[namespace] === undefined) {
      allSchemaBytes[namespace] = schemaBytesForSlug(schemas, namespace);
    }
  }

  const shares = prorateProjects({
    projects: allNamespaces.map((namespace) => {
      const resources = appResources.get(namespace) ?? { cpu: 0, memory: 0, pods: 0, names: [] };
      return { slug: namespace, cpu: resources.cpu, memory: resources.memory };
    }),
    database: databaseCpu > 0 || databaseMemory > 0 ? { cpu: databaseCpu, memory: databaseMemory } : null,
    platform: platformCpu > 0 || platformMemory > 0 ? { cpu: platformCpu, memory: platformMemory } : null,
    schemaBytes: allSchemaBytes,
  });
  return { shares, appResources, databasePods, platformPods, schemaBytes };
}

export function buildAccountBilling(sites: AccountSite[], infra: InfraConsole): AccountBilling {
  const fxRate = infra.fx.rate;
  const margin = serviceMargin();
  const fxLabel = fxSourceLabel(infra.fx);

  if (sites.length === 0) {
    return {
      projects: [],
      combined: combineCharges([]),
      fxRate,
      fxLabel,
      margin,
      databasePods: [],
      platformPods: [],
      measured: false,
      note: null,
    };
  }

  const projectedUsd = clusterMonthlyUsd(infra);
  const { shares, appResources, databasePods, platformPods, schemaBytes } = collectClusterUsage(sites, infra);
  const shareBySlug = new Map(shares.map((entry) => [entry.slug, entry]));

  const projects: ProjectBilling[] = sites.map((site) => {
    const share = shareBySlug.get(site.slug) ?? {
      slug: site.slug,
      ownShare: 0,
      databaseShare: 0,
      platformShare: 0,
    };
    const resources = appResources.get(site.slug) ?? { cpu: 0, memory: 0, pods: 0, names: [] };
    return {
      slug: site.slug,
      name: site.name,
      url: site.url,
      share: share.ownShare + share.databaseShare + share.platformShare,
      pods: resources.pods,
      podNames: resources.names,
      cpuRequest: resources.cpu,
      memoryRequest: resources.memory,
      schemaBytes: schemaBytes[site.slug] ?? 0,
      charge: chargeForProject(site.slug, share, projectedUsd, fxRate),
    };
  });

  const measured = projectedUsd > 0 && infra.workloads.ok && infra.workloads.data.length > 0;

  return {
    projects,
    combined: combineCharges(projects.map((project) => project.charge)),
    fxRate,
    fxLabel,
    margin,
    databasePods,
    platformPods,
    measured,
    note: pendingNote(infra, projectedUsd),
  };
}

/**
 * Por que el cobro va incompleto.
 *
 * Se distingue el caso de "no hay consumo todavia" del de "no se pudo leer el
 * cluster": son problemas distintos y el aviso generico no dejaba saber cual
 * de los dos estaba pasando.
 */
function pendingNote(infra: InfraConsole, projectedUsd: number): string | null {
  if (!infra.workloads.ok) {
    return (
      "No se pudo leer el cluster, asi que el consumo todavia no se reparte por dominio y solo se cobra la base. " +
      `Detalle: ${infra.workloads.error}`
    );
  }
  if (infra.workloads.data.length === 0) {
    return "El cluster no reporta pods para estos dominios, asi que solo se cobra la base mensual.";
  }
  if (projectedUsd <= 0) {
    return "Todavia no hay consumo facturado este mes; el monto se ajusta con el primer corte de DigitalOcean.";
  }
  return null;
}
