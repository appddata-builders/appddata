const titles: Record<string, { title: string; subtitle: string }> = {
  "": {
    title: "Planes",
    subtitle: "Vista general del panel interno. Aqui conectaras metricas y alertas.",
  },
  analiticas: {
    title: "Analiticas",
    subtitle: "Graficos y embudos. Pendiente de integracion.",
  },
  dominios: {
    title: "Dominios",
    subtitle: "Administracion de dominios y DNS.",
  },
  integraciones: {
    title: "Integraciones",
    subtitle: "Conectores y claves API.",
  },
  seguridad: {
    title: "Seguridad",
    subtitle: "Politicas, accesos y auditoria.",
  },
  agentes: {
    title: "Agentes",
    subtitle: "Automatizaciones asistidas.",
  },
  automatizaciones: {
    title: "Automatizaciones",
    subtitle: "Reglas y disparadores.",
  },
  registros: {
    title: "Registros",
    subtitle: "Bitacora de eventos del sistema.",
  },
  api: {
    title: "API",
    subtitle: "Documentacion interna y tokens.",
  },
  "configuracion/pagos": {
    title: "Configuracion: pagos",
    subtitle: "Metodos de pago, facturacion y movimientos de la cuenta.",
  },
  "configuracion/autenticacion": {
    title: "Configuracion: autenticacion",
    subtitle: "Better Auth en local. Cambia a tu proveedor cuando toque.",
  },
  "configuracion/settings": {
    title: "Configuracion: cuenta",
    subtitle: "Variables generales y entornos.",
  },
};

type DashboardCatchAllPageProps = {
  params: Promise<{
    segments?: string[];
  }>;
};

export default async function DashboardCatchAllPage({ params }: DashboardCatchAllPageProps) {
  const resolved = await params;
  const key = (resolved.segments ?? []).join("/");
  if (key === "") {
    const session = await requirePanelSession();
    if (session) return <DashboardSummary plan={await getPanelPlan(session)} />;
  }
  if (key === "configuracion/pagos") {
    const session = await requirePanelSession();
    if (session) {
      const [plan, subscriptions, upcomingCharges] = await Promise.all([
        getPanelPlan(session),
        getAccountSubscriptions(session.user.id),
        getUpcomingAccountCharges(session.user.id),
      ]);
      return (
        <section className="mx-auto w-full max-w-5xl space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Configuración</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Pagos y suscripciones</h1>
            <p className="mt-2 text-sm text-slate-600">Administra los servicios recurrentes asociados a tu cuenta.</p>
          </div>
          <AccountSubscriptions
            hasPlan={plan.sitePlan !== "free"}
            subscriptions={subscriptions.map((item) => ({ kind: item.kind, status: item.status }))}
            upcomingCharges={upcomingCharges.map((charge) => ({
              ...charge,
              chargeAt: charge.chargeAt?.toISOString() ?? null,
            }))}
          />
        </section>
      );
    }
  }
  if (key === "configuracion/settings") {
    const session = await requirePanelSession();
    if (session) return <AccountSettings user={session.user} />;
  }
  const entry = titles[key] ?? {
    title: "Seccion",
    subtitle: "Contenido pendiente. La navegacion ya esta tropicalizada.",
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4">
      <div className="rounded-[2rem] border border-slate-200 bg-white px-5 py-8 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
        <p className="text-[0.7rem] uppercase tracking-[0.42em] text-[#071E9C]">{entry.title}</p>
        <h1 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-4xl">{entry.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
          {entry.subtitle}
        </p>
      </div>
    </section>
  );
}
import DashboardSummary from "@/app/dashboard/dashboard-summary";
import { AccountSubscriptions } from "@/app/dashboard/account-subscriptions";
import { AccountSettings } from "@/app/dashboard/account-settings";
import { getAccountSubscriptions, getUpcomingAccountCharges } from "@/lib/account-subscriptions-server";
import { getPanelPlan } from "@/lib/plans-server";
import { requirePanelSession } from "@/lib/require-panel-session";
