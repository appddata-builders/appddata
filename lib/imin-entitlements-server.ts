import { and, eq, gt, sql } from "drizzle-orm";

import { getAuthProvider, getDb, getPgDb, getSqliteDb } from "@/db";
import { iminEntitlement } from "@/db/schema";

let schemaPromise: Promise<void> | null = null;

/**
 * Compatibilidad de despliegue: crea la tabla nueva de forma idempotente, igual
 * que las demas entitlements, para no depender de una migracion previa.
 */
export function ensureIminEntitlementSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    if (getAuthProvider() === "pg") {
      const db = getPgDb();
      await db.execute(sql`
        create table if not exists "imin_entitlement" (
          "id" text primary key,
          "user_id" text not null references "user"("id") on delete cascade,
          "tier" text not null,
          "stripe_session_id" text not null,
          "expires_at" timestamp(3) not null,
          "created_at" timestamp(3) not null default now()
        )
      `);
      await db.execute(sql`create index if not exists "imin_entitlement_user_id_idx" on "imin_entitlement" ("user_id")`);
      await db.execute(sql`create unique index if not exists "imin_entitlement_stripe_session_uidx" on "imin_entitlement" ("stripe_session_id")`);
    } else {
      const db = getSqliteDb();
      db.run(sql`
        create table if not exists "imin_entitlement" (
          "id" text primary key,
          "user_id" text not null references "user"("id") on delete cascade,
          "tier" text not null,
          "stripe_session_id" text not null,
          "expires_at" integer not null,
          "created_at" integer not null default (cast(unixepoch('subsecond') * 1000 as integer))
        )
      `);
      db.run(sql`create index if not exists "imin_entitlement_user_id_idx" on "imin_entitlement" ("user_id")`);
      db.run(sql`create unique index if not exists "imin_entitlement_stripe_session_uidx" on "imin_entitlement" ("stripe_session_id")`);
    }
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

/** Vigencia (ms) del acceso IMIN activo de una cuenta; null si no tiene uno vigente. */
export async function iminAccessExpiry(userId: string): Promise<Date | null> {
  await ensureIminEntitlementSchema();
  const [row] = await getDb()
    .select({ expiresAt: iminEntitlement.expiresAt })
    .from(iminEntitlement)
    .where(and(eq(iminEntitlement.userId, userId), gt(iminEntitlement.expiresAt, new Date())))
    .orderBy(sql`${iminEntitlement.expiresAt} desc`)
    .limit(1);
  return row?.expiresAt ?? null;
}

/** true si la cuenta tiene un acceso IMIN vigente (aun no caducado). */
export async function hasActiveImin(userId: string): Promise<boolean> {
  return (await iminAccessExpiry(userId)) !== null;
}

/** La prueba sólo puede mostrarse y otorgarse una vez durante la vida de la cuenta. */
export async function hasUsedIminTrial(userId: string): Promise<boolean> {
  await ensureIminEntitlementSchema();
  const [row] = await getDb()
    .select({ id: iminEntitlement.id })
    .from(iminEntitlement)
    .where(and(eq(iminEntitlement.userId, userId), eq(iminEntitlement.tier, "trial")))
    .limit(1);
  return row != null;
}
