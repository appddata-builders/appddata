import {
  BadgePercent,
  CalendarClock,
  CircleHelp,
  GalleryHorizontalEnd,
  Image,
  Images,
  LayoutList,
  Layers,
  MailOpen,
  Megaphone,
  Newspaper,
  Quote,
  Sparkles,
  SquareStack,
  Star,
  Type,
  Video,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";

import { getSitePackage } from "@/lib/site-packages";

/**
 * Modelo de datos de Appddata Build.
 *
 * Armador de sitios que arranca con las paginas por defecto que llevan todos
 * los paquetes (Home, About, Productos, Contact) y deja al usuario:
 *  - elegir plantilla visual y variantes de navbar / footer,
 *  - decidir si todo vive en una sola pagina con anclas o en paginas separadas,
 *  - arrastrar widgets al body (maximo 4 por pagina, sin candados) y editar
 *    textos, logo e imagenes inline.
 * El tabulador de plan es informativo: muestra que incluye cada paquete
 * (precio, IMIN, soporte, servicios extra). No limita los widgets.
 * Todo vive en el cliente; no toca la base de datos.
 */

/* ------------------------------- Planes -------------------------------- */

export type BuildPlanId = "beginner" | "super" | "premium";

export const PLAN_ORDER: BuildPlanId[] = ["beginner", "super", "premium"];

export const MAX_WIDGETS_PER_PAGE = 4;
/** La pagina Contact es especial: un solo widget elegido de un set curado. */
export const MAX_WIDGETS_CONTACT = 1;

export type PlanMeta = {
  id: BuildPlanId;
  name: string;
  price: string;
  description: string;
  imin: boolean;
  /** Texto del renglon de IMIN en la tarjeta del paquete. */
  iminLabel: string;
  soporte: string;
  /** Servicios y extras contratables del paquete. */
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

/** Todo en una sola pagina con anclas, o navegando entre paginas separadas. */
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
  { id: "hero", name: "Encabezado / Hero", description: "Titulo grande con subtitulo y boton.", icon: Type },
  { id: "features", name: "Beneficios", description: "Tres puntos con icono y texto.", icon: Layers },
  { id: "image-text", name: "Imagen + texto", description: "Imagen a un lado y contenido al otro.", icon: SquareStack },
  { id: "text-block", name: "Bloque de texto", description: "Titulo y parrafo editable.", icon: LayoutList },
  { id: "product-tiers", name: "Tiers de productos", description: "Tres tarjetas de planes o productos.", icon: Layers },
  { id: "services", name: "Servicios", description: "Tarjetas para tus servicios especializados.", icon: Wrench },
  { id: "stats", name: "Metricas", description: "Cifras clave de tu negocio.", icon: Star },
  { id: "cta-banner", name: "Franja CTA", description: "Llamado a la accion a todo lo ancho.", icon: Megaphone },
  { id: "carousel", name: "Carrusel", description: "Slider de imagenes con navegacion.", icon: GalleryHorizontalEnd },
  { id: "gallery", name: "Galeria", description: "Cuadricula de imagenes.", icon: Images },
  { id: "bg-image", name: "Fondo con imagen", description: "Seccion con imagen de fondo.", icon: Image },
  { id: "bg-video", name: "Fondo con video", description: "Seccion inmersiva con video.", icon: Video },
  { id: "blog", name: "Blog", description: "Tarjetas de entradas o noticias.", icon: Newspaper },
  { id: "promos", name: "Promotions", description: "Ofertas con descuento destacado.", icon: BadgePercent },
  { id: "testimonials", name: "Testimony", description: "Citas de clientes satisfechos.", icon: Quote },
  { id: "faq", name: "FAQs", description: "Lista de preguntas y respuestas.", icon: CircleHelp },
  { id: "contact", name: "Contact", description: "Datos de contacto y formulario.", icon: MailOpen },
];

export const WIDGETS_BY_ID: Record<WidgetId, WidgetDef> = WIDGETS.reduce(
  (acc, widget) => {
    acc[widget.id] = widget;
    return acc;
  },
  {} as Record<WidgetId, WidgetDef>,
);

/** Contact usa exclusivamente su formulario; los demás widgets viven en el body general. */
export const CONTACT_WIDGET_IDS: WidgetId[] = ["contact"];

/** Widgets ofrecidos en la paleta segun la pagina activa. */
export function widgetsForPage(page: PageId): WidgetDef[] {
  if (page === "contact") return CONTACT_WIDGET_IDS.map((id) => WIDGETS_BY_ID[id]);
  return WIDGETS.filter((w) => w.id !== "contact");
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

const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const SERIF = "'Iowan Old Style', Georgia, 'Times New Roman', serif";

export const TEMPLATES: Record<TemplateId, TemplateTokens> = {
  aurora: {
    id: "aurora",
    name: "Aurora",
    description: "Clara, redondeada y centrada. La principal.",
    primary: true,
    radius: 16,
    heroAlign: "center",
    navUppercase: false,
    navLetter: "0.01em",
    titleFamily: SANS,
    titleWeight: 600,
    bodyFamily: SANS,
    surface: "#ffffff",
    surfaceAlt: "#f6f8fb",
    ink: "#0f172a",
    muted: "#64748b",
    navBg: "#ffffff",
    navInk: "#0f172a",
    footerBg: "#0f172a",
    footerInk: "#e2e8f0",
    dark: false,
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Titulares serif alineados a la izquierda.",
    radius: 4,
    heroAlign: "left",
    navUppercase: false,
    navLetter: "0.02em",
    titleFamily: SERIF,
    titleWeight: 600,
    bodyFamily: SERIF,
    surface: "#faf7f2",
    surfaceAlt: "#f2ede4",
    ink: "#26211b",
    muted: "#6f6558",
    navBg: "#faf7f2",
    navInk: "#26211b",
    footerBg: "#26211b",
    footerInk: "#efe9df",
    dark: false,
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "Shell oscuro y navegacion en mayusculas.",
    radius: 12,
    heroAlign: "left",
    navUppercase: true,
    navLetter: "0.16em",
    titleFamily: SANS,
    titleWeight: 700,
    bodyFamily: SANS,
    surface: "#0f1115",
    surfaceAlt: "#171a21",
    ink: "#e7eaf0",
    muted: "#98a2b3",
    navBg: "#0b0d11",
    navInk: "#e7eaf0",
    footerBg: "#07090c",
    footerInk: "#c7cdd8",
    dark: true,
  },
  neon: {
    id: "neon",
    name: "Neon",
    description: "Oscuro y vibrante, esquinas muy redondeadas.",
    radius: 22,
    heroAlign: "center",
    navUppercase: true,
    navLetter: "0.14em",
    titleFamily: SANS,
    titleWeight: 800,
    bodyFamily: SANS,
    surface: "#0a0a14",
    surfaceAlt: "#12122a",
    ink: "#f4f4ff",
    muted: "#9a9ac4",
    navBg: "#0a0a14",
    navInk: "#f4f4ff",
    footerBg: "#06060f",
    footerInk: "#cfcff0",
    dark: true,
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    description: "Calida y luminosa, tonos arena.",
    radius: 18,
    heroAlign: "center",
    navUppercase: false,
    navLetter: "0.02em",
    titleFamily: SANS,
    titleWeight: 700,
    bodyFamily: SANS,
    surface: "#fff7f0",
    surfaceAlt: "#ffe9db",
    ink: "#3a241a",
    muted: "#9a7b6a",
    navBg: "#fff7f0",
    navInk: "#3a241a",
    footerBg: "#3a241a",
    footerInk: "#f6e6da",
    dark: false,
  },
  mono: {
    id: "mono",
    name: "Mono",
    description: "Blanco y negro, minimal y de esquinas rectas.",
    radius: 2,
    heroAlign: "left",
    navUppercase: true,
    navLetter: "0.2em",
    titleFamily: SANS,
    titleWeight: 700,
    bodyFamily: SANS,
    surface: "#ffffff",
    surfaceAlt: "#f4f4f5",
    ink: "#111111",
    muted: "#71717a",
    navBg: "#ffffff",
    navInk: "#111111",
    footerBg: "#111111",
    footerInk: "#e4e4e7",
    dark: false,
  },
  grises: {
    id: "grises",
    name: "Grises",
    description: "Escala de grises: todo el sitio en blanco y negro.",
    radius: 10,
    heroAlign: "center",
    navUppercase: false,
    navLetter: "0.04em",
    titleFamily: SANS,
    titleWeight: 700,
    bodyFamily: SANS,
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
    description: "Verdes naturales con titulos serif.",
    radius: 14,
    heroAlign: "left",
    navUppercase: false,
    navLetter: "0.02em",
    titleFamily: SERIF,
    titleWeight: 600,
    bodyFamily: SANS,
    surface: "#f5f7f0",
    surfaceAlt: "#e9efe0",
    ink: "#1f2a1a",
    muted: "#5f6b53",
    navBg: "#f5f7f0",
    navInk: "#1f2a1a",
    footerBg: "#1f2a1a",
    footerInk: "#e6ecdc",
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
export const DEFAULT_LOGO = "/brand-plane.png";

export const heroImage =
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80";

export const STOCK_IMAGES = [
  heroImage,
  "https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=80",
];

/** Claves fijas de contenido para navbar y footer (independientes de la variante). */
export const NAV_CONTENT = {
  logo: "chrome:navbar:logo",
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
export const FEATURE_ICONS = [Sparkles, Layers, Wrench, CalendarClock] as const;

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
  "bg-video": { title: "Video de fondo" },
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
