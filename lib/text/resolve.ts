/**
 * Resolucion de claves compartida por el `t` de servidor y el de cliente.
 *
 * appddata solo maneja espanol, asi que la clave completa ("es.navbar.home") ya
 * es el indice del texto. Se acepta tambien la forma corta ("navbar.home") para
 * no obligar a repetir el prefijo cuando una lista arma sus claves.
 */

export const DEFAULT_LOCALE = "es";

const LOCALE_PREFIX = `${DEFAULT_LOCALE}.`;

/** Normaliza a la forma con locale: "navbar.home" -> "es.navbar.home". */
export function normalizeKey(key: string): string {
  return key.startsWith(LOCALE_PREFIX) ? key : `${LOCALE_PREFIX}${key}`;
}

/** Sustituye los `{{marcadores}}` de un texto con los valores dados. */
export function interpolate(value: string, vars?: Record<string, string | number>): string {
  if (!vars) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const replacement = vars[name];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Arma un `t` sobre un mapa plano de textos.
 *
 * Cuando la clave no existe devuelve la clave misma: no hay valores por
 * defecto en linea, todos los textos viven en `lib/hydrate/fallback.appddata.json`,
 * asi que una clave cruda en pantalla senala que falta agregarla ahi.
 */
export function makeTranslate(texts: Record<string, string>): Translate {
  return (key, vars) => {
    const value = texts[normalizeKey(key)];
    if (typeof value !== "string") return key;
    return interpolate(value, vars);
  };
}
