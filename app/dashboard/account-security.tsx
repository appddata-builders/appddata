"use client";

import { LuBoxes, LuCheck, LuGlobe, LuLockKeyhole, LuNetwork, LuShieldCheck } from "react-icons/lu";

export type SiteSecurity = {
  domain: string;
  project: string;
  https: boolean;
  runningPods: number;
  totalPods: number;
  routingManaged: boolean;
  certificatesManaged: boolean;
  domainManaged: boolean;
};

export function AccountSecurity({ sites }: { sites: SiteSecurity[] }) {
  const protectedSites = sites.filter((site) => site.https && site.routingManaged).length;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Protección del servicio</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Seguridad</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Estado de la conexión segura, ejecución en contenedores, entrada de tráfico y gestión del dominio de cada sitio.
        </p>
      </header>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-200">
            <LuShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-emerald-950">{protectedSites} de {sites.length} sitios con protección verificada</h2>
            <p className="mt-1 text-xs leading-5 text-emerald-800">
              La verificación combina HTTPS publicado, workloads activos y la capa de entrada administrada del cluster.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sites.map((site) => (
          <article key={`${site.project}-${site.domain}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-900">{site.domain}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Proyecto {site.project}</p>
              </div>
              <Status ok={site.https && site.routingManaged} label={site.https && site.routingManaged ? "Protegido" : "Revisión pendiente"} />
            </div>

            <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
              <SecurityItem icon={<LuLockKeyhole />} title="Conexión HTTPS" ok={site.https}>
                {site.https ? "La comunicación pública utiliza una conexión cifrada." : "El dominio aún no reporta una URL HTTPS."}
              </SecurityItem>
              <SecurityItem icon={<LuBoxes />} title="Contenedores y pods" ok={site.runningPods > 0}>
                {site.totalPods > 0
                  ? `${site.runningPods} de ${site.totalPods} pods se encuentran en ejecución.`
                  : "El cluster todavía no reporta pods para este proyecto."}
              </SecurityItem>
              <SecurityItem icon={<LuNetwork />} title="Balanceo y enrutamiento" ok={site.routingManaged}>
                {site.routingManaged
                  ? "El tráfico entra por la capa administrada de balanceo e ingress antes de llegar al servicio."
                  : "No fue posible verificar la capa pública de entrada en este momento."}
              </SecurityItem>
              <SecurityItem icon={<LuGlobe />} title="Dominio administrado" ok={site.domainManaged}>
                {site.domainManaged
                  ? "La vinculación del dominio está gestionada sin cambiar la propiedad del cliente."
                  : "La gestión del dominio todavía está pendiente de vinculación."}
              </SecurityItem>
            </div>

            <div className="border-t border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500">
              {site.certificatesManaged
                ? "Los certificados se gestionan desde la plataforma del cluster y se renuevan sin intervención del cliente."
                : "La gestión automática del certificado todavía no pudo verificarse."}
            </div>
          </article>
        ))}
      </div>

      {sites.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
          La cuenta todavía no tiene sitios vinculados para revisar.
        </div>
      ) : null}

      <aside className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
        <h2 className="text-sm font-semibold text-slate-900">Qué protege Appddata</h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          La plataforma separa cada proyecto, supervisa sus pods y centraliza el acceso público. HTTPS protege el tránsito; los contenedores aíslan la aplicación; el balanceador distribuye las solicitudes; y la gestión de dominios mantiene controlada la conexión sin apropiarse del dominio.
        </p>
      </aside>
    </section>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:ml-auto ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><LuCheck className="h-3.5 w-3.5" />{label}</span>;
}

function SecurityItem({ icon, title, ok, children }: { icon: React.ReactNode; title: string; ok: boolean; children: React.ReactNode }) {
  return <div className="bg-white p-5"><div className="flex items-center gap-2"><span className={ok ? "text-emerald-600" : "text-amber-500"}>{icon}</span><h3 className="text-sm font-semibold text-slate-900">{title}</h3></div><p className="mt-2 text-xs leading-5 text-slate-600">{children}</p></div>;
}
