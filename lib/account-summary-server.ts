/**
 * Datos reales que alimentan el resumen de cuenta del panel.
 *
 * Solo lee lo que el sistema ya sabe con certeza. En particular NO inventa un
 * estado de despliegue: hoy no se persiste el id del sitio en Netlify, asi que
 * el estado se deriva de si el proyecto tiene o no una URL vinculada.
 */
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

import { getDb } from "@/db";
import { project, siteEntitlement, userProject } from "@/db/schema";
import { normalizePlan, sitePlanFromProjectPlan } from "@/lib/plans";
import { ensureProjectAccessSchema } from "@/lib/project-access-server";
import type { PanelSession } from "@/lib/require-panel-session";
import { ensureSiteEntitlementSchema } from "@/lib/site-entitlements-server";
import type { SitePlan } from "@/lib/site-packages";

export type AccountSite = {
  slug: string;
  name: string;
  /** URL publicada; `null` cuando el proyecto existe pero no se ha vinculado. */
  url: string | null;
  plan: SitePlan;
  createdAt: string | null;
};

export async function getAccountSites(session: PanelSession): Promise<AccountSite[]> {
  await Promise.all([ensureProjectAccessSchema(), ensureSiteEntitlementSchema()]);
  const db = getDb();

  const links = await db
    .select({ slug: userProject.projectSlug, url: userProject.siteUrl, createdAt: userProject.createdAt })
    .from(userProject)
    .where(eq(userProject.userId, session.user.id));

  const slugs = new Set(links.map((link) => link.slug));
  if (session.user.projectSlug) slugs.add(session.user.projectSlug);
  if (slugs.size === 0) return [];

  const [projects, consumed] = await Promise.all([
    db
      .select({ slug: project.slug, name: project.name, plan: project.plan })
      .from(project)
      .where(inArray(project.slug, [...slugs]))
      .orderBy(asc(project.name)),
    db
      .select({ slug: siteEntitlement.projectSlug, plan: siteEntitlement.plan })
      .from(siteEntitlement)
      .where(and(eq(siteEntitlement.userId, session.user.id), isNotNull(siteEntitlement.projectSlug))),
  ]);

  const linkBySlug = new Map(links.map((link) => [link.slug, link]));
  // El plan del ticket consumido manda: es el paquete que realmente se pago
  // para ESE sitio. `project.plan` es la via heredada.
  const planBySlug = new Map(consumed.map((row) => [row.slug, row.plan]));

  return projects.map((row) => {
    const link = linkBySlug.get(row.slug);
    return {
      slug: row.slug,
      name: row.name,
      url: link?.url ?? null,
      plan: sitePlanFromProjectPlan(normalizePlan(planBySlug.get(row.slug) ?? row.plan)),
      createdAt: link?.createdAt ? new Date(link.createdAt).toISOString() : null,
    };
  });
}
