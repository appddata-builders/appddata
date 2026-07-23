import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { hydrate, project, projectText } from "@/db/schema";
import { ensureDefaultProjects } from "@/lib/default-projects";
import { requirePanelSession } from "@/lib/require-panel-session";
import { generateReactSiteFiles } from "@/lib/react-site/generate-react-site";
import { buildContentSeed } from "@/lib/react-site/content-keys";
import { createGitHubRepository } from "@/lib/github-repository";
import { deployNetlifySite } from "@/lib/netlify-site";
import { validateProjectName } from "@/lib/project-name";

export async function GET() {
  const session = await requirePanelSession();
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  await ensureDefaultProjects();
  const rows = await getDb().select().from(project);
  return NextResponse.json({
    projects: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requirePanelSession();
  if (!session) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const body = await request.json() as { name?: unknown; validateOnly?: boolean; document?: unknown };
  const validation = validateProjectName(body.name);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  const db = getDb();
  const existing = await db.select({ id: project.id }).from(project).where(eq(project.slug, validation.slug)).limit(1);
  if (existing.length > 0) return NextResponse.json({ error: "Ya existe un proyecto con ese nombre.", slug: validation.slug }, { status: 409 });
  if (body.validateOnly) return NextResponse.json({ ok: true, name: validation.name, slug: validation.slug, available: true });

  const projectId = crypto.randomUUID();
  await db.insert(project).values({ id: projectId, slug: validation.slug, name: validation.name, plan: "free" });
  const entries = [
    { key: "site.document", value: JSON.stringify(body.document ?? {}) },
    { key: "site.generator.status", value: "created" },
  ];
  for (const entry of entries) await db.insert(projectText).values({ id: crypto.randomUUID(), projectId, contentKey: entry.key, contentValue: entry.value });

  // Semilla del contenido editable (schema): cada texto/imagen del cliente como
  // clave -> valor, en project_text (lo edita IMIN) y hydrate (compat + base).
  const seed = Object.entries(buildContentSeed(body.document));
  if (seed.length > 0) {
    await db.insert(projectText).values(seed.map(([contentKey, contentValue]) => ({ id: crypto.randomUUID(), projectId, contentKey, contentValue })));
    await db.insert(hydrate).values(seed.map(([contentKey, contentValue]) => ({ id: crypto.randomUUID(), projectSlug: validation.slug, contentKey, contentValue })));
  }

  try {
    const generatedFiles = generateReactSiteFiles(validation.name, validation.slug, body.document);
    const repository = await createGitHubRepository(validation.name, validation.slug, generatedFiles);
    // El sitio de Netlify se enlaza al repo recien creado; sin repo no hay nada que construir.
    const deployment =
      repository.status === "created"
        ? await deployNetlifySite(validation.name, validation.slug, {
            fullName: repository.fullName,
            id: repository.id,
            private: repository.private,
          })
        : ({ status: "configuration_required" } as const);
    await db.insert(projectText).values({ id: crypto.randomUUID(), projectId, contentKey: "site.netlify", contentValue: JSON.stringify(deployment) });
    await db.insert(projectText).values({ id: crypto.randomUUID(), projectId, contentKey: "site.github", contentValue: JSON.stringify(repository) });
    return NextResponse.json({ ok: true, project: { id: projectId, name: validation.name, slug: validation.slug }, deployment, repository }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el sitio.";
    await db.insert(projectText).values({ id: crypto.randomUUID(), projectId, contentKey: "site.netlify", contentValue: JSON.stringify({ status: "error", message }) });
    return NextResponse.json({ error: message, project: { id: projectId, name: validation.name, slug: validation.slug }, deployment: { status: "error", message } }, { status: 502 });
  }
}
