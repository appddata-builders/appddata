/**
 * Cliente de solo-lectura contra el API server del cluster de DOKS.
 *
 * La Monitoring API de DigitalOcean es por DROPLET: sirve para el consumo de un
 * nodo, pero no sabe nada de pods ni de namespaces. Para el desglose por
 * proyecto hay que hablarle directo al cluster, con las credenciales que emite
 * `/v2/kubernetes/clusters/{id}/credentials`.
 *
 * Se usa el modulo `https` y no `fetch` porque el API server presenta un
 * certificado firmado por la CA propia del cluster: hay que pasar esa CA
 * explicitamente, y `fetch` no expone esa opcion en Node sin tocar undici.
 *
 * OJO con el alcance: metrics-server responde el uso INSTANTANEO (lo mismo que
 * `kubectl top`), no una serie historica. El historico mensual por pod requiere
 * Prometheus dentro del cluster.
 */
import { request as httpsRequest } from "node:https";

export type ClusterCredentials = { server: string; token: string; ca: Buffer };

function k8sGet<T>(credentials: ClusterCredentials, path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, credentials.server);
    const request = httpsRequest(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        ca: credentials.ca,
        headers: { Authorization: `Bearer ${credentials.token}`, Accept: "application/json" },
        timeout: 15000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const status = response.statusCode ?? 0;
          if (status === 401) {
            // DO si entrego credenciales (esa llamada fue 200) y es el API
            // server quien las rechaza: el token de cluster no vale. Casi
            // siempre es el alcance del token de DigitalOcean, que necesita
            // permiso de escritura sobre Kubernetes para emitir credenciales
            // utilizables, no solo `kubernetes:read`.
            reject(
              new Error(
                "El cluster rechazo las credenciales (401). Revisa que el token de infraestructura siga vigente y tenga permiso sobre Kubernetes.",
              ),
            );
            return;
          }
          if (status === 403) {
            reject(new Error(`El token no tiene permiso de lectura en ${path} dentro del cluster.`));
            return;
          }
          if (status === 404 && path.includes("metrics.k8s.io")) {
            reject(new Error("El cluster no tiene metrics-server instalado: sin uso actual por pod."));
            return;
          }
          if (status >= 400) {
            reject(new Error(`El API server respondio ${status} en ${path}. ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error(`Respuesta no JSON del API server en ${path}.`));
          }
        });
      },
    );
    request.on("error", (error) => reject(error));
    request.on("timeout", () => request.destroy(new Error("El API server del cluster no respondio a tiempo.")));
    request.end();
  });
}

/* ------------------------------------------------------------- cantidades -- */

/** Convierte una cantidad de CPU de Kubernetes a cores. Acepta n / u / m. */
export function parseCpuToCores(value: string | undefined): number {
  if (!value) return 0;
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  if (value.endsWith("n")) return amount / 1e9;
  if (value.endsWith("u")) return amount / 1e6;
  if (value.endsWith("m")) return amount / 1e3;
  return amount;
}

const MEMORY_UNITS: Record<string, number> = {
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  K: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
};

/** Convierte una cantidad de memoria de Kubernetes a bytes. */
export function parseMemoryToBytes(value: string | undefined): number {
  if (!value) return 0;
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  for (const [suffix, factor] of Object.entries(MEMORY_UNITS)) {
    if (value.endsWith(suffix)) return amount * factor;
  }
  return amount;
}

/* ----------------------------------------------------------------- lectura -- */

type NamespaceList = { items?: { metadata?: { name?: string } }[] };

/** Namespaces de trabajo: se excluyen los del sistema de Kubernetes. */
const SYSTEM_NAMESPACES = new Set(["kube-system", "kube-public", "kube-node-lease", "default"]);

export async function listProjectNamespaces(credentials: ClusterCredentials): Promise<string[]> {
  const response = await k8sGet<NamespaceList>(credentials, "/api/v1/namespaces");
  return (response.items ?? [])
    .map((item) => item.metadata?.name ?? "")
    .filter((name) => name && !SYSTEM_NAMESPACES.has(name))
    .sort((a, b) => a.localeCompare(b));
}

export type PodInfo = {
  name: string;
  namespace: string;
  phase: string;
  node: string | null;
  /** Contenedores listos sobre el total, como lo muestra `kubectl get pods`. */
  ready: string;
  restarts: number;
  startedAt: string | null;
  cpuRequest: number;
  memoryRequest: number;
  cpuLimit: number;
  memoryLimit: number;
  /** Uso actual; `null` si metrics-server no reporto este pod. */
  cpuUsage: number | null;
  memoryUsage: number | null;
};

type PodList = {
  items?: {
    metadata?: { name?: string; namespace?: string };
    spec?: {
      nodeName?: string;
      containers?: {
        resources?: {
          requests?: { cpu?: string; memory?: string };
          limits?: { cpu?: string; memory?: string };
        };
      }[];
    };
    status?: {
      phase?: string;
      startTime?: string;
      containerStatuses?: { ready?: boolean; restartCount?: number }[];
    };
  }[];
};

type PodMetricsList = {
  items?: {
    metadata?: { name?: string };
    containers?: { usage?: { cpu?: string; memory?: string } }[];
  }[];
};

export async function listNamespacePods(
  credentials: ClusterCredentials,
  namespace: string,
): Promise<PodInfo[]> {
  const encoded = encodeURIComponent(namespace);
  const pods = await k8sGet<PodList>(credentials, `/api/v1/namespaces/${encoded}/pods`);

  // El uso actual es opcional: sin metrics-server el inventario sigue siendo util.
  const usage = new Map<string, { cpu: number; memory: number }>();
  try {
    const metrics = await k8sGet<PodMetricsList>(
      credentials,
      `/apis/metrics.k8s.io/v1beta1/namespaces/${encoded}/pods`,
    );
    for (const item of metrics.items ?? []) {
      const name = item.metadata?.name;
      if (!name) continue;
      usage.set(name, {
        cpu: (item.containers ?? []).reduce((sum, c) => sum + parseCpuToCores(c.usage?.cpu), 0),
        memory: (item.containers ?? []).reduce((sum, c) => sum + parseMemoryToBytes(c.usage?.memory), 0),
      });
    }
  } catch {
    // Se deja `usage` vacio: los pods se listan sin columna de uso.
  }

  return (pods.items ?? []).map((pod) => {
    const containers = pod.spec?.containers ?? [];
    const statuses = pod.status?.containerStatuses ?? [];
    const name = pod.metadata?.name ?? "sin nombre";
    const current = usage.get(name);

    return {
      name,
      namespace: pod.metadata?.namespace ?? namespace,
      phase: pod.status?.phase ?? "Unknown",
      node: pod.spec?.nodeName ?? null,
      ready: `${statuses.filter((status) => status.ready).length}/${containers.length}`,
      restarts: statuses.reduce((sum, status) => sum + (status.restartCount ?? 0), 0),
      startedAt: pod.status?.startTime ?? null,
      cpuRequest: containers.reduce((sum, c) => sum + parseCpuToCores(c.resources?.requests?.cpu), 0),
      memoryRequest: containers.reduce((sum, c) => sum + parseMemoryToBytes(c.resources?.requests?.memory), 0),
      cpuLimit: containers.reduce((sum, c) => sum + parseCpuToCores(c.resources?.limits?.cpu), 0),
      memoryLimit: containers.reduce((sum, c) => sum + parseMemoryToBytes(c.resources?.limits?.memory), 0),
      cpuUsage: current ? current.cpu : null,
      memoryUsage: current ? current.memory : null,
    };
  });
}
