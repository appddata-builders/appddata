import { redirect } from "next/navigation";

import { isRoot, requirePanelSession } from "@/lib/require-panel-session";

import { DatabasesClient } from "./databases-client";

/**
 * Modulo interno "Databases": explorador de solo-lectura de las bases del
 * droplet. Solo visible/accesible para cuentas root (allowlist por env).
 */
export default async function DashboardDatabasesPage() {
  const session = await requirePanelSession();
  if (!session) redirect("/account/login?siguiente=%2Fdashboard%2Fdatabases");
  if (!isRoot(session)) redirect("/dashboard");

  return <DatabasesClient />;
}
