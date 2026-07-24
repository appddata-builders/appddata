/**
 * Explorador de solo-lectura para las bases del droplet (PostgreSQL).
 *
 * Solo lo consume el modulo interno "Databases", detras del gate `isRoot`. No
 * acepta SQL del cliente: los identificadores se validan con `IDENT` y se
 * interpolan como identificadores escapados; todo es SELECT / catalogo.
 */
import postgres from "postgres";

import { getPgDatabaseUrl } from "@/db/runtime-driver";

/** Identificadores permitidos (sin comillas, sin puntos, sin espacios). */
const IDENT = /^[A-Za-z0-9_]+$/;

function baseUrl(): string {
  const url = getPgDatabaseUrl();
  if (!url) throw new Error("No hay DATABASE_URL configurada para el explorador de bases.");
  return url;
}

/** Conexion efimera (max 1) a la base indicada, o a la del URL si no se da una. */
function connect(dbName?: string) {
  const url = new URL(baseUrl());
  if (dbName) {
    if (!IDENT.test(dbName)) throw new Error("Nombre de base invalido.");
    url.pathname = `/${dbName}`;
  }
  return postgres(url.toString(), { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false });
}

export async function listDatabases(): Promise<string[]> {
  const sql = connect();
  try {
    const rows = await sql<{ datname: string }[]>`
      select datname from pg_database
      where datistemplate = false and datallowconn = true
      order by datname`;
    return rows.map((row) => row.datname);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export type TableInfo = { schema: string; name: string; approxRows: number };

export async function listTables(dbName: string): Promise<TableInfo[]> {
  const sql = connect(dbName);
  try {
    const rows = await sql<{ schema: string; name: string; approxRows: number }[]>`
      select
        t.table_schema as schema,
        t.table_name as name,
        coalesce((
          select c.reltuples::bigint
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = t.table_schema and c.relname = t.table_name
        ), 0) as "approxRows"
      from information_schema.tables t
      where t.table_type = 'BASE TABLE'
        and t.table_schema not in ('pg_catalog', 'information_schema')
      order by t.table_schema, t.table_name`;
    return rows;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export type TablePage = { columns: string[]; rows: Record<string, unknown>[]; total: number };

export async function readRows(
  dbName: string,
  schema: string,
  table: string,
  limit: number,
  offset: number,
): Promise<TablePage> {
  if (!IDENT.test(schema) || !IDENT.test(table)) throw new Error("Identificador invalido.");
  const cappedLimit = Math.min(Math.max(Math.trunc(limit) || 50, 1), 200);
  const safeOffset = Math.max(Math.trunc(offset) || 0, 0);

  const sql = connect(dbName);
  try {
    // Whitelist: la tabla debe existir en el catalogo antes de leerla.
    const columns = await sql<{ column_name: string }[]>`
      select column_name from information_schema.columns
      where table_schema = ${schema} and table_name = ${table}
      order by ordinal_position`;
    if (columns.length === 0) throw new Error("La tabla no existe o no es accesible.");

    const [count] = await sql<{ total: number }[]>`
      select count(*)::int as total from ${sql(schema)}.${sql(table)}`;
    const rows = await sql`
      select * from ${sql(schema)}.${sql(table)}
      limit ${cappedLimit} offset ${safeOffset}`;

    return {
      columns: columns.map((column) => column.column_name),
      rows: rows as unknown as Record<string, unknown>[],
      total: count?.total ?? 0,
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
