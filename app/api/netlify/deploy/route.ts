/**
 * Webhook de Netlify: se dispara cuando un deploy queda listo (evento
 * `deploy_created`). Cuando el build del sitio completa, publicamos la
 * multimedia del proyecto en su folder de S3 (`{slug}/...`).
 *
 * Seguridad: se valida un secreto compartido por query (`?token=`), igual al
 * NETLIFY_DEPLOY_WEBHOOK_SECRET con el que se registro la notificacion.
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { project, projectText } from "@/db/schema";
import { publishProjectMediaToS3 } from "@/lib/project-assets-s3";

// sharp necesita el runtime de Node (no edge) y la ruta no debe cachearse.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeployPayload = {
  name?: string;
  state?: string;
  site_id?: string;
};

export async function POST(request: Request) {
  const secret = process.env.NETLIFY_DEPLOY_WEBHOOK_SECRET?.trim();
  if (!secret) return Response.json({ error: "webhook no configurado" }, { status: 503 });
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (token !== secret) return Response.json({ error: "no autorizado" }, { status: 401 });

  let payload: DeployPayload;
  try {
    payload = (await request.json()) as DeployPayload;
  } catch {
    return Response.json({ error: "payload invalido" }, { status: 400 });
  }

  // Solo actuamos cuando el deploy quedo publicado.
  if (payload.state && payload.state !== "ready" && payload.state !== "current") {
    return Response.json({ ok: true, skipped: `estado ${payload.state}` });
  }

  const slug = payload.name?.trim();
  if (!slug) return Response.json({ error: "sin slug de sitio" }, { status: 400 });

  const db = getDb();
  const [proj] = await db.select({ id: project.id }).from(project).where(eq(project.slug, slug)).limit(1);
  if (!proj) return Response.json({ error: "proyecto no encontrado" }, { status: 404 });

  const [docRow] = await db
    .select({ value: projectText.contentValue })
    .from(projectText)
    .where(and(eq(projectText.projectId, proj.id), eq(projectText.contentKey, "site.document")))
    .limit(1);
  if (!docRow?.value) return Response.json({ error: "documento del sitio no encontrado" }, { status: 404 });

  let document: unknown;
  try {
    document = JSON.parse(docRow.value);
  } catch {
    return Response.json({ error: "documento invalido" }, { status: 422 });
  }

  try {
    const result = await publishProjectMediaToS3(slug, document);
    // Guarda el estado (idempotente: reemplaza el registro previo).
    await db.delete(projectText).where(and(eq(projectText.projectId, proj.id), eq(projectText.contentKey, "site.s3assets")));
    await db.insert(projectText).values({
      id: crypto.randomUUID(),
      projectId: proj.id,
      contentKey: "site.s3assets",
      contentValue: JSON.stringify({ ...result, at: new Date().toISOString() }),
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "no se pudo publicar la multimedia";
    return Response.json({ error: message }, { status: 502 });
  }
}
