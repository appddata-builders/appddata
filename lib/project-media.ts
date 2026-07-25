/**
 * Inventario de la multimedia de un proyecto y su nombre de archivo destino en S3.
 *
 * A partir del documento guardado del sitio (`{ plan, template, navMode, doc, content }`)
 * enumera TODA la multimedia referenciada (imagenes y videos, incluidos los defaults
 * de stock) y le asigna un nombre predecible:
 *
 *   {area}-{slug}-{widget|seccion}-{index}.{ext}
 *   ej: navbar-drdr-branding-1.jpg   home-drdr-video-de-fondo-1.mp4
 *
 * Las imagenes siempre salen como `.jpg` (se convierten luego); los videos conservan
 * su extension. Los links de YouTube se ignoran (no son archivos).
 */

import {
  DEFAULT_LOGO,
  NAV_CONTENT,
  PAGES,
  WIDGET_DEFAULTS,
  type Doc,
  type PageId,
  type WidgetId,
} from "@/app/components/build/build-model";

export type MediaItem = {
  /** Clave de contenido que apunta a este medio (para reescribirla a la URL de S3). */
  key: string;
  area: string;
  widget: string;
  index: number;
  /** Valor original: data URL o URL http(s)/ruta. */
  source: string;
  filename: string;
  kind: "image" | "video";
};

type SiteDocument = {
  doc?: Doc;
  content?: Record<string, string>;
};

/** Campos que contienen multimedia, por widget. */
const MEDIA_FIELDS: Partial<Record<WidgetId, string[]>> = {
  "image-text": ["image"],
  carousel: ["image1", "image2", "image3"],
  gallery: ["g1", "g2", "g3", "g4", "g5", "g6"],
  "bg-image": ["image"],
  "bg-video": ["video"],
  blog: ["p1img", "p2img", "p3img"],
};

/** Slug legible (kebab, en espanol) del widget para el nombre de archivo. */
const WIDGET_SLUG: Partial<Record<WidgetId, string>> = {
  "image-text": "imagen-texto",
  carousel: "carrusel",
  gallery: "galeria",
  "bg-image": "imagen-de-fondo",
  "bg-video": "video-de-fondo",
  blog: "blog",
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

function isYouTube(value: string): boolean {
  return /youtube\.com|youtu\.be/i.test(value);
}

/** Detecta el tipo de medio y la extension del video; null si no es multimedia/es YouTube. */
function detectMedia(value: string): { kind: "image" | "video"; videoExt: string } | null {
  const v = value.trim();
  if (!v || isYouTube(v)) return null;
  if (/^data:image\//i.test(v)) return { kind: "image", videoExt: "" };
  const dataVideo = /^data:video\/([a-z0-9.+-]+)/i.exec(v);
  if (dataVideo) return { kind: "video", videoExt: normalizeVideoExt(dataVideo[1]) };
  if (IMAGE_EXT.test(v)) return { kind: "image", videoExt: "" };
  const vid = VIDEO_EXT.exec(v);
  if (vid) return { kind: "video", videoExt: vid[1].toLowerCase() };
  return null;
}

function normalizeVideoExt(raw: string): string {
  const ext = raw.toLowerCase().replace("quicktime", "mov").replace("x-m4v", "m4v");
  return /^(mp4|webm|mov|m4v)$/.test(ext) ? ext : "mp4";
}

/** Recolecta la multimedia del documento con su nombre destino, de forma determinista. */
export function collectProjectMedia(slug: string, document: unknown): MediaItem[] {
  const site = (document && typeof document === "object" ? document : {}) as SiteDocument;
  const content = site.content && typeof site.content === "object" ? site.content : {};
  const doc = site.doc;
  const items: MediaItem[] = [];
  const counters = new Map<string, number>();

  const add = (key: string, area: string, widget: string, source: string) => {
    const media = detectMedia(source);
    if (!media) return;
    const bucketKey = `${area}:${widget}`;
    const index = (counters.get(bucketKey) ?? 0) + 1;
    counters.set(bucketKey, index);
    const ext = media.kind === "image" ? "jpg" : media.videoExt || "mp4";
    items.push({
      key,
      area,
      widget,
      index,
      source: source.trim(),
      filename: `${area}-${slug}-${widget}-${index}.${ext}`,
      kind: media.kind,
    });
  };

  // 1) Logo del navbar (branding), si es una imagen (usa el valor o el default).
  const logo = content[NAV_CONTENT.logo] ?? DEFAULT_LOGO;
  add(NAV_CONTENT.logo, "navbar", "branding", logo);

  // 2) Multimedia de cada widget, por pagina y en orden.
  if (doc?.pages) {
    for (const page of PAGES) {
      const instances = doc.pages[page.id as PageId] ?? [];
      for (const instance of instances) {
        const fields = MEDIA_FIELDS[instance.widgetId];
        if (!fields) continue;
        const widgetSlug = WIDGET_SLUG[instance.widgetId] ?? instance.widgetId;
        for (const field of fields) {
          const key = `${instance.iid}:${field}`;
          const value = content[key] ?? WIDGET_DEFAULTS[instance.widgetId]?.[field] ?? "";
          add(key, page.id, widgetSlug, value);
        }
      }
    }
  }

  return items;
}
