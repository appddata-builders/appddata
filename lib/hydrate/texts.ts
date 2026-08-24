import { connection } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { hydrate } from "@/db/schema";

import fallbackTexts from "./fallback.appddata.json";

/**
 * Textos del sitio appddata leidos de la tabla `hydrate`.
 *
 * La tabla es la misma que consumen los sitios hijos (refautomex, etc.): cada
 * fila es `project_slug` + `content_key` + `content_value`, y la clave lleva el
 * locale como primer segmento. appddata solo maneja espanol, asi que todas sus
 * claves empiezan con "es." y el resto del camino es el indice que separa cada
 * texto: "es.<seccion>.<campo>", p. ej. "es.about.operate.description".
 *
 * El mapa se deja plano a proposito (no se expande a un arbol como en
 * refautomex): con un solo locale la clave completa ya es el indice, y asi el
 * JSON de respaldo es exactamente lo que hay que sembrar en la base.
 *
 * Si la base no responde o no tiene filas para el proyecto, se usa
 * `fallback.appddata.json`. Ese archivo es la unica fuente de los textos en
 * duro: los componentes llaman `t("es.…")` sin valor por defecto en linea.
 */

export type SiteTexts = Record<string, string>;

const PROJECT_SLUG = process.env.APPDDATA_PROJECT_SLUG ?? "appddata";
const CACHE_TTL_MS = Number(process.env.HYDRATE_CACHE_TTL_MS ?? 10_000);

export const FALLBACK_TEXTS = fallbackTexts as SiteTexts;

let cache: SiteTexts | null = null;
let cachedAt = 0;

/**
 * Lee las filas del proyecto. Devuelve `null` cuando la base no esta
 * disponible, para distinguirlo de "la base respondio y no tiene filas".
 */
async function readHydrateRows(): Promise<SiteTexts | null> {
  try {
    const db = getDb();
    const rows = await db
      .select({ contentKey: hydrate.contentKey, contentValue: hydrate.contentValue })
      .from(hydrate)
      .where(eq(hydrate.projectSlug, PROJECT_SLUG));

    if (rows.length === 0) return null;

    const texts: SiteTexts = {};
    for (const row of rows) texts[row.contentKey] = row.contentValue;
    return texts;
  } catch (error) {
    console.info(
      "Textos de hidratacion no disponibles; se usara el JSON local:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Mapa completo de textos: respaldo primero, sobrescrito por lo que haya en la
 * base. Se mezcla en vez de reemplazar para que una clave nueva en el codigo
 * siga mostrando texto aunque todavia no este sembrada en `hydrate`.
 */
export async function getHydratedTexts(): Promise<SiteTexts> {
  // El driver de SQLite es sincrono y terminaria durante el prerender, dejando
  // los textos congelados al momento del build. Ver node_modules/next/dist/docs
  // -> 01-app/03-api-reference/04-functions/connection.md.
  await connection();

  const now = Date.now();
  if (cache && now - cachedAt < CACHE_TTL_MS) return cache;

  const rows = await readHydrateRows();
  const texts: SiteTexts = rows ? { ...FALLBACK_TEXTS, ...rows } : { ...FALLBACK_TEXTS };

  cache = texts;
  cachedAt = now;
  return texts;
}
