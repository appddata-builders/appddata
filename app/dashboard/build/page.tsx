import { redirect } from "next/navigation";

import BuildWorkspace from "@/app/components/build/build-workspace";
import { getPanelPlan } from "@/lib/plans-server";
import { requirePanelSession } from "@/lib/require-panel-session";

/**
 * Appddata Build: armador de sitios de una sola hoja (Navbar, Body, Footer).
 *
 * Toma la idea general del editor IMIN pero es una hoja en blanco: el usuario
 * enciende widgets populares (carrusel, tiers, video/imagen de fondo) y ve la
 * vista previa en tiempo real segun el plan que quiera contratar.
 */
export default async function DashboardBuildPage() {
  const session = await requirePanelSession();
  if (!session) redirect("/account/login?siguiente=%2Fdashboard%2Fbuild");

  const plan = await getPanelPlan(session);
  if (!plan.isInternal && !plan.hasUnassignedSitePackage) redirect("/dashboard");

  // El builder abre con las especificaciones del plan CONTRATADO para el sitio
  // nuevo (el ticket pendiente), no las del plan mayor al que apunte la cuenta.
  // Sin ticket (admin interno) se usa el plan del sitio actual como respaldo.
  const buildPlan = plan.pendingSitePlan ?? plan.sitePlan;

  return (
    // Los margenes negativos anulan el padding del chrome para ocupar todo el
    // alto util debajo de la barra superior, igual que el editor IMIN.
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] flex-col sm:-mx-6">
      <BuildWorkspace
        siteName={plan.projectName ?? "innovation.appddata.io"}
        initialPlan={buildPlan === "free" ? "beginner" : buildPlan}
        availableSites={plan.availableSites}
        isInternal={plan.isInternal}
      />
    </div>
  );
}
