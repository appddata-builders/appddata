import { redirect } from "next/navigation";

import IminWorkspace from "@/app/components/imin/imin-workspace";
import { getPanelPlan } from "@/lib/plans-server";
import { requirePanelSession } from "@/lib/require-panel-session";

import { IminUpgrade } from "./imin-upgrade";

/**
 * El editor IMIN real a pantalla completa. La demo publica vive separada en
 * /imin y no controla la configuracion de este workspace.
 */
export default async function DashboardIminPage() {
  const session = await requirePanelSession();
  if (!session) redirect("/account/login?siguiente=%2Fdashboard%2Fimin");

  const plan = await getPanelPlan(session);
  if (!plan.hasImin) {
    return <IminUpgrade isFree={plan.sitePlan === "free"} />;
  }

  return (
    // Los margenes negativos anulan el padding del chrome para que el editor
    // ocupe todo el alto util debajo de la barra superior.
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] flex-col sm:-mx-6">
      <IminWorkspace
        projectSlug={plan.projectSlug ?? "refautomex"}
        siteUrl="https://refautomex.com"
        siteName={plan.projectName ?? "refautomex.com"}
      />
    </div>
  );
}
