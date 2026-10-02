const titles: Record<string, { title: string; subtitle: string }> = {
  "": {
    title: "Planes",
    subtitle: "Vista general del panel interno. Aqui conectaras metricas y alertas.",
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
  "configuracion/pagos": {
    title: "Configuracion: pagos",
    subtitle: "Metodos de pago, facturacion y movimientos de la cuenta.",
  },
  "configuracion/autenticacion": {
    title: "Requerimientos",
    subtitle: "Esta sección se movió a Requerimientos.",
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
    if (session) {
      const [plan, sites, infra] = await Promise.all([
        getPanelPlan(session),
        getAccountSites(session),
        // Una sola lectura: alimenta el cobro del cliente y, si es root, el
        // panel interno. El costo crudo de DigitalOcean nunca sale de aqui.
        getInfraConsoleCached(),
      ]);
      const billing = buildAccountBilling(sites, infra);
      return (
        <DashboardSummary
          plan={plan}
          sites={sites}
          billing={billing}
          infra={isRoot(session) ? infra : null}
        />
      );
    }
  }
  if (key === "configuracion/pagos") {
    const session = await requirePanelSession();
    if (session) {
      const [plan, subscriptions, upcomingCharges, sites, infra] = await Promise.all([
        getPanelPlan(session),
        getAccountSubscriptions(session.user.id),
        getUpcomingAccountCharges(session.user.id),
        getAccountSites(session),
        getInfraConsoleCached(),
      ]);
      // Mismo calculo que el resumen: pagos no puede mostrar otro numero.
      const billing = buildAccountBilling(sites, infra);
      return (
        <section className="mx-auto w-full max-w-5xl space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Configuración</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Pagos y servicios</h1>
            <p className="mt-2 text-sm text-slate-600">Regulariza tu cuenta y administra las suscripciones asociadas.</p>
          </div>
          <AccountBillingCard billing={billing} infra={isRoot(session) ? infra : null} />

          {/* Las suscripciones son recurrencias contratadas aparte: su total no
              se mezcla con el consumo mensual del sitio. */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Suscripciones</p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-900">
              Servicios contratados aparte
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Se cobran de forma independiente al consumo mensual de tus sitios.
            </p>
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
  if (key === "dominios") {
    const session = await requirePanelSession();
    if (session) {
      const isAppddataOwner = session.user.email.toLowerCase() === "isaac.eduardo.odriozola@gmail.com";
      return (
        <AccountDomains
          domains={isAppddataOwner ? [{
            domain: "appddata.com",
            ownerEmail: "isaac.eduardo.odriozola@gmail.com",
            registrar: "Squarespace",
            project: "appddata",
            status: "connected",
            managedByAppddata: true,
            renewalOwner: "client",
          }] : []}
        />
      );
    }
  }
  if (key === "seguridad") {
    const session = await requirePanelSession();
    if (session) {
      const [accountSites, infra] = await Promise.all([getAccountSites(session), getInfraConsoleCached()]);
      const routingManaged =
        (infra.breakdown.ok && infra.breakdown.data.some((item) => /load balancer/i.test(item.product))) ||
        (infra.workloads.ok && infra.workloads.data.some((workload) => workload.namespace === "ingress-nginx"));
      const certificatesManaged =
        infra.workloads.ok && infra.workloads.data.some((workload) => workload.namespace === "cert-manager");
      const sites = accountSites.map((site) => {
        const workload = infra.workloads.ok
          ? infra.workloads.data.find((item) => item.namespace === site.slug)
          : undefined;
        let domain = site.name;
        let https = false;
        if (site.url) {
          try {
            const url = new URL(site.url);
            domain = url.hostname.replace(/^www\./, "");
            https = url.protocol === "https:";
          } catch {
            domain = site.name;
          }
        }
        return {
          domain,
          project: site.slug,
          https,
          runningPods: workload?.runningPods ?? 0,
          totalPods: workload?.pods.length ?? 0,
          routingManaged,
          certificatesManaged,
          domainManaged: Boolean(site.url),
        };
      });
      if (session.user.email.toLowerCase() === "isaac.eduardo.odriozola@gmail.com" && !sites.some((site) => site.domain === "appddata.com")) {
        const workload = infra.workloads.ok
          ? infra.workloads.data.find((item) => item.namespace === "appddata")
          : undefined;
        sites.unshift({
          domain: "appddata.com",
          project: "appddata",
          https: true,
          runningPods: workload?.runningPods ?? 0,
          totalPods: workload?.pods.length ?? 0,
          routingManaged,
          certificatesManaged,
          domainManaged: true,
        });
      }
      return <AccountSecurity sites={sites} />;
    }
  }
  if (key === "configuracion/settings") {
    const session = await requirePanelSession();
    if (session) return <AccountSettings user={session.user} />;
  }
  if (key === "requerimientos" || key === "configuracion/autenticacion") {
    const session = await requirePanelSession();
    if (session) {
      return (
        <SiteRequirements
          projects={await getRequirementProjects(session)}
          client={{
            name: session.user.name ?? "Cliente Appddata",
            email: session.user.email,
          }}
        />
      );
    }
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
import AccountBillingCard from "@/app/dashboard/account-billing";
import DashboardSummary from "@/app/dashboard/dashboard-summary";
import { AccountSubscriptions } from "@/app/dashboard/account-subscriptions";
import { AccountSettings } from "@/app/dashboard/account-settings";
import { AccountDomains } from "@/app/dashboard/account-domains";
import { AccountSecurity } from "@/app/dashboard/account-security";
import { SiteRequirements } from "@/app/dashboard/site-requirements";
import { getAccountSites } from "@/lib/account-summary-server";
import { getAccountSubscriptions, getUpcomingAccountCharges } from "@/lib/account-subscriptions-server";
import { getPanelPlan } from "@/lib/plans-server";
import { buildAccountBilling } from "@/lib/account-billing-server";
import { getInfraConsoleCached } from "@/lib/infra-console-server";
import { isRoot, requirePanelSession } from "@/lib/require-panel-session";
import { getRequirementProjects } from "@/lib/site-requirements-server";
