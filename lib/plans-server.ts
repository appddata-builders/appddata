/**
 * Lectura del plan contratado. Solo para server components y route handlers:
 * importa la base de datos.
 *
 * El plan vive en el proyecto, no en la persona: lo que se vende es el sitio.
 * Un admin de Appddata no tiene proyecto asignado y entra a todo.
 */
import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { project, siteEntitlement } from "@/db/schema";
import {
  normalizePlan,
  planHasImin,
  sitePlanFromProjectPlan,
  type PanelPlan,
  type ProjectPlan,
} from "@/lib/plans";
import { hasActiveImin } from "@/lib/imin-entitlements-server";
import { isAdmin, type PanelSession } from "@/lib/require-panel-session";
import type { SitePlan } from "@/lib/site-packages";
import { ensureSiteEntitlementSchema } from "@/lib/site-entitlements-server";

export async function getProjectPlan(slug: string): Promise<ProjectPlan> {
  const [row] = await getDb()
    .select({ plan: project.plan })
    .from(project)
    .where(eq(project.slug, slug))
    .limit(1);
  return normalizePlan(row?.plan);
}

export async function getPanelPlan(session: PanelSession): Promise<PanelPlan> {
  if (isAdmin(session)) {
    return {
      projectSlug: null,
      projectName: null,
      plan: "imin",
      sitePlan: "premium",
      hasImin: true,
      hasUnassignedSitePackage: true,
      availableSites: 0,
      pendingSitePlan: null,
      isInternal: true,
    };
  }

  await ensureSiteEntitlementSchema();
  // Cada entitlement sin `projectSlug` es un ticket/moneda sin consumir: uno por
  // sitio que la cuenta todavia puede crear. El mas reciente define el plan.
  const unassigned = await getDb()
    .select({ plan: siteEntitlement.plan })
    .from(siteEntitlement)
    .where(and(eq(siteEntitlement.userId, session.user.id), isNull(siteEntitlement.projectSlug)))
    .orderBy(desc(siteEntitlement.createdAt));
  const availableSites = unassigned.length;
  const availablePlan = normalizePlan(unassigned[0]?.plan);
  // El proximo sitio se construye con el plan del ticket que se va a consumir,
  // que es el mas antiguo (projects/route.ts los consume en orden asc). Como
  // `unassigned` viene ordenado desc, el mas antiguo es el ultimo.
  const pendingSitePlan: SitePlan | null =
    availableSites > 0
      ? sitePlanFromProjectPlan(normalizePlan(unassigned[unassigned.length - 1]?.plan))
      : null;
  // IMIN es de la cuenta y por periodo: activo mientras la suscripcion no caduque.
  // Se mantiene el plan del proyecto (imin/premium) como via heredada.
  const iminActive = await hasActiveImin(session.user.id);
  const slug = session.user.projectSlug;
  if (slug == null || slug === "") {
    return {
      projectSlug: null,
      projectName: null,
      plan: "free",
      sitePlan: sitePlanFromProjectPlan(availablePlan),
      hasImin: iminActive || planHasImin(availablePlan),
      hasUnassignedSitePackage: availableSites > 0,
      availableSites,
      pendingSitePlan,
      isInternal: false,
    };
  }

  const [row] = await getDb()
    .select({ name: project.name, plan: project.plan })
    .from(project)
    .where(eq(project.slug, slug))
    .limit(1);

  const plan = normalizePlan(row?.plan);
  return {
    projectSlug: slug,
    projectName: row?.name ?? slug,
    plan,
    sitePlan: sitePlanFromProjectPlan(plan),
    hasImin: iminActive || planHasImin(plan),
    hasUnassignedSitePackage: availableSites > 0,
    availableSites,
    pendingSitePlan,
    isInternal: false,
  };
}
