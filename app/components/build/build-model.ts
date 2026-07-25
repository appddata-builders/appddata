import {
  LuBadgePercent,
  LuCalendarClock,
  LuCircleHelp,
  LuGalleryHorizontalEnd,
  LuImage,
  LuImages,
  LuLayoutList,
  LuLayers,
  LuMailOpen,
  LuMegaphone,
  LuNewspaper,
  LuQuote,
  LuSparkles,
  LuSquareStack,
  LuStar,
  LuType,
  LuVideo,
  LuWrench,
} from "react-icons/lu";
import type { ComponentType } from "react";

import { BRAND_PLANE_URL, publicAssetUrl } from "@/lib/public-assets";
import { getSitePackage } from "@/lib/site-packages";

export type BuildPlanId = "beginner" | "super" | "premium";
export const PLAN_ORDER: BuildPlanId[] = ["beginner", "super", "premium"];
export const MAX_WIDGETS_PER_PAGE = 4;
export const MAX_WIDGETS_CONTACT = 1;

export type PlanMeta = {
  id: BuildPlanId;
  name: string;
  price: string;
  description: string;
  imin: boolean;
  iminLabel: string;
  soporte: string;
  extras: string[];
  accent: string;
  accentSoft: string;
  accentText: string;
};

function planFrom(
  id: BuildPlanId,
  imin: boolean,
  iminLabel: string,
  soporte: string,
  colors: { accent: string; accentSoft: string; accentText: string },
): PlanMeta {
  const pkg = getSitePackage(id);
  return {
    id,
    name: pkg?.name ?? id,
    price: pkg?.price ?? "",
    description: pkg?.description ?? "",
    imin,
    iminLabel,
    soporte,
    extras: [...(pkg?.extras ?? [])],
    ...colors,
  };
}

export const BUILD_PLANS: Record<BuildPlanId, PlanMeta> = {
  beginner: planFrom("beginner", false, "Sin IMIN", "Soporte por correo", {
    accent: "#4f9b7a",
    accentSoft: "#e8f4ee",
    accentText: "#2f6b51",
  }),
  super: planFrom("super", false, "Sin IMIN", "Soporte prioritario", {
    accent: "#d97706",
    accentSoft: "#fdf1e0",
    accentText: "#a85c05",
  }),
  premium: planFrom("premium", true, "3 meses de IMIN", "3 consultas personalizadas", {
    accent: "#0C6CC6",
    accentSoft: "#e7f2fd",
    accentText: "#0a5aa6",
  }),
};

/* ------------------------------- Paginas ------------------------------- */

export type PageId = "home" | "about" | "productos" | "contact";

export const PAGES: { id: PageId; label: string; anchor: string }[] = [
  { id: "home", label: "Home", anchor: "inicio" },
  { id: "about", label: "About", anchor: "nosotros" },
  { id: "productos", label: "Productos", anchor: "productos" },
  { id: "contact", label: "Contact", anchor: "contacto" },
];

export type NavMode = "single" | "multi";

/* -------------------------- Widgets del body --------------------------- */
export type WidgetId =
  | "hero"
  | "features"
  | "image-text"
  | "text-block"
  | "product-tiers"
  | "services"
  | "stats"
  | "cta-banner"
  | "carousel"
  | "gallery"
  | "bg-image"
  | "bg-video"
  | "blog"
  | "promos"
  | "testimonials"
  | "faq"
  | "contact";

export type WidgetDef = {
  id: WidgetId;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export const WIDGETS: WidgetDef[] = [
  { id: "hero", name: "Encabezado / Hero", description: "Titulo grande con subtitulo y boton.", icon: LuType },
  { id: "features", name: "Beneficios", description: "Tres puntos con icono y texto.", icon: LuLayers },
  { id: "image-text", name: "Imagen + texto", description: "Imagen a un lado y contenido al otro.", icon: LuSquareStack },
  { id: "text-block", name: "Bloque de texto", description: "Titulo y parrafo editable.", icon: LuLayoutList },
  { id: "product-tiers", name: "Tiers de productos", description: "Tres tarjetas de planes o productos.", icon: LuLayers },
  { id: "services", name: "Servicios", description: "Tarjetas para tus servicios especializados.", icon: LuWrench },
  { id: "stats", name: "Metricas", description: "Cifras clave de tu negocio.", icon: LuStar },
  { id: "cta-banner", name: "Franja CTA", description: "Llamado a la accion a todo lo ancho.", icon: LuMegaphone },
  { id: "carousel", name: "Carrusel", description: "Slider de imagenes con navegacion.", icon: LuGalleryHorizontalEnd },
  { id: "gallery", name: "Galeria", description: "Cuadricula de imagenes.", icon: LuImages },
  { id: "bg-image", name: "Fondo con imagen", description: "Seccion con imagen de fondo.", icon: LuImage },
  { id: "bg-video", name: "Fondo con video", description: "Seccion inmersiva con video.", icon: LuVideo },
  { id: "blog", name: "Blog", description: "Tarjetas de entradas o noticias.", icon: LuNewspaper },
  { id: "promos", name: "Promotions", description: "Ofertas con descuento destacado.", icon: LuBadgePercent },
  { id: "testimonials", name: "Testimony", description: "Citas de clientes satisfechos.", icon: LuQuote },
  { id: "faq", name: "FAQs", description: "Lista de preguntas y respuestas.", icon: LuCircleHelp },
  { id: "contact", name: "Contact", description: "Datos de contacto y formulario.", icon: LuMailOpen },
];

export const WIDGETS_BY_ID: Record<WidgetId, WidgetDef> = WIDGETS.reduce(
  (acc, widget) => {
    acc[widget.id] = widget;
    return acc;
  },
  {} as Record<WidgetId, WidgetDef>,
);

/** Contenidos exclusivos de la página Contact; no aparecen en el body general. */
export const CONTACT_WIDGET_IDS: WidgetId[] = ["contact", "faq", "blog", "testimonials", "promos"];

/** Widgets ofrecidos en la paleta segun la pagina activa. */
export function widgetsForPage(page: PageId): WidgetDef[] {
  if (page === "contact") return CONTACT_WIDGET_IDS.map((id) => WIDGETS_BY_ID[id]);
  return WIDGETS.filter((widget) => !CONTACT_WIDGET_IDS.includes(widget.id));
}

/** Maximo de widgets de una pagina (Contact solo permite 1). */
export function maxWidgetsFor(page: PageId): number {
  return page === "contact" ? MAX_WIDGETS_CONTACT : MAX_WIDGETS_PER_PAGE;
}

/** Etiqueta visible de una pagina; Contact adopta el nombre de su widget. */
export function pageLabel(doc: Doc, page: PageId): string {
  if (page !== "contact") return PAGES.find((item) => item.id === page)?.label ?? page;

  const selectedWidget = doc.pages.contact[0];
  return selectedWidget ? WIDGETS_BY_ID[selectedWidget.widgetId].name : "Contact";
}

/* -------------------- Variantes de navbar y footer --------------------- */

export type NavbarVariant = "standard" | "cta" | "centered" | "minimal";

export const NAVBAR_VARIANTS: { id: NavbarVariant; name: string; hint: string }[] = [
  { id: "standard", name: "Clasico", hint: "Logo izquierda, enlaces derecha." },
  { id: "cta", name: "Con login", hint: "Logo, enlaces y acceso para iniciar sesion." },
  { id: "centered", name: "Centrado", hint: "Logo arriba, enlaces centrados." },
  { id: "minimal", name: "Minimal", hint: "Solo logo y menu." },
];

export type FooterVariant = "simple" | "social" | "columns" | "newsletter" | "map";

export const FOOTER_VARIANTS: { id: FooterVariant; name: string; hint: string }[] = [
  { id: "simple", name: "Simple", hint: "Marca, redes y aviso." },
  { id: "social", name: "Redes", hint: "Redes centradas y aviso." },
  { id: "columns", name: "Columnas", hint: "Enlaces en columnas y redes." },
  { id: "newsletter", name: "Newsletter", hint: "Columnas, suscripcion y redes." },
  { id: "map", name: "Mapa", hint: "Google Maps + columnas y redes." },
];

/* --------------------------- Estado del lienzo -------------------------- */

/**
 * Instancia colocada. El iid es unico, asi que un mismo widget puede repetirse
 * en la misma pagina (p. ej. varios "Imagen + texto").
 */
export type Instance = { iid: string; widgetId: WidgetId };

export type Doc = {
  navbarVariant: NavbarVariant;
  footerVariant: FooterVariant;
  /** Overrides de tipografia (familia Google) para todo el sitio; si faltan se usa el default del template. */
  titleFont?: string;
  bodyFont?: string;
  pages: Record<PageId, Instance[]>;
};

let iidCounter = 0;

/** Genera un id de instancia unico para un widget recien agregado. */
export function newIid(widgetId: WidgetId): string {
  iidCounter += 1;
  return `${widgetId}-${Date.now().toString(36)}${iidCounter}`;
}

export function emptyDoc(): Doc {
  return {
    navbarVariant: "standard",
    footerVariant: "simple",
    pages: { home: [], about: [], productos: [], contact: [] },
  };
}

/** Documento inicial: las paginas por defecto que llevan todos los paquetes. */
export function defaultDoc(): Doc {
  // Ids deterministicos para el arranque (evita mismatch de hidratacion).
  const inst = (page: PageId, widgetId: WidgetId, n: number): Instance => ({
    iid: `${widgetId}-def-${page}-${n}`,
    widgetId,
  });
  return {
    navbarVariant: "standard",
    footerVariant: "columns",
    pages: {
      home: [inst("home", "hero", 1), inst("home", "features", 2), inst("home", "bg-image", 3)],
      about: [inst("about", "image-text", 1), inst("about", "text-block", 2)],
      productos: [inst("productos", "product-tiers", 1), inst("productos", "services", 2)],
      contact: [inst("contact", "contact", 1)],
    },
  };
}

export function countInstances(doc: Doc): number {
  return PAGES.reduce((total, page) => total + doc.pages[page.id].length, 0);
}

/* ------------------------------ Plantillas ----------------------------- */

export type TemplateId =
  | "aurora"
  | "editorial"
  | "studio"
  | "neon"
  | "sunset"
  | "mono"
  | "grises"
  | "botanic";

export type TemplateTokens = {
  id: TemplateId;
  name: string;
  description: string;
  /** Es la plantilla principal recomendada. */
  primary?: boolean;
  radius: number;
  heroAlign: "center" | "left";
  navUppercase: boolean;
  navLetter: string;
  titleFamily: string;
  titleWeight: number;
  bodyFamily: string;
  /** Nombre plano de la familia Google Fonts por default (titulos / cuerpo). */
  titleFont: string;
  bodyFont: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  muted: string;
  navBg: string;
  navInk: string;
  footerBg: string;
  footerInk: string;
  dark: boolean;
  /** Aplica filtro de escala de grises a toda la vista previa. */
  grayscale?: boolean;
};

const SANS_FALLBACK = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const SERIF_FALLBACK = "'Iowan Old Style', Georgia, 'Times New Roman', serif";

/** Construye un stack CSS a partir de una familia Google + fallback del sistema. */
export function fontStackOf(name: string, kind: "sans" | "serif"): string {
  return `"${name}", ${kind === "serif" ? SERIF_FALLBACK : SANS_FALLBACK}`;
}

/**
 * Fuentes efectivas de un documento: usa el override del usuario (doc) si existe,
 * si no el default del template. Compartido por el preview y el generador.
 */
export function effectiveFonts(
  tokens: TemplateTokens,
  doc?: { titleFont?: string; bodyFont?: string },
): { title: string; body: string; titleStack: string; bodyStack: string } {
  const title = doc?.titleFont?.trim() || tokens.titleFont;
  const body = doc?.bodyFont?.trim() || tokens.bodyFont;
  const titleIsSerif = title === tokens.titleFont ? tokens.titleFamily.includes("serif") : false;
  const bodyIsSerif = body === tokens.bodyFont ? tokens.bodyFamily.includes("serif") : false;
  return {
    title,
    body,
    titleStack: fontStackOf(title, titleIsSerif ? "serif" : "sans"),
    bodyStack: fontStackOf(body, bodyIsSerif ? "serif" : "sans"),
  };
}

/** Devuelve una copia de los tokens con las fuentes efectivas aplicadas. */
export function tokensWithFonts(
  tokens: TemplateTokens,
  doc?: { titleFont?: string; bodyFont?: string },
): TemplateTokens {
  const fonts = effectiveFonts(tokens, doc);
  return {
    ...tokens,
    titleFont: fonts.title,
    bodyFont: fonts.body,
    titleFamily: fonts.titleStack,
    bodyFamily: fonts.bodyStack,
  };
}

export const TEMPLATES: Record<TemplateId, TemplateTokens> = {
  aurora: {
    id: "aurora",
    name: "Aurora",
    description: "Clara y redondeada, paleta Nord. La principal.",
    primary: true,
    radius: 16,
    heroAlign: "center",
    navUppercase: false,
    navLetter: "0.01em",
    titleFamily: fontStackOf("Inter", "sans"),
    titleWeight: 600,
    bodyFamily: fontStackOf("Inter", "sans"),
    titleFont: "Inter",
    bodyFont: "Inter",
    surface: "#ffffff",
    surfaceAlt: "#eceff4",
    ink: "#2e3440",
    muted: "#4c566a",
    navBg: "#ffffff",
    navInk: "#2e3440",
    footerBg: "#2e3440",
    footerInk: "#d8dee9",
    dark: false,
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Serif a la izquierda, paleta Solarized Light.",
    radius: 4,
    heroAlign: "left",
    navUppercase: false,
    navLetter: "0.02em",
    titleFamily: fontStackOf("Playfair Display", "serif"),
    titleWeight: 600,
    bodyFamily: fontStackOf("Lora", "serif"),
    titleFont: "Playfair Display",
    bodyFont: "Lora",
    surface: "#fdf6e3",
    surfaceAlt: "#eee8d5",
    ink: "#073642",
    muted: "#657b83",
    navBg: "#fdf6e3",
    navInk: "#073642",
    footerBg: "#073642",
    footerInk: "#eee8d5",
    dark: false,
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "Oscuro en mayusculas, paleta Nord Polar Night.",
    radius: 12,
    heroAlign: "left",
    navUppercase: true,
    navLetter: "0.16em",
    titleFamily: fontStackOf("Space Grotesk", "sans"),
    titleWeight: 700,
    bodyFamily: fontStackOf("Inter", "sans"),
    titleFont: "Space Grotesk",
    bodyFont: "Inter",
    surface: "#2e3440",
    surfaceAlt: "#3b4252",
    ink: "#eceff4",
    muted: "#81899b",
    navBg: "#272b35",
    navInk: "#eceff4",
    footerBg: "#242933",
    footerInk: "#d8dee9",
    dark: true,
  },
  neon: {
    id: "neon",
    name: "Neon",
    description: "Oscuro y vibrante con esquinas muy redondeadas, paleta Dracula.",
    radius: 22,
    heroAlign: "center",
    navUppercase: true,
    navLetter: "0.14em",
    titleFamily: fontStackOf("Sora", "sans"),
    titleWeight: 800,
    bodyFamily: fontStackOf("Inter", "sans"),
    titleFont: "Sora",
    bodyFont: "Inter",
    surface: "#282a36",
    surfaceAlt: "#343746",
    ink: "#f8f8f2",
    muted: "#8b93c4",
    navBg: "#21222c",
    navInk: "#f8f8f2",
    footerBg: "#191a21",
    footerInk: "#f8f8f2",
    dark: true,
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    description: "Calida y luminosa, paleta Gruvbox Light.",
    radius: 18,
    heroAlign: "center",
    navUppercase: false,
    navLetter: "0.02em",
    titleFamily: fontStackOf("Poppins", "sans"),
    titleWeight: 700,
    bodyFamily: fontStackOf("Nunito Sans", "sans"),
    titleFont: "Poppins",
    bodyFont: "Nunito Sans",
    surface: "#fbf1c7",
    surfaceAlt: "#f2e5bc",
    ink: "#3c3836",
    muted: "#7c6f64",
    navBg: "#fbf1c7",
    navInk: "#3c3836",
    footerBg: "#3c3836",
    footerInk: "#ebdbb2",
    dark: false,
  },
  mono: {
    id: "mono",
    name: "Mono",
    description: "Blanco y negro minimal, escala Neutral.",
    radius: 2,
    heroAlign: "left",
    navUppercase: true,
    navLetter: "0.2em",
    titleFamily: fontStackOf("Archivo", "sans"),
    titleWeight: 700,
    bodyFamily: fontStackOf("Inter", "sans"),
    titleFont: "Archivo",
    bodyFont: "Inter",
    surface: "#ffffff",
    surfaceAlt: "#f5f5f5",
    ink: "#0a0a0a",
    muted: "#737373",
    navBg: "#ffffff",
    navInk: "#0a0a0a",
    footerBg: "#0a0a0a",
    footerInk: "#f5f5f5",
    dark: false,
  },
  grises: {
    id: "grises",
    name: "Grises",
    description: "Todo el sitio en escala de grises, paleta Zinc.",
    radius: 10,
    heroAlign: "center",
    navUppercase: false,
    navLetter: "0.04em",
    titleFamily: fontStackOf("Inter", "sans"),
    titleWeight: 700,
    bodyFamily: fontStackOf("Inter", "sans"),
    titleFont: "Inter",
    bodyFont: "Inter",
    surface: "#f4f4f5",
    surfaceAlt: "#e4e4e7",
    ink: "#27272a",
    muted: "#71717a",
    navBg: "#ededef",
    navInk: "#27272a",
    footerBg: "#27272a",
    footerInk: "#e4e4e7",
    dark: false,
    grayscale: true,
  },
  botanic: {
    id: "botanic",
    name: "Botanic",
    description: "Verdes naturales con titulos serif, paleta Everforest.",
    radius: 14,
    heroAlign: "left",
    navUppercase: false,
    navLetter: "0.02em",
    titleFamily: fontStackOf("Fraunces", "serif"),
    titleWeight: 600,
    bodyFamily: fontStackOf("Nunito Sans", "sans"),
    titleFont: "Fraunces",
    bodyFont: "Nunito Sans",
    surface: "#f4f6ec",
    surfaceAlt: "#e7eed7",
    ink: "#2e3d29",
    muted: "#5f6f56",
    navBg: "#f4f6ec",
    navInk: "#2e3d29",
    footerBg: "#2e3d29",
    footerInk: "#e7eed7",
    dark: false,
  },
};

export const TEMPLATE_ORDER: TemplateId[] = [
  "aurora",
  "editorial",
  "studio",
  "neon",
  "sunset",
  "mono",
  "grises",
  "botanic",
];

/* --------------------------- Contenido editable ------------------------ */

/** Logo por defecto de Appddata (editable en el navbar). */
export const DEFAULT_LOGO = BRAND_PLANE_URL;

/**
 * Imágenes base de los templates (alojadas en S3, bucket `appddata`).
 * Son las únicas fotos que se ofrecen al llenar imágenes desde el pop-up de Build,
 * junto con la opción de subir una desde el equipo. Ver `public_s3/appddata_build/`.
 */
export const STOCK_IMAGES = [
  publicAssetUrl("appddata_build/background-1.jpg"),
  publicAssetUrl("appddata_build/background-2.jpg"),
  publicAssetUrl("appddata_build/background-3.jpg"),
  publicAssetUrl("appddata_build/background-4.jpg"),
  publicAssetUrl("appddata_build/background-5.jpg"),
  publicAssetUrl("appddata_build/background-6.jpg"),
];

export const heroImage = STOCK_IMAGES[0];

/** Claves fijas de contenido para navbar y footer (independientes de la variante). */
export const NAV_CONTENT = {
  logo: "chrome:navbar:logo",
  logoMode: "chrome:navbar:logoMode",
  cta: "chrome:navbar:cta",
  brand: "chrome:footer:brand",
  c1: "chrome:footer:c1",
  c2: "chrome:footer:c2",
  c3: "chrome:footer:c3",
  newsletter: "chrome:footer:newsletter",
  mapQuery: "chrome:footer:mapQuery",
  footerBg: "chrome:footer:bg",
} as const;

export const NAV_CONTENT_DEFAULTS: Record<string, string> = {
  [NAV_CONTENT.logo]: DEFAULT_LOGO,
  // Logo por defecto en texto (la marca): coincide con lo que genera el sitio y
  // evita depender de una imagen. El usuario puede cambiar a imagen con el switch.
  [NAV_CONTENT.logoMode]: "text",
  [NAV_CONTENT.cta]: "Iniciar Sesión",
  [NAV_CONTENT.brand]: "Appddata",
  [NAV_CONTENT.c1]: "Producto",
  [NAV_CONTENT.c2]: "Empresa",
  [NAV_CONTENT.c3]: "Soporte",
  [NAV_CONTENT.newsletter]: "Suscribete",
  [NAV_CONTENT.mapQuery]: "Ciudad de Mexico",
  "chrome:footer:social:0:icon": "instagram",
  "chrome:footer:social:0:url": "https://instagram.com/",
  "chrome:footer:social:1:icon": "facebook",
  "chrome:footer:social:1:url": "https://facebook.com/",
  "chrome:footer:social:2:icon": "youtube",
  "chrome:footer:social:2:url": "https://youtube.com/",
  "chrome:footer:social:3:icon": "linkedin",
  "chrome:footer:social:3:url": "https://linkedin.com/",
};

/** Iconos disponibles para el widget de beneficios (marcadores visuales). */
export const FEATURE_ICONS = [LuSparkles, LuLayers, LuWrench, LuCalendarClock] as const;

/** Valores por defecto de los campos editables, por widget. */
export const WIDGET_DEFAULTS: Record<WidgetId, Record<string, string>> = {
  hero: {
    eyebrow: "Bienvenido",
    title: "Tu marca, en linea",
    subtitle: "Una frase breve que describe tu propuesta de valor y engancha al visitante.",
    cta: "Conocer mas",
  },
  features: {
    f1t: "Rapido",
    f1d: "Publicamos tu sitio en dias, no meses.",
    f2t: "A tu medida",
    f2d: "Cada seccion se adapta a tu marca.",
    f3t: "Con soporte",
    f3d: "Te acompanamos despues del lanzamiento.",
  },
  "image-text": {
    title: "Quienes somos",
    body: "Combina una imagen con un mensaje claro. Ideal para la seccion About.",
    image: STOCK_IMAGES[1],
    layout: "image-left",
  },
  "text-block": {
    title: "Sobre nosotros",
    body: "Cuenta la historia de tu marca en un par de lineas. Este texto es totalmente editable: da clic para cambiarlo.",
  },
  "product-tiers": {
    title: "Nuestros productos",
    t1name: "Basico",
    t1price: "$9",
    t2name: "Pro",
    t2price: "$19",
    t3name: "Premium",
    t3price: "$29",
  },
  services: {
    title: "Servicios especializados",
    s1name: "Servicio 1",
    s1desc: "Describe el alcance de este servicio.",
    s2name: "Servicio 2",
    s2desc: "Describe el alcance de este servicio.",
    s3name: "Servicio 3",
    s3desc: "Describe el alcance de este servicio.",
  },
  stats: {
    n1: "+120",
    l1: "Clientes",
    n2: "8 anos",
    l2: "De experiencia",
    n3: "24/7",
    l3: "Soporte",
  },
  "cta-banner": {
    title: "Listo para empezar?",
    cta: "Contactar",
  },
  carousel: { image1: STOCK_IMAGES[2], image2: STOCK_IMAGES[3], image3: STOCK_IMAGES[4] },
  gallery: {
    g1: STOCK_IMAGES[0],
    g2: STOCK_IMAGES[1],
    g3: STOCK_IMAGES[2],
    g4: STOCK_IMAGES[3],
    g5: STOCK_IMAGES[4],
    g6: STOCK_IMAGES[5],
  },
  "bg-image": { image: STOCK_IMAGES[0], caption: "Seccion con imagen de fondo" },
  "bg-video": {
    title: "Video de fondo",
    video: publicAssetUrl("appddata_build/video-preview.mp4"),
  },
  blog: {
    title: "Ultimas entradas",
    p1t: "Titulo del articulo uno",
    p1e: "Un resumen breve de la entrada para enganchar al lector.",
    p1img: STOCK_IMAGES[2],
    p2t: "Titulo del articulo dos",
    p2e: "Un resumen breve de la entrada para enganchar al lector.",
    p2img: STOCK_IMAGES[3],
    p3t: "Titulo del articulo tres",
    p3e: "Un resumen breve de la entrada para enganchar al lector.",
    p3img: STOCK_IMAGES[4],
  },
  promos: {
    title: "Promociones",
    o1tag: "-20%",
    o1t: "Oferta de temporada",
    o1d: "Valida por tiempo limitado.",
    o2tag: "2x1",
    o2t: "Combo especial",
    o2d: "Llevate dos por el precio de uno.",
    o3tag: "-50%",
    o3t: "Liquidacion",
    o3d: "Ultimas piezas disponibles.",
  },
  testimonials: {
    title: "Lo que dicen nuestros clientes",
    q1: "Trabajar con ellos fue rapido y el resultado supero lo que esperaba.",
    a1: "Ana G.",
    q2: "Un equipo profesional que entendio mi marca desde el primer dia.",
    a2: "Luis M.",
    q3: "El sitio quedo justo como lo imaginaba. Muy recomendados.",
    a3: "Sofia R.",
  },
  faq: {
    title: "Preguntas frecuentes",
    q1: "Cuanto tarda mi sitio?",
    a1: "Depende del paquete, normalmente entre 1 y 3 semanas.",
    q2: "Puedo editar el contenido despues?",
    a2: "Si, con IMIN puedes editar textos e imagenes cuando quieras.",
    q3: "Incluye dominio y hosting?",
    a3: "Te asesoramos para contratarlos y dejar todo listo.",
  },
  contact: {
    title: "Contactanos",
    subtitle: "Escribenos y te respondemos lo antes posible.",
    email: "hola@tumarca.com",
    phone: "+52 55 1234 5678",
    address: "Av. Reforma 100, CDMX",
  },
};

/* ------------------------------ Botones -------------------------------- */
export type ButtonFill = "solid" | "gradient" | "soft";

export type ButtonStyle = {
  fill: ButtonFill;
  /** Vacio = usa el acento del plan. */
  color: string;
  color2: string;
  direction: "right" | "br" | "bottom";
};

export const DEFAULT_BUTTON_STYLE: ButtonStyle = {
  fill: "solid",
  color: "",
  color2: "",
  direction: "right",
};

export const BUTTON_FILLS: { id: ButtonFill; label: string }[] = [
  { id: "solid", label: "Solido" },
  { id: "gradient", label: "Gradiente" },
  { id: "soft", label: "Opaco" },
];
