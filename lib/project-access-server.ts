import { and, eq, sql } from "drizzle-orm";

import { getAuthProvider, getDb, getPgDb, getSqliteDb } from "@/db";
import { userProject } from "@/db/schema";
import type { PanelSession } from "@/lib/require-panel-session";

let schemaPromise: Promise<void> | null = null;

export function ensureProjectAccessSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    if (getAuthProvider() === "pg") {
      const db = getPgDb();
      await db.execute(sql`create table if not exists "user_project" (
        "id" text primary key,
        "user_id" text not null references "user"("id") on delete cascade,
        "project_slug" text not null,
        "site_url" text not null,
        "created_at" timestamp(3) not null default now()
      )`);
      await db.execute(sql`create index if not exists "user_project_user_id_idx" on "user_project" ("user_id")`);
      await db.execute(sql`create unique index if not exists "user_project_user_slug_uidx" on "user_project" ("user_id","project_slug")`);
    } else {
      const db = getSqliteDb();
      db.run(sql`create table if not exists "user_project" (
        "id" text primary key,
        "user_id" text not null references "user"("id") on delete cascade,
        "project_slug" text not null,
        "site_url" text not null,
        "created_at" integer not null default (cast(unixepoch('subsecond') * 1000 as integer))
      )`);
      db.run(sql`create index if not exists "user_project_user_id_idx" on "user_project" ("user_id")`);
      db.run(sql`create unique index if not exists "user_project_user_slug_uidx" on "user_project" ("user_id","project_slug")`);
    }
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

export async function canAccessProject(session: PanelSession, slug: string): Promise<boolean> {
  if (session.user.role === "admin" || session.user.projectSlug === slug) return true;
  await ensureProjectAccessSchema();
  const [row] = await getDb().select({ id: userProject.id }).from(userProject)
    .where(and(eq(userProject.userId, session.user.id), eq(userProject.projectSlug, slug))).limit(1);
  return Boolean(row);
}
