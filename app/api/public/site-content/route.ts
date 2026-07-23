import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { hydrate, project, projectText } from "@/db/schema";

/**
 * Contenido editable publico de un sitio generado, para hidratarlo en runtime.
 *
 * Devuelve `{ texts, edits }`:
 *  - `texts`: mapa `clave -> valor` (base sembrada en `hydrate` + overrides por
 *    clave guardados en `project_text`; estos ultimos ganan).
 *  - `edits`: lista de ediciones por selector de IMIN (color/icono/medios).
 *
 * Es de solo lectura y publico (el contenido del sitio es publico) con CORS,
 * porque el sitio corre en otro origen (`*.netlify.app`).
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=30",
};

const IMIN_EDITS_KEY = "imin.editor.edits";
/** Claves internas que no son contenido del sitio. */
const isInternalKey = (key: string) => key.startsWith("site.") || key === IMIN_EDITS_KEY;

export function OPTIONS() {
  return new NextResponse(null, { headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "slug requerido" }, { status: 400, headers: CORS });
  }
  const db = getDb();
  const [proj] = await db.select({ id: project.id }).from(project).where(eq(project.slug, slug)).limit(1);
  if (!proj) {
    return NextResponse.json({ error: "proyecto no encontrado" }, { status: 404, headers: CORS });
  }

  const texts: Record<string, string> = {};
  // Base: hydrate (por slug).
  const hydrateRows = await db.select().from(hydrate).where(eq(hydrate.projectSlug, slug));
  for (const row of hydrateRows) texts[row.contentKey] = row.contentValue;

  // Overrides por clave + ediciones por selector desde project_text.
  let edits: unknown[] = [];
  const textRows = await db.select().from(projectText).where(eq(projectText.projectId, proj.id));
  for (const row of textRows) {
    if (row.contentKey === IMIN_EDITS_KEY) {
      try {
        const parsed = JSON.parse(row.contentValue);
        if (Array.isArray(parsed)) edits = parsed;
      } catch {
        // JSON corrupto: se ignora, el sitio queda con su contenido base.
      }
      continue;
    }
    if (isInternalKey(row.contentKey)) continue;
    texts[row.contentKey] = row.contentValue;
  }

  return NextResponse.json({ slug, texts, edits }, { headers: CORS });
}
