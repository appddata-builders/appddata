import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { project, projectText } from "@/db/schema";
import { getPanelPlan } from "@/lib/plans-server";
import { isAdmin, requirePanelSession } from "@/lib/require-panel-session";
import { canAccessProject } from "@/lib/project-access-server";

/**
 * Cambios del editor IMIN de un proyecto.
 *
 * Se guardan como un solo JSON en `project_text` porque son una lista de
 * ordenes para el bridge (selector + valor), no textos sueltos del sitio. Al
 * abrir el editor se reaplican sobre el sitio incrustado.
 */
const EDITS_KEY = "imin.editor.edits";

async function resolveProject(slug: string) {
  const [row] = await getDb()
    .select({ id: project.id })
    .from(project)
    .where(eq(project.slug, slug))
    .limit(1);
  return row ?? null;
}

async function guard(slug: string) {
  const session = await requirePanelSession();
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    if (!(await canAccessProject(session, slug))) {
      return NextResponse.json({ error: "no autorizado" }, { status: 403 });
    }
    // IMIN es de la CUENTA (pago unico para todos sus sitios), no del plan del
    // proyecto: un sitio super de una cuenta con IMIN tambien se puede editar.
    if (!(await getPanelPlan(session)).hasImin) {
      return NextResponse.json({ error: "paquete IMIN no contratado" }, { status: 403 });
    }
  }
  return null;
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!slug) {
    return NextResponse.json({ error: "falta slug" }, { status: 400 });
  }
  const denied = await guard(slug);
  if (denied) return denied;

  const proj = await resolveProject(slug);
  if (!proj) {
    return NextResponse.json({ error: "proyecto no encontrado" }, { status: 404 });
  }

  const [row] = await getDb()
    .select({ value: projectText.contentValue })
    .from(projectText)
    .where(and(eq(projectText.projectId, proj.id), eq(projectText.contentKey, EDITS_KEY)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ edits: [] });
  }

  try {
    const parsed = JSON.parse(row.value) as unknown;
    return NextResponse.json({ edits: Array.isArray(parsed) ? parsed : [] });
  } catch {
    // Un JSON corrupto no debe tumbar el editor: se abre sin cambios previos.
    return NextResponse.json({ edits: [] });
  }
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { slug?: string; edits?: unknown };
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!slug) {
    return NextResponse.json({ error: "falta slug" }, { status: 400 });
  }
  if (!Array.isArray(body.edits)) {
    return NextResponse.json({ error: "cuerpo invalido" }, { status: 400 });
  }

  const denied = await guard(slug);
  if (denied) return denied;

  const proj = await resolveProject(slug);
  if (!proj) {
    return NextResponse.json({ error: "proyecto no encontrado" }, { status: 404 });
  }

  // Lo que llega es el delta de la sesion; se fusiona con lo ya guardado por
  // selector y tipo para no perder ediciones de otras visitas.
  const merged = new Map<string, Record<string, unknown>>();
  const [existing] = await getDb()
    .select({ value: projectText.contentValue })
    .from(projectText)
    .where(and(eq(projectText.projectId, proj.id), eq(projectText.contentKey, EDITS_KEY)))
    .limit(1);

  if (existing) {
    try {
      const parsed = JSON.parse(existing.value) as Record<string, unknown>[];
      if (Array.isArray(parsed)) {
        for (const edit of parsed) merged.set(`${edit.type}|${edit.selector}`, edit);
      }
    } catch {
      // Se descarta lo ilegible y se reescribe con lo que llega ahora.
    }
  }

  for (const raw of body.edits) {
    const edit = raw as Record<string, unknown>;
    if (typeof edit?.type !== "string" || typeof edit?.selector !== "string") continue;
    merged.set(`${edit.type}|${edit.selector}`, edit);
  }

  // Las ediciones con `key` (elementos con data-imin-key: textos e imagenes) se
  // persisten ademas como contenido por clave en project_text; el endpoint
  // publico lo superpone sobre hydrate y el sitio lo refleja en runtime.
  const keyed: Record<string, string> = {};
  for (const edit of merged.values()) {
    const key = typeof edit.key === "string" ? edit.key : "";
    if (!key) continue;
    if (edit.type === "set-text" && typeof edit.value === "string") keyed[key] = edit.value;
    else if (edit.type === "set-media" && typeof edit.src === "string") keyed[key] = edit.src;
  }
  for (const [contentKey, contentValue] of Object.entries(keyed)) {
    const [row] = await getDb()
      .select({ id: projectText.id })
      .from(projectText)
      .where(and(eq(projectText.projectId, proj.id), eq(projectText.contentKey, contentKey)))
      .limit(1);
    if (row) {
      await getDb().update(projectText).set({ contentValue }).where(eq(projectText.id, row.id));
    } else {
      await getDb().insert(projectText).values({ id: crypto.randomUUID(), projectId: proj.id, contentKey, contentValue });
    }
  }

  const value = JSON.stringify([...merged.values()]);

  if (existing) {
    await getDb()
      .update(projectText)
      .set({ contentValue: value })
      .where(and(eq(projectText.projectId, proj.id), eq(projectText.contentKey, EDITS_KEY)));
  } else {
    await getDb().insert(projectText).values({
      id: crypto.randomUUID(),
      projectId: proj.id,
      contentKey: EDITS_KEY,
      contentValue: value,
    });
  }

  return NextResponse.json({ ok: true, count: merged.size });
}
