import { sql } from "drizzle-orm";

import { getAuthProvider, getPgDb, getSqliteDb } from "@/db";

let schemaPromise: Promise<void> | null = null;

/**
 * Compatibilidad de despliegue: crea la tabla nueva de forma idempotente.
 * Evita que una versión recién desplegada rompa el panel antes de ejecutar
 * drizzle push en la base de datos de producción.
 */
export function ensureSiteEntitlementSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    if (getAuthProvider() === "pg") {
      const db = getPgDb();
      await db.execute(sql`
        create table if not exists "site_entitlement" (
          "id" text primary key,
          "user_id" text not null references "user"("id") on delete cascade,
          "plan" text not null,
          "stripe_session_id" text not null,
          "project_slug" text,
          "created_at" timestamp(3) not null default now(),
          "updated_at" timestamp(3) not null default now()
        )
      `);
    } else {
      const db = getSqliteDb();
      db.run(sql`
        create table if not exists "site_entitlement" (
          "id" text primary key,
          "user_id" text not null references "user"("id") on delete cascade,
          "plan" text not null,
          "stripe_session_id" text not null,
          "project_slug" text,
          "created_at" integer not null default (cast(unixepoch('subsecond') * 1000 as integer)),
          "updated_at" integer not null default (cast(unixepoch('subsecond') * 1000 as integer))
        )
      `);
      db.run(sql`create index if not exists "site_entitlement_user_id_idx" on "site_entitlement" ("user_id")`);
      db.run(sql`create unique index if not exists "site_entitlement_stripe_session_uidx" on "site_entitlement" ("stripe_session_id")`);
      return;
    }
    const db = getPgDb();
    await db.execute(sql`create index if not exists "site_entitlement_user_id_idx" on "site_entitlement" ("user_id")`);
    await db.execute(sql`create unique index if not exists "site_entitlement_stripe_session_uidx" on "site_entitlement" ("stripe_session_id")`);
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}
