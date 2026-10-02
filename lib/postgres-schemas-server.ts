/**
 * Peso en disco de cada esquema de PostgreSQL.
 *
 * El pod de la base es infraestructura COMPARTIDA: no se le puede cargar
 * completo a un solo dominio. Su costo se reparte segun lo que pesa el esquema
 * de cada quien, que es la unica medida objetiva de cuanto de esa base es suyo.
 *
 * Solo lectura sobre el catalogo: no acepta identificadores del cliente.
 */
import postgres from "postgres";

import { getPgDatabaseUrl } from "@/db/runtime-driver";

export type SchemaSize = { schema: string; bytes: number };

/** Esquemas del sistema: no pertenecen a ningun dominio. */
const SYSTEM_SCHEMAS = ["pg_catalog", "information_schema", "pg_toast"];

export async function getSchemaSizes(): Promise<SchemaSize[]> {
  const url = getPgDatabaseUrl();
  if (!url) throw new Error("No hay DATABASE_URL para medir los esquemas.");

  const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false });
  try {
    const rows = await sql<{ schema: string; bytes: string }[]>`
      select
        n.nspname as schema,
        coalesce(sum(pg_total_relation_size(c.oid)), 0)::bigint as bytes
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname <> all(${SYSTEM_SCHEMAS})
        and n.nspname not like 'pg\\_%'
      group by n.nspname
      order by bytes desc`;

    return rows.map((row) => ({ schema: row.schema, bytes: Number(row.bytes) || 0 }));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Empareja un slug de proyecto con su esquema. Postgres no admite guiones sin
 * comillas, asi que un slug `mi-sitio` suele vivir como esquema `mi_sitio`.
 */
export function schemaBytesForSlug(sizes: SchemaSize[], slug: string): number {
  const normalized = slug.toLowerCase().replace(/-/g, "_");
  const match = sizes.find((size) => size.schema.toLowerCase().replace(/-/g, "_") === normalized);
  return match?.bytes ?? 0;
}
