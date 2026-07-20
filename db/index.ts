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

export function getSqliteDb(): SqliteDb {
  if (cachedSqlite) return cachedSqlite;
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const Database = require("better-sqlite3");
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
  const { drizzle } = require("drizzle-orm/postgres-js");
  const postgres = require("postgres");
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
