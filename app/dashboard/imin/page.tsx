import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import IminWorkspace from "@/app/components/imin/imin-workspace";
import { getDb } from "@/db";
import { project, projectText } from "@/db/schema";
import { getPanelPlan } from "@/lib/plans-server";
import { requirePanelSession } from "@/lib/require-panel-session";

import { IminUpgrade } from "./imin-upgrade";

/** URL publica del sitio generado del proyecto (Netlify), si existe. */
async function resolveSiteUrl(slug: string): Promise<string | null> {
  const [proj] = await getDb().select({ id: project.id }).from(project).where(eq(project.slug, slug)).limit(1);
  if (!proj) return null;
  const [row] = await getDb()
    .select({ value: projectText.contentValue })
    .from(projectText)
    .where(and(eq(projectText.projectId, proj.id), eq(projectText.contentKey, "site.netlify")))
    .limit(1);
  if (!row) return null;
  try {
    const data = JSON.parse(row.value) as { url?: string; status?: string };
    return typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}

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

  const slug = plan.projectSlug ?? "refautomex";
  // El editor incrusta el sitio generado del proyecto; refautomex es el respaldo
  // para cuentas sin sitio generado propio.
  const siteUrl = (await resolveSiteUrl(slug)) ?? "https://refautomex.com";
  const siteName = plan.projectName ?? slug;

  return (
    // Los margenes negativos anulan el padding del chrome para que el editor
    // ocupe todo el alto util debajo de la barra superior.
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] flex-col sm:-mx-6">
      <IminWorkspace projectSlug={slug} siteUrl={siteUrl} siteName={siteName} />
    </div>
  );
}
