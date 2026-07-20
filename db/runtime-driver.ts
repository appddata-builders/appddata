/**
 * Decide que motor usar en tiempo de ejecucion.
 *
 * Regla practica: si hay DATABASE_URL apuntando a Postgres, se usa Postgres
 * (produccion); si no, se cae a SQLite local (desarrollo). `DB_DRIVER` permite
 * forzar cualquiera de los dos.
 */

export function getPgDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
}

export function shouldUseSqlite(): boolean {
  if (process.env.DB_DRIVER === "postgres") return false;
  if (process.env.DB_DRIVER === "sqlite") return true;
  const url = getPgDatabaseUrl() ?? "";
  return !(url.startsWith("postgres://") || url.startsWith("postgresql://"));
}

/**
 * Durante `next build` no siempre hay credenciales de Postgres disponibles.
 * En ese caso se usa SQLite para que el prerender no reviente.
 */
export function shouldUsePgBuildFallback(): boolean {
  if (shouldUseSqlite()) return false;
  if (getPgDatabaseUrl()) return false;
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function isPgRuntime(): boolean {
  if (shouldUseSqlite()) return false;
  if (shouldUsePgBuildFallback()) return false;
  return Boolean(getPgDatabaseUrl());
}
