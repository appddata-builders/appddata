"use client";

import { LuArrowRightLeft, LuCircleCheck, LuExternalLink, LuGlobe, LuShieldCheck } from "react-icons/lu";

export type AccountDomain = {
  domain: string;
  ownerEmail: string;
  registrar: string;
  project: string;
  status: "connected" | "pending";
  managedByAppddata: boolean;
  renewalOwner: "client" | "appddata";
};

export function AccountDomains({ domains }: { domains: AccountDomain[] }) {
  const connected = domains.filter((domain) => domain.status === "connected").length;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Configuración</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Dominios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Consulta quién conserva la propiedad de cada dominio y cómo está vinculado con Appddata.
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Summary label="Dominios" value={String(domains.length)} />
        <Summary label="Conectados" value={String(connected)} />
        <Summary label="Propiedad" value="Del cliente" />
      </dl>

      <div className="space-y-4">
        {domains.map((item) => (
          <article key={item.domain} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#0C6CC6] ring-1 ring-slate-200">
                <LuGlobe className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900">{item.domain}</h2>
                <p className="text-xs text-slate-500">Proyecto {item.project}</p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:ml-auto">
                <LuCircleCheck className="h-3.5 w-3.5" /> {item.status === "connected" ? "Conectado" : "Pendiente"}
              </span>
            </div>

            <dl className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Registrador" value={item.registrar} />
              <Detail label="Propietario" value={item.ownerEmail} />
              <Detail label="Administración" value={item.managedByAppddata ? "Appddata" : "Cliente"} />
              <Detail label="Renovación" value={item.renewalOwner === "client" ? "A cargo del cliente" : "A cargo de Appddata"} />
            </dl>

            <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
              <Notice icon={<LuShieldCheck className="h-5 w-5" />} title="El dominio pertenece al cliente">
                Appddata administra la conexión sin cambiar al titular registral.
              </Notice>
              <Notice icon={<LuArrowRightLeft className="h-5 w-5" />} title="Salida disponible">
                El cliente puede desconectarlo o solicitar una transferencia sin perder su propiedad.
              </Notice>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <a href={`https://${item.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0C6CC6] hover:text-[#0a5aa6]">
                Visitar dominio <LuExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>

      <aside className="rounded-2xl border border-dashed border-slate-300 px-5 py-5">
        <h2 className="text-sm font-semibold text-slate-900">Vincular otro dominio</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Los siguientes dominios usarán el mismo modelo: registrador, propietario, renovación, proyecto y permisos de administración.
        </p>
      </aside>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-white px-5 py-4"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 truncate text-sm font-medium text-slate-800" title={value}>{value}</dd></div>;
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className="flex gap-3 rounded-xl border border-slate-200 p-4"><span className="mt-0.5 shrink-0 text-blue-600">{icon}</span><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{children}</p></div></div>;
}
