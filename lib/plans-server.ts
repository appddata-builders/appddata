/**
 * Lectura del plan contratado. Solo para server components y route handlers:
 * importa la base de datos.
 *
 * El plan vive en el proyecto, no en la persona: lo que se vende es el sitio.
 * Un admin de Appddata no tiene proyecto asignado y entra a todo.
 */
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { project } from "@/db/schema";
import {
  normalizePlan,
  sitePlanFromProjectPlan,
  type PanelPlan,
  type ProjectPlan,
} from "@/lib/plans";
import { isAdmin, type PanelSession } from "@/lib/require-panel-session";

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
      isInternal: true,
    };
  }

  const slug = session.user.projectSlug;
  if (slug == null || slug === "") {
    return {
      projectSlug: null,
      projectName: null,
      plan: "free",
      sitePlan: "free",
      hasImin: false,
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
    hasImin: plan === "imin",
    isInternal: false,
  };
}
