import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { project, projectText } from "@/db/schema";
import { ensureDefaultProjects } from "@/lib/default-projects";
import { getProjectReadSecret, isValidProjectReadToken } from "@/lib/project-read-secret";

function extractBearer(request: Request) {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

export async function GET(request: Request) {
  const expected = getProjectReadSecret();
  if (!expected) {
    return NextResponse.json({ error: "lectura publica no configurada" }, { status: 503 });
  }
  const token = extractBearer(request);
  if (!isValidProjectReadToken(token)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "slug requerido" }, { status: 400 });
  }
  await ensureDefaultProjects();
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
    slug: proj[0].slug,
    name: proj[0].name,
    texts,
  });
}
