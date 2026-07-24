import { asc, eq, inArray, sql } from "drizzle-orm";

import { getAuthProvider, getDb, getPgDb, getSqliteDb } from "@/db";
import { project, userProject } from "@/db/schema";
import { ensureProjectAccessSchema } from "@/lib/project-access-server";
import { isRoot, type PanelSession } from "@/lib/require-panel-session";

let schemaPromise: Promise<void> | null = null;

export function ensureSiteRequirementSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    if (getAuthProvider() === "pg") {
      const db = getPgDb();
      await db.execute(sql`create table if not exists "site_requirement" (
        "id" text primary key,
        "user_id" text not null references "user"("id") on delete cascade,
        "project_slug" text,
        "contact_name" text,
        "contact_email" text,
        "content" text not null,
        "ai_analysis" text,
        "ai_status" text not null default 'pending',
        "ai_model" text,
        "status" text not null default 'pending',
        "created_at" timestamp(3) not null default now()
      )`);
      await db.execute(sql`alter table "site_requirement" add column if not exists "contact_name" text`);
      await db.execute(sql`alter table "site_requirement" add column if not exists "contact_email" text`);
      await db.execute(sql`alter table "site_requirement" add column if not exists "ai_analysis" text`);
      await db.execute(sql`alter table "site_requirement" add column if not exists "ai_status" text not null default 'pending'`);
      await db.execute(sql`alter table "site_requirement" add column if not exists "ai_model" text`);
      await db.execute(sql`create index if not exists "site_requirement_user_id_idx" on "site_requirement" ("user_id")`);
    } else {
      const db = getSqliteDb();
      db.run(sql`create table if not exists "site_requirement" (
        "id" text primary key,
        "user_id" text not null references "user"("id") on delete cascade,
        "project_slug" text,
        "contact_name" text,
        "contact_email" text,
        "content" text not null,
        "ai_analysis" text,
        "ai_status" text not null default 'pending',
        "ai_model" text,
        "status" text not null default 'pending',
        "created_at" integer not null default (cast(unixepoch('subsecond') * 1000 as integer))
      )`);
      const migrations = [
        { name: "contact_name", statement: `alter table "site_requirement" add column "contact_name" text` },
        { name: "contact_email", statement: `alter table "site_requirement" add column "contact_email" text` },
        { name: "ai_analysis", statement: `alter table "site_requirement" add column "ai_analysis" text` },
        { name: "ai_status", statement: `alter table "site_requirement" add column "ai_status" text not null default 'pending'` },
        { name: "ai_model", statement: `alter table "site_requirement" add column "ai_model" text` },
      ];
      const columns = db.all(sql`pragma table_info("site_requirement")`) as Array<{ name: string }>;
      const existingColumns = new Set(columns.map((column) => column.name));
      for (const migration of migrations) {
        if (!existingColumns.has(migration.name)) db.run(sql.raw(migration.statement));
      }
      db.run(sql`create index if not exists "site_requirement_user_id_idx" on "site_requirement" ("user_id")`);
    }
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

export async function createSiteRequirement(input: {
  userId: string;
  projectSlug: string;
  contactName: string;
  contactEmail: string;
  content: string;
}) {
  await ensureSiteRequirementSchema();
  const id = crypto.randomUUID();
  if (getAuthProvider() === "pg") {
    await getPgDb().execute(sql`insert into "site_requirement"
      ("id", "user_id", "project_slug", "contact_name", "contact_email", "content")
      values (${id}, ${input.userId}, ${input.projectSlug}, ${input.contactName}, ${input.contactEmail}, ${input.content})`);
  } else {
    getSqliteDb().run(sql`insert into "site_requirement"
      ("id", "user_id", "project_slug", "contact_name", "contact_email", "content")
      values (${id}, ${input.userId}, ${input.projectSlug}, ${input.contactName}, ${input.contactEmail}, ${input.content})`);
  }
  return id;
}

export async function saveRequirementAnalysis(input: {
  id: string;
  analysis: string | null;
  status: "completed" | "failed";
  model: string;
}) {
  await ensureSiteRequirementSchema();
  if (getAuthProvider() === "pg") {
    await getPgDb().execute(sql`update "site_requirement"
      set "ai_analysis" = ${input.analysis}, "ai_status" = ${input.status}, "ai_model" = ${input.model}
      where "id" = ${input.id}`);
  } else {
    getSqliteDb().run(sql`update "site_requirement"
      set "ai_analysis" = ${input.analysis}, "ai_status" = ${input.status}, "ai_model" = ${input.model}
      where "id" = ${input.id}`);
  }
}

export type RequirementProject = { slug: string; name: string };

export async function getRequirementProjects(session: PanelSession): Promise<RequirementProject[]> {
  if (session.user.role === "admin" || isRoot(session)) {
    return getDb().select({ slug: project.slug, name: project.name }).from(project).orderBy(asc(project.name));
  }
  await ensureProjectAccessSchema();
  const links = await getDb().select({ slug: userProject.projectSlug }).from(userProject)
    .where(eq(userProject.userId, session.user.id));
  const slugs = new Set(links.map((link) => link.slug));
  if (session.user.projectSlug) slugs.add(session.user.projectSlug);
  if (slugs.size === 0) return [];
  return getDb().select({ slug: project.slug, name: project.name }).from(project)
    .where(inArray(project.slug, [...slugs]))
    .orderBy(asc(project.name));
}
