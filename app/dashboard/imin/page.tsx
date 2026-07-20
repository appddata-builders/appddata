import { redirect } from "next/navigation";

import IminTutorialWorkspace from "@/app/components/imin/imin-tutorial-workspace";
import { getPanelPlan } from "@/lib/plans-server";
import { requirePanelSession } from "@/lib/require-panel-session";

import { IminUpgrade } from "./imin-upgrade";

/**
 * El editor IMIN a pantalla completa: el mismo workspace que la demo publica de
 * /imin, pero con el guardado conectado al proyecto.
 */
export default async function DashboardIminPage() {
  const session = await requirePanelSession();
  if (!session) redirect("/account/login?siguiente=%2Fdashboard%2Fimin");

  const plan = await getPanelPlan(session);
  if (!plan.hasImin) {
    return <IminUpgrade projectName={plan.projectName} />;
  }

  return (
    // Los margenes negativos anulan el padding del chrome para que el editor
    // ocupe todo el alto util debajo de la barra superior.
    <div className="-mx-4 -my-6 flex h-[calc(100vh-3.5rem)] flex-col sm:-mx-6">
      <IminTutorialWorkspace variant="panel" projectSlug={plan.projectSlug ?? "imin"} />
    </div>
  );
}
