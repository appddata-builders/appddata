"use client";

import { LuCalendarDays, LuCreditCard, LuReceiptText } from "react-icons/lu";

import type { AccountSubscriptionKind } from "@/lib/account-subscriptions-server";

type SubscriptionSummary = { kind: AccountSubscriptionKind; status: string };
type UpcomingCharge = {
  kind: AccountSubscriptionKind;
  label: string;
  amount: number;
  currency: string;
  chargeAt: string | null;
};

export function AccountSubscriptions({ hasPlan, subscriptions, upcomingCharges }: {
  hasPlan: boolean;
  subscriptions: SubscriptionSummary[];
  upcomingCharges: UpcomingCharge[];
}) {
  if (!hasPlan) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Contrata primero un paquete para habilitar las suscripciones de infraestructura y soporte.
      </div>
    );
  }
  const status = (kind: AccountSubscriptionKind) => subscriptions.find((item) => item.kind === kind)?.status;
  const active = (kind: AccountSubscriptionKind) => ["active", "trialing", "past_due"].includes(status(kind) ?? "");
  const total = upcomingCharges.reduce((sum, charge) => sum + charge.amount, 0);
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#0C6CC6] ring-1 ring-slate-200">
            <LuReceiptText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Próximo cobro</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Resumen del siguiente ciclo</h2>
          </div>
        </div>
        {upcomingCharges.length > 0 ? (
          <>
            <div className="divide-y divide-slate-100">
              {upcomingCharges.map((charge) => (
                <div key={charge.kind} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{charge.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{charge.kind === "cloud-server" ? "Infraestructura para proyectos con base de datos" : "Servicio opcional"}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <LuCalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {charge.chargeAt ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(charge.chargeAt)) : "Fecha por confirmar"}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{formatMoney(charge.amount, charge.currency)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
              <span className="text-sm font-semibold text-slate-700">Total estimado</span>
              <span className="text-lg font-bold text-slate-950">{formatMoney(total, upcomingCharges[0]?.currency ?? "MXN")}</span>
            </div>
          </>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500">No hay cargos recurrentes programados para el siguiente ciclo.</p>
        )}
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Suscripciones disponibles</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <SubscriptionCard kind="cloud-server" title="Servidor de base de datos" description="Infraestructura administrada para proyectos que almacenan datos." required active={active("cloud-server")} status={status("cloud-server")} />
          <SubscriptionCard kind="technical-support" title="Soporte técnico" description="5 Acompañamientos para incidencias, mantenimiento y ajustes técnicos." active={active("technical-support")} status={status("technical-support")} />
        </div>
      </section>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount / 100);
}

function SubscriptionCard({ kind, title, description, required = false, active, status }: {
  kind: AccountSubscriptionKind;
  title: string;
  description: string;
  required?: boolean;
  active: boolean;
  status?: string;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#0C6CC6]">Suscripción recurrente</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : required ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
          {active ? "Activa" : required ? "Requerida si usa BD" : "Opcional"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      {status && !active ? <p className="mt-2 text-xs text-amber-700">Estado en Stripe: {status}</p> : null}
      {active ? (
        <p className="mt-auto pt-5 text-sm font-medium text-emerald-700">Suscripción vinculada con Stripe</p>
      ) : (
        <form action="/api/stripe/account-subscription" method="post" className="mt-auto pt-5">
          <input type="hidden" name="kind" value={kind} />
          <button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0C6CC6] px-4 text-sm font-medium text-white transition hover:bg-[#0a5aa6]">
            <LuCreditCard className="h-4 w-4" aria-hidden="true" />
            Suscribirme
          </button>
        </form>
      )}
    </article>
  );
}
