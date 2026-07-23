/**
 * Resolucion de contenido y estilos para el generador de sitios React.
 *
 * Portado de `lib/generated-site.ts`, pero adaptado a React: los estilos se
 * devuelven como objetos `CSSProperties` (para `style={...}`) en vez de strings
 * de CSS, y el texto no se escapa (React lo hace al renderizar).
 */

import type { CSSProperties } from "react";

import { BUILD_PLANS, WIDGET_DEFAULTS, type BuildPlanId, type WidgetId } from "@/app/components/build/build-model";

export type Content = Record<string, string>;

const gradientDirection: Record<string, string> = {
  right: "to right",
  br: "135deg",
  bottom: "to bottom",
  bl: "225deg",
  left: "to left",
  tl: "315deg",
  top: "to top",
  tr: "45deg",
};

type StyleValue = { fill: string; color: string; color2: string; direction: string };
const DEFAULT_STYLE: StyleValue = { fill: "solid", color: "", color2: "", direction: "right" };

function parseStyle(raw: string | undefined): StyleValue {
  try {
    return raw ? { ...DEFAULT_STYLE, ...(JSON.parse(raw) as Partial<StyleValue>) } : DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
}

/** Solo deja pasar URLs de esquema seguro; si no, cae al fallback. */
export function safeUrl(value: string, fallback = "#"): string {
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value.trim()) ? value.trim() : fallback;
}

/** URLs de imagen: http(s), rutas absolutas o data URIs de imagen. */
export function safeImageUrl(value: string, fallback = ""): string {
  const v = value.trim();
  return /^(https?:\/\/|\/)/i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v) ? v : fallback;
}

/** Limpia un SVG pegado por el usuario (quita scripts, handlers y javascript:). */
export function sanitizeSvg(value: string): string {
  if (!value.trim().startsWith("<svg")) return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

const FALLBACK_ICONS: Record<string, string> = {
  sparkles: "✦",
  layers: "▱",
  wrench: "⚙",
  calendar: "▣",
  check: "✓",
  star: "★",
  quote: "❝",
  mail: "✉",
  pin: "⌖",
  play: "▶",
  image: "▧",
};

const DEFAULT_REACT_ICONS: Record<string, string> = {
  sparkles: "lu:LuSparkles",
  layers: "lu:LuLayers",
  wrench: "lu:LuWrench",
  calendar: "lu:LuCalendar",
  check: "lu:LuCheck",
  star: "lu:LuStar",
  quote: "lu:LuQuote",
  mail: "lu:LuMail",
  pin: "lu:LuMapPin",
  play: "lu:LuPlay",
  image: "lu:LuImage",
};

/** Referencia estable a un componente de react-icons (libreria:nombre). */
export type IconSpec = { glyph: string; icon?: string };

export function resolveIcon(value: string, fallback = "✦"): IconSpec {
  if (/^[a-z0-9]+:[A-Z][A-Za-z0-9]*$/.test(value)) return { glyph: fallback, icon: value };
  return {
    glyph: FALLBACK_ICONS[value] ?? fallback,
    icon: DEFAULT_REACT_ICONS[value],
  };
}

export const SOCIAL_GLYPHS: Record<string, string> = {
  instagram: "◎",
  facebook: "f",
  youtube: "▶",
  linkedin: "in",
};

/** Fabrica un lector de campos de una instancia: default del widget + override. */
export function fieldReader(iid: string, widget: WidgetId, content: Content) {
  return (field: string): string => content[`${iid}:${field}`] ?? WIDGET_DEFAULTS[widget]?.[field] ?? "";
}

/** Estilo de fondo de una seccion, como objeto de estilo React. */
export function backgroundStyle(raw: string | undefined, fallback: string): CSSProperties {
  if (raw?.startsWith("#")) return { backgroundColor: raw };
  const style = parseStyle(raw);
  const first = style.color || fallback;
  if (style.fill === "gradient") {
    return {
      backgroundColor: first,
      backgroundImage: `linear-gradient(${gradientDirection[style.direction] ?? "to right"},${first},${style.color2 || first})`,
    };
  }
  return { backgroundColor: first, backgroundImage: "none" };
}

/** Estilo de un boton (solido / gradiente / opaco), como objeto de estilo React. */
export function buttonStyle(
  raw: string | undefined,
  plan: BuildPlanId,
  radius: number,
  whiteDefault = false,
): CSSProperties {
  const accent = BUILD_PLANS[plan];
  const style = parseStyle(raw);
  const first = style.color || (whiteDefault ? "#ffffff" : accent.accent);
  const foreground = whiteDefault && !style.color ? accent.accentText : "#ffffff";
  const borderRadius = radius / 2;
  if (style.fill === "gradient") {
    return {
      borderRadius,
      backgroundImage: `linear-gradient(${gradientDirection[style.direction] ?? "to right"},${first},${style.color2 || first})`,
      color: foreground,
    };
  }
  if (style.fill === "soft") {
    return { borderRadius, background: `${first}22`, color: first, border: `1px solid ${first}55` };
  }
  return { borderRadius, background: first, color: foreground };
}

/** Estilo de texto (color plano o titulo con gradiente), como objeto de estilo React. */
export function textStyle(raw: string | undefined, tag: string): CSSProperties {
  const style = parseStyle(raw);
  if (!style.color) return {};
  if (/^h[1-3]$/.test(tag) && style.fill === "gradient") {
    return {
      backgroundImage: `linear-gradient(${gradientDirection[style.direction] ?? "to right"},${style.color},${style.color2 || style.color})`,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
    };
  }
  return { color: style.color };
}
