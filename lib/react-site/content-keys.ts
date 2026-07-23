/**
 * Construye el mapa `contentKey -> valor` de todos los textos e imagenes de un
 * sitio, con las mismas claves (`<iid>:<campo>` y las claves de chrome) que usa
 * el armador y que emite el generador como `data-imin-key`.
 *
 * Se usa al crear el proyecto para sembrar `project_text` y `hydrate`, de modo
 * que IMIN pueda editar cada texto por clave y el sitio los hidrate en runtime.
 */

import {
  NAV_CONTENT_DEFAULTS,
  PAGES,
  WIDGET_DEFAULTS,
  type Doc,
  type PageId,
} from "@/app/components/build/build-model";
import type { Content } from "@/lib/react-site/content";

type SavedDocument = { doc?: Doc; content?: Content };

/** Devuelve `{ "<iid>:<campo>": valor, "chrome:...": valor }` para todo el sitio. */
export function buildContentSeed(raw: unknown): Record<string, string> {
  const saved = (raw && typeof raw === "object" ? raw : {}) as SavedDocument;
  const doc = saved.doc;
  const content = saved.content && typeof saved.content === "object" ? saved.content : {};
  const seed: Record<string, string> = {};
  if (!doc?.pages) return seed;

  // Textos e imagenes de cada widget colocado.
  for (const page of PAGES) {
    for (const instance of doc.pages[page.id as PageId] ?? []) {
      const defaults = WIDGET_DEFAULTS[instance.widgetId] ?? {};
      for (const field of Object.keys(defaults)) {
        const key = `${instance.iid}:${field}`;
        seed[key] = content[key] ?? defaults[field] ?? "";
      }
    }
  }

  // Chrome (navbar/footer): logo, marca, columnas, newsletter, mapa, redes.
  for (const key of Object.keys(NAV_CONTENT_DEFAULTS)) {
    seed[key] = content[key] ?? NAV_CONTENT_DEFAULTS[key] ?? "";
  }

  return seed;
}
