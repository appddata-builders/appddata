"use client";

import { useCallback, useState, useTransition } from "react";
import { LuInfo, LuRefreshCw, LuTriangleAlert } from "react-icons/lu";

import { BarList, ChartCard, ChartLegend, StatTile } from "@/app/components/charts/chart-parts";
import LineChart, { type LineSeries } from "@/app/components/charts/line-chart";
import {
  formatBytes,
  formatCores,
  formatPercent,
  formatTimestamp,
  MAX_SERIES,
  seriesColor,
} from "@/app/components/charts/chart-tokens";
import type { Attempt, NodeSeries } from "@/lib/digitalocean-server";
import { plannedCapacity } from "@/lib/service-billing";
import type { InfraConsole, ProjectWorkload } from "@/lib/infra-console-server";
import type { PodInfo } from "@/lib/kubernetes-server";
import type { SchemaSize } from "@/lib/postgres-schemas-server";

/**
 * Nota informativa, en gris. Se usa para condiciones que NO son fallas, como
 * que el cluster no traiga metrics-server: el dato sigue siendo util y no
 * merece el peso visual de una alerta.
 */
function SourceNote({ message }: { message: string }) {
  return (
    <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
      <LuInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/** Aviso por tarjeta: una fuente caida no debe tumbar la pantalla completa. */
function SourceError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
      <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/** Una linea por nodo, en orden estable por nombre. */
function buildNodeSeries(nodes: NodeSeries[]): LineSeries[] {
  return [...nodes]
    .sort((a, b) => a.nodeName.localeCompare(b.nodeName))
    .slice(0, MAX_SERIES + 1)
    .map((node, index) => ({ name: node.nodeName, color: seriesColor(index), points: node.points }));
}

function TableView({ label = "Ver tabla", children }: { label?: string; children: React.ReactNode }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer list-none text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline">
        {label}
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200">{children}</div>
    </details>
  );
}

export default function InfraPanel({
  initial,
  selectedSlug,
  domain,
}: {
  initial: InfraConsole;
  /** Namespace del dominio elegido arriba: filtra los pods que se muestran. */
  selectedSlug: string;
  /** Dominio publicado, que es como lo nombra el cliente. */
  domain: string;
}) {
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(() => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/dashboard/infraestructura", { cache: "no-store" });
        if (!response.ok) throw new Error(`El panel respondio ${response.status}.`);
        setData((await response.json()) as InfraConsole);
        setLoadError(null);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "No se pudo actualizar.");
      }
    });
  }, []);

  const nodeCount = data.clusters.ok
    ? data.clusters.data.reduce(
        (sum, cluster) => sum + cluster.nodePools.reduce((pool, item) => pool + item.nodes.length, 0),
        0,
      )
    : 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Estado interno</p>
          <h3 className="mt-1.5 text-sm font-semibold tracking-[-0.01em] text-slate-900">{domain}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Recursos medidos en el cluster que alimentan el calculo de arriba.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          aria-label="Actualizar"
        >
          <LuRefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {loadError ? <SourceError message={loadError} /> : null}
        {!data.configured ? (
          <SourceError message="Falta configurar el token de infraestructura en el entorno (DIGITALOCEAN_TOKEN). Sin el no hay lecturas de consumo." />
        ) : null}

        {/* Solo capacidad, sin dinero: lo que cuesta la infraestructura es
            interno y no se muestra en la pantalla del cliente. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Nodos"
            value={String(nodeCount)}
            hint={
              data.clusters.ok
                ? data.clusters.data.map((cluster) => cluster.region).join(", ") || "Sin region"
                : "Sin datos"
            }
          />
          <StatTile
            label="Plazas del cluster"
            value={String(plannedCapacity())}
            hint="Entre las que se reparte el consumo"
          />
        </div>

        {data.workloads.ok ? (
          data.workloads.data.length > 0 ? (
            <WorkloadBreakdown
              workloads={data.workloads.data}
              schemas={data.schemas.ok ? data.schemas.data : []}
              selectedSlug={selectedSlug}
            />
          ) : (
            <div className="flex h-24 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
              No hay namespaces de proyecto con pods.
            </div>
          )
        ) : (
          <SourceError message={data.workloads.error} />
        )}

        {/* El costo crudo de la cuenta no es de ningun dominio en particular:
            vive plegado para no competir con el detalle del que si lo es. */}
        {/* Evidencia tecnica, sin cifras de costo: lo que se muestra aqui es lo
            que GENERA el cargo, no lo que la infraestructura le cuesta a
            Appddata. Ese numero es interno y no vive en esta pantalla. */}
        <details className="rounded-xl border border-slate-200">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-slate-600 hover:text-slate-900">
            Infraestructura del cluster
          </summary>

          <div className="space-y-4 border-t border-slate-100 p-4">
            <ChartCard title="Inventario del cluster" hint="Clusters, pools y nodos activos.">
              {data.clusters.ok ? (
                data.clusters.data.length > 0 ? (
                  <ul className="space-y-3">
                    {data.clusters.data.map((cluster) => (
                      <li key={cluster.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{cluster.name}</span>
                          <span
                            className={`inline-flex h-5 items-center rounded-full px-2 text-[0.65rem] font-semibold uppercase tracking-[0.1em] ${
                              cluster.status === "running"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {cluster.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            {cluster.region} · {cluster.version}
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1.5">
                          {cluster.nodePools.map((pool) => (
                            <li key={pool.id} className="text-xs text-slate-600">
                              <span className="font-medium text-slate-700">{pool.name}</span> · {pool.size} ·{" "}
                              {pool.nodes.length} de {pool.count} nodos
                              <ul className="mt-1 space-y-0.5 pl-3">
                                {pool.nodes.map((node) => (
                                  <li key={node.id} className="flex items-center gap-1.5 text-slate-500">
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        node.status === "running" ? "bg-emerald-500" : "bg-amber-500"
                                      }`}
                                      aria-hidden="true"
                                    />
                                    <span className="truncate">{node.name}</span>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
                    Sin clusters registrados.
                  </div>
                )
              ) : (
                <SourceError message={data.clusters.error} />
              )}
            </ChartCard>

            <ChartCard title="CPU del nodo" hint="Uso promedio de cada nodo durante el mes en curso.">
              <NodeMetricChart attempt={data.cpu} />
            </ChartCard>

            <ChartCard title="Memoria del nodo" hint="Memoria ocupada (total menos disponible) durante el mes en curso.">
              <NodeMetricChart attempt={data.memory} />
            </ChartCard>
          </div>
        </details>
      </div>
    </div>
  );
}

function WorkloadBreakdown({
  workloads,
  schemas,
  selectedSlug,
}: {
  workloads: ProjectWorkload[];
  schemas: SchemaSize[];
  selectedSlug: string;
}) {
  // Con un dominio elegido arriba, aqui solo se ve ese: es su evidencia.
  const visible = workloads.filter((workload) => workload.namespace === selectedSlug);

  if (visible.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
        Este dominio todavia no tiene pods corriendo en el cluster.
      </div>
    );
  }

  // El desglose es POR POD, no por namespace: lo que se cobra sale de cada pod
  // que el cluster reporta para el proyecto, incluido el de la base.
  const pods = visible.flatMap((workload) => workload.pods);
  // Si el cluster no reporta uso actual se grafica lo reservado, que siempre
  // existe. No hay por que explicarle al lector como esta armado el cluster.
  const measured = pods.some((pod) => pod.cpuUsage !== null);
  const cpuOf = (pod: PodInfo) => (measured ? (pod.cpuUsage ?? 0) : pod.cpuRequest);
  const memoryOf = (pod: PodInfo) => (measured ? (pod.memoryUsage ?? 0) : pod.memoryRequest);
  const schemaFor = (namespace: string) =>
    schemas.find(
      (item) => item.schema.toLowerCase().replace(/-/g, "_") === namespace.toLowerCase().replace(/-/g, "_"),
    )?.bytes ?? 0;

  // El color sigue al pod, en orden estable por nombre, para que no cambie al
  // reordenar por consumo.
  const order = [...pods].sort((a, b) => a.name.localeCompare(b.name)).map((pod) => pod.name);
  const colorFor = (name: string) => seriesColor(order.indexOf(name));

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            {measured ? "CPU por pod" : "CPU reservada por pod"}
          </p>
          <BarList
            items={[...pods]
              .sort((a, b) => cpuOf(b) - cpuOf(a))
              .map((pod) => ({
                label: pod.name,
                sublabel: measured ? `reserva ${formatCores(pod.cpuRequest)}` : null,
                value: cpuOf(pod),
                color: colorFor(pod.name),
              }))}
            formatValue={formatCores}
          />
        </div>
        <div>
          <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            {measured ? "Memoria por pod" : "Memoria reservada por pod"}
          </p>
          <BarList
            items={[...pods]
              .sort((a, b) => memoryOf(b) - memoryOf(a))
              .map((pod) => ({
                label: pod.name,
                sublabel: measured ? `reserva ${formatBytes(pod.memoryRequest)}` : null,
                value: memoryOf(pod),
                color: colorFor(pod.name),
              }))}
            formatValue={formatBytes}
          />
        </div>
      </div>

      {measured ? null : (
        <SourceNote message="El cluster no tiene metrics-server, asi que no hay lectura de uso actual: lo que se grafica es lo que cada pod tiene reservado, que es tambien lo que se usa para prorratear el cargo." />
      )}

      {/* Un esquema en cero casi siempre significa que el nombre no empato con
          el slug, no que la base este vacia: mejor no decir nada que mentir. */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {visible
          .filter((workload) => schemaFor(workload.namespace) > 0)
          .map((workload) => (
            <li key={workload.namespace} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Esquema de <span className="font-medium text-slate-700">{workload.namespace}</span>:{" "}
              {formatBytes(schemaFor(workload.namespace))}
            </li>
          ))}
      </ul>

      <TableView label="Ver pods">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Pod</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 text-right font-medium">CPU</th>
              <th className="px-3 py-2 text-right font-medium">Memoria</th>
              <th className="px-3 py-2 text-right font-medium">Reinicios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pods.map((pod) => (
              <tr key={`${pod.namespace}/${pod.name}`}>
                <td className="px-3 py-2 text-slate-700">
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: colorFor(pod.name) }}
                  />
                  {pod.name}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      pod.phase === "Running" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        pod.phase === "Running" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      aria-hidden="true"
                    />
                    {pod.phase} {pod.ready}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                  {pod.cpuUsage === null ? `${formatCores(pod.cpuRequest)} res.` : formatCores(pod.cpuUsage)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                  {pod.memoryUsage === null ? `${formatBytes(pod.memoryRequest)} res.` : formatBytes(pod.memoryUsage)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{pod.restarts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableView>
    </>
  );
}

function NodeMetricChart({ attempt }: { attempt: Attempt<NodeSeries[]> }) {
  if (!attempt.ok) return <SourceError message={attempt.error} />;

  const series = buildNodeSeries(attempt.data);
  if (series.every((line) => line.points.length === 0)) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
        No hay muestras de este mes.
      </div>
    );
  }

  return (
    <>
      <LineChart
        series={series}
        formatValue={formatPercent}
        formatAxis={(value, decimals) => `${value.toFixed(decimals)}%`}
        formatTime={formatTimestamp}
        maxValue={100}
      />
      <ChartLegend items={series.map((line) => ({ name: line.name, color: line.color }))} />
      <TableView>
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Nodo</th>
              <th className="px-3 py-2 text-right font-medium">Promedio</th>
              <th className="px-3 py-2 text-right font-medium">Maximo</th>
              <th className="px-3 py-2 text-right font-medium">Ultimo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {series.map((line) => {
              const values = line.points.map((point) => point.v);
              const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
              return (
                <tr key={line.name}>
                  <td className="px-3 py-2 text-slate-700">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: line.color }} />
                    {line.name}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatPercent(average)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                    {formatPercent(values.length ? Math.max(...values) : 0)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
                    {formatPercent(values[values.length - 1] ?? 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableView>
    </>
  );
}
