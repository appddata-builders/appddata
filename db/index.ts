import { createRequire } from "node:module";
import path from "node:path";

import { getPgDatabaseUrl, shouldUseSqlite, shouldUsePgBuildFallback } from "./runtime-driver";
import * as schemaPg from "./schema.pg";
import * as schemaSqlite from "./schema.sqlite";

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type SqliteDb = BetterSQLite3Database<typeof schemaSqlite>;
export type PgDb = PostgresJsDatabase<typeof schemaPg>;
export type AppDb = SqliteDb;

let cachedSqlite: SqliteDb | null = null;
let cachedPg: PgDb | null = null;
const nodeRequire = createRequire(import.meta.url);

export function getSqliteDb(): SqliteDb {
  if (cachedSqlite) return cachedSqlite;
  // Carga diferida: evita arrastrar el driver que no usa el despliegue actual.
  // createRequire mantiene esta carga compatible con el runtime ESM de Next.
  // no arrastrar better-sqlite3 (modulo nativo) en un despliegue con Postgres.
  const { drizzle } = nodeRequire("drizzle-orm/better-sqlite3");
  const Database = nodeRequire("better-sqlite3");
  const dbPath = process.env.LOCAL_DATABASE_PATH ?? path.join(process.cwd(), "local.db");
  const raw = new Database(dbPath);
  raw.pragma("foreign_keys = ON");
  cachedSqlite = drizzle(raw, { schema: schemaSqlite });
  return cachedSqlite!;
}

export function getPgDb(): PgDb {
  if (cachedPg) return cachedPg;
  const url = getPgDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL o DATABASE_URL_UNPOOLED es obligatorio para PostgreSQL");
  }
  // Mismo motivo que en getSqliteDb: carga diferida del driver.
  const { drizzle } = nodeRequire("drizzle-orm/postgres-js");
  const postgres = nodeRequire("postgres");
  const client = postgres(url, { max: 10 });
  cachedPg = drizzle(client, { schema: schemaPg });
  return cachedPg!;
}

export function getDb(): AppDb {
  if (shouldUseSqlite() || shouldUsePgBuildFallback()) return getSqliteDb();
  if (!getPgDatabaseUrl()) return getSqliteDb();
  return getPgDb() as unknown as AppDb;
}

export function getAuthSchema() {
  if (shouldUseSqlite() || shouldUsePgBuildFallback() || !getPgDatabaseUrl()) {
    return schemaSqlite;
  }
  return schemaPg;
}

export function getAuthProvider(): "sqlite" | "pg" {
  if (shouldUseSqlite() || shouldUsePgBuildFallback() || !getPgDatabaseUrl()) {
    return "sqlite";
  }
  return "pg";
}
