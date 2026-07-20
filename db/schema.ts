/**
 * Punto de entrada unico al schema: resuelve en runtime si las tablas que
 * exporta son las de Postgres o las de SQLite.
 *
 * Los consumidores importan siempre desde aqui (`import * as schema from "@/db/schema"`)
 * y no necesitan saber que motor hay debajo.
 */
import { isPgRuntime } from "./runtime-driver";
import * as schemaPg from "./schema.pg";
import * as schemaSqlite from "./schema.sqlite";

const runtimeSchema = isPgRuntime() ? schemaPg : schemaSqlite;

// El tipado se ancla al schema SQLite porque ambos exponen los mismos nombres
// de tabla y columna; el de Postgres se castea a esa forma.
type RuntimeSchema = typeof schemaSqlite;

function table<K extends keyof RuntimeSchema>(key: K): RuntimeSchema[K] {
  return runtimeSchema[key as keyof typeof runtimeSchema] as RuntimeSchema[K];
}

export const user = table("user");
export const session = table("session");
export const account = table("account");
export const verification = table("verification");
export const project = table("project");
export const projectText = table("projectText");
export const hydrate = table("hydrate");
export const userRelations = table("userRelations");
export const sessionRelations = table("sessionRelations");
export const accountRelations = table("accountRelations");
export const projectRelations = table("projectRelations");
export const projectTextRelations = table("projectTextRelations");
