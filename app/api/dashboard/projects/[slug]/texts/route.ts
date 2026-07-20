import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { project, projectText } from "@/db/schema";
import { ensureDefaultProjects } from "@/lib/default-projects";
import { getProjectPlan } from "@/lib/plans-server";
import {
  canEditProject,
  isAdmin,
  requirePanelSession,
  type PanelSession,
} from "@/lib/require-panel-session";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * El candado del menu es cosmetico; el que manda es este. Un cliente solo
 * llega a los textos de su propio proyecto y solo si contrato el paquete.
 */
async function denyReason(session: PanelSession, slug: string): Promise<string | null> {
  if (isAdmin(session)) return null;
  if (!canEditProject(session, slug)) return "no autorizado";
  if ((await getProjectPlan(slug)) !== "imin") return "paquete IMIN no contratado";
  return null;
}

export async function GET(_request: Request, ctx: RouteParams) {
  const session = await requirePanelSession();
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  await ensureDefaultProjects();
  const { slug } = await ctx.params;
  const denied = await denyReason(session, slug);
  if (denied) {
    return NextResponse.json({ error: denied }, { status: 403 });
  }
  const proj = await getDb().select().from(project).where(eq(project.slug, slug)).limit(1);
  if (proj.length === 0) {
    return NextResponse.json({ error: "proyecto no encontrado" }, { status: 404 });
  }
  const textsRows = await getDb().select().from(projectText).where(eq(projectText.projectId, proj[0].id));
  const texts: Record<string, string> = {};
  for (const row of textsRows) {
    texts[row.contentKey] = row.contentValue;
  }
  return NextResponse.json({
    project: { id: proj[0].id, slug: proj[0].slug, name: proj[0].name },
    texts,
  });
}

export async function PUT(request: Request, ctx: RouteParams) {
  const session = await requirePanelSession();
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  await ensureDefaultProjects();
  const { slug } = await ctx.params;
  const denied = await denyReason(session, slug);
  if (denied) {
    return NextResponse.json({ error: denied }, { status: 403 });
  }
  const proj = await getDb().select().from(project).where(eq(project.slug, slug)).limit(1);
  if (proj.length === 0) {
    return NextResponse.json({ error: "proyecto no encontrado" }, { status: 404 });
  }
  const body = (await request.json()) as { entries?: Record<string, string> };
  const entries = body.entries;
  if (!entries || typeof entries !== "object") {
    return NextResponse.json({ error: "cuerpo invalido" }, { status: 400 });
  }
  const projectId = proj[0].id;
  for (const [rawKey, rawValue] of Object.entries(entries)) {
    if (typeof rawKey !== "string" || typeof rawValue !== "string") {
      continue;
    }
    const contentKey = rawKey.trim();
    if (!contentKey) {
      continue;
    }
    const existing = await getDb()
      .select()
      .from(projectText)
      .where(and(eq(projectText.projectId, projectId), eq(projectText.contentKey, contentKey)))
      .limit(1);
    if (existing.length === 0) {
      await getDb().insert(projectText).values({
        id: crypto.randomUUID(),
        projectId,
        contentKey,
        contentValue: rawValue,
      });
    } else {
      await getDb()
        .update(projectText)
        .set({ contentValue: rawValue })
        .where(eq(projectText.id, existing[0].id));
    }
  }
  return NextResponse.json({ ok: true });
}
