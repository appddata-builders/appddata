import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { hydrate, project, projectText, siteEntitlement, user, userProject } from "@/db/schema";
import { ensureDefaultProjects } from "@/lib/default-projects";
import { ensureProjectAccessSchema } from "@/lib/project-access-server";
import { requirePanelSession } from "@/lib/require-panel-session";
import { generateReactSiteFiles } from "@/lib/react-site/generate-react-site";
import { buildContentSeed } from "@/lib/react-site/content-keys";
import { createGitHubRepository, deleteGitHubRepository } from "@/lib/github-repository";
import { deployNetlifySite } from "@/lib/netlify-site";
import { uploadDocumentMediaToS3 } from "@/lib/project-assets-s3";
import { validateProjectName } from "@/lib/project-name";
import { ensureSiteEntitlementSchema } from "@/lib/site-entitlements-server";
import { normalizePlan, sitePlanFromProjectPlan, type PurchasableSitePlan } from "@/lib/plans";

// Streaming + sharp + DB requieren el runtime de Node; la ruta no debe cachearse.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestedSitePlan(value: unknown): PurchasableSitePlan | null {
  return value === "beginner" || value === "super" || value === "premium" ? value : null;
}

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
  const body = await request.json() as { name?: unknown; sitePlan?: unknown; validateOnly?: boolean; document?: unknown };
  const validation = validateProjectName(body.name);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  const selectedPlan = requestedSitePlan(body.sitePlan);
  if (!selectedPlan && session.user.role !== "admin") {
    return NextResponse.json({ error: "Selecciona un paquete disponible." }, { status: 400 });
  }
  const db = getDb();
  await ensureSiteEntitlementSchema();
  const unassignedEntitlements = await db
    .select({ id: siteEntitlement.id, plan: siteEntitlement.plan })
    .from(siteEntitlement)
    .where(and(eq(siteEntitlement.userId, session.user.id), isNull(siteEntitlement.projectSlug)))
    .orderBy(asc(siteEntitlement.createdAt));
  const entitlement = unassignedEntitlements.find(
    (item) => sitePlanFromProjectPlan(normalizePlan(item.plan)) === selectedPlan,
  );
  if (!entitlement && session.user.role !== "admin") {
    return NextResponse.json({ error: `No tienes sitios del paquete ${selectedPlan} disponibles.` }, { status: 403 });
  }
  const existing = await db.select({ id: project.id }).from(project).where(eq(project.slug, validation.slug)).limit(1);
  if (existing.length > 0) return NextResponse.json({ error: "Ya existe un proyecto con ese nombre.", slug: validation.slug }, { status: 409 });
  if (body.validateOnly) return NextResponse.json({ ok: true, name: validation.name, slug: validation.slug, available: true });

  // La creacion se emite como STREAM NDJSON (una linea JSON por fase) para que el
  // cliente muestre en vivo que esta pasando: S3 -> repo -> Netlify -> guardando.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      const fail = (error: string, extra: Record<string, unknown> = {}) => {
        emit({ phase: "error", error, ...extra });
        controller.close();
      };
      try {
        // 1) Multimedia a S3 (`{slug}/...`, imagenes → JPG); reescribe el documento.
        emit({ phase: "s3", message: "Subiendo multimedia a S3…" });
        const preparedDocument = await uploadDocumentMediaToS3(validation.slug, body.document);

        // 2) Repo en GitHub (antes de tocar la DB o redimir el ticket).
        emit({ phase: "repo", message: "Creando repositorio en GitHub…" });
        let repository: Awaited<ReturnType<typeof createGitHubRepository>>;
        try {
          const generatedFiles = generateReactSiteFiles(validation.name, validation.slug, preparedDocument);
          repository = await createGitHubRepository(validation.name, validation.slug, generatedFiles);
        } catch (error) {
          return fail(error instanceof Error ? error.message : "No se pudo generar el sitio.");
        }
        if (repository.status === "name_taken") {
          return fail(`El nombre "${validation.name}" ya esta en uso. Elige otro nombre e intentalo de nuevo.`, { code: "name_in_use", field: "name" });
        }

        // 3) Sitio en Netlify enlazado al repositorio.
        emit({ phase: "deploy", message: "Creando sitio en Netlify…" });
        let deployment: Awaited<ReturnType<typeof deployNetlifySite>> | { status: "configuration_required" };
        try {
          deployment =
            repository.status === "created"
              ? await deployNetlifySite(validation.name, validation.slug, {
                  fullName: repository.fullName,
                  id: repository.id,
                  private: repository.private,
                })
              : ({ status: "configuration_required" } as const);
        } catch (error) {
          if (repository.status === "created") await deleteGitHubRepository(repository.owner, repository.name);
          return fail(error instanceof Error ? error.message : "No se pudo publicar el sitio.");
        }
        if (deployment.status === "name_taken") {
          if (repository.status === "created") await deleteGitHubRepository(repository.owner, repository.name);
          return fail(`El nombre "${validation.name}" ya esta en uso en Netlify. Elige otro nombre e intentalo de nuevo.`, { code: "name_in_use", field: "name" });
        }

        // 4) Guardar en DB y redimir el ticket (recien ahora que todo salio bien).
        emit({ phase: "saving", message: "Guardando proyecto y activando…" });
        const projectId = crypto.randomUUID();
        const purchasedPlan = entitlement?.plan ?? selectedPlan ?? "premium";
        await db.insert(project).values({ id: projectId, slug: validation.slug, name: validation.name, plan: purchasedPlan });
        if (entitlement) {
          await db.update(siteEntitlement)
            .set({ projectSlug: validation.slug })
            .where(and(eq(siteEntitlement.id, entitlement.id), isNull(siteEntitlement.projectSlug)));
          if (!session.user.projectSlug) {
            await db.update(user).set({ projectSlug: validation.slug }).where(eq(user.id, session.user.id));
          }
        }
        const entries = [
          { key: "site.document", value: JSON.stringify(preparedDocument ?? {}) },
          { key: "site.generator.status", value: "created" },
          { key: "site.netlify", value: JSON.stringify(deployment) },
          { key: "site.github", value: JSON.stringify(repository) },
        ];
        for (const entry of entries) await db.insert(projectText).values({ id: crypto.randomUUID(), projectId, contentKey: entry.key, contentValue: entry.value });

        const seed = Object.entries(buildContentSeed(preparedDocument));
        if (seed.length > 0) {
          await db.insert(projectText).values(seed.map(([contentKey, contentValue]) => ({ id: crypto.randomUUID(), projectId, contentKey, contentValue })));
          await db.insert(hydrate).values(seed.map(([contentKey, contentValue]) => ({ id: crypto.randomUUID(), projectSlug: validation.slug, contentKey, contentValue })));
        }

        await ensureProjectAccessSchema();
        await db.insert(userProject)
          .values({ id: crypto.randomUUID(), userId: session.user.id, projectSlug: validation.slug, siteUrl: (deployment as { url?: string }).url ?? `https://${validation.slug}.netlify.app` })
          .onConflictDoNothing();

        emit({ phase: "done", project: { id: projectId, name: validation.name, slug: validation.slug }, deployment, repository });
        controller.close();
      } catch (error) {
        fail(error instanceof Error ? error.message : "No se pudo crear el sitio.");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
