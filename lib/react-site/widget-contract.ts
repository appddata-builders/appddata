/**
 * Contrato compartido de clases entre el PREVIEW del builder y el SITIO
 * generado. Es la fuente unica de verdad del markup: si una clase cambia aqui,
 * cambia en ambos lados a la vez, de modo que el preview no puede volver a
 * "driftear" respecto al sitio real.
 *
 * Reglas para que ambos rendericen identico:
 *  - Solo utilidades CORE de Tailwind (espaciado, tipografia, layout): existen
 *    igual en el builder y en el sitio generado.
 *  - Los COLORES/tipografia de marca NO van como clases de tema (que difieren
 *    entre panel y sitio) sino inline, con el MISMO valor de token en ambos.
 *
 * Este modulo es solo constantes: lo pueden importar tanto client components
 * (el preview) como el generador (server).
 */

/** Hero: seccion de portada. */
export const HERO = {
  section: "px-[max(5vw,1.25rem)] py-28",
  container: "mx-auto w-full max-w-[1050px]",
  eyebrow: "font-bold uppercase tracking-[0.2em]",
  title: "mt-2 text-[clamp(2.5rem,7vw,5.5rem)]",
  subtitle: "mt-4 max-w-[620px] text-lg",
  cta: "mt-6 inline-block px-[1.1rem] py-[0.7rem] font-medium transition-opacity hover:opacity-90",
  /** Alineacion del bloque segun el token heroAlign de la plantilla. */
  alignText: (left: boolean): string => (left ? "text-left" : "text-center"),
  /** El subtitulo se centra salvo en heroAlign izquierda. */
  subtitleLead: (left: boolean): string => (left ? "" : "mx-auto "),
} as const;

/** Contenedor de seccion comun (mismo que el primitivo Section del sitio). */
export const SECTION = {
  outer: "px-[max(5vw,1.25rem)] py-18",
  container: "mx-auto w-full max-w-[1050px]",
} as const;

/** Titulo de seccion clamp (h2). */
export const HEADING2 = "text-[clamp(1.8rem,4vw,3rem)]";

/** Features: rejilla de tarjetas con icono. La estructura es compartida; los
 * colores de la tarjeta (borde/fondo) y del icono/textos van por valor. */
export const FEATURES = {
  grid: "grid gap-4 md:grid-cols-3",
  card: "rounded-[var(--radius)] border p-6",
  icon: "mb-3 inline-block h-6 w-6",
  desc: "mt-1",
} as const;

/** Alpha de tema usados por las tarjetas, para igualar `border-muted/20` y
 * `bg-surface-alt/90` con estilos inline en el preview. */
export const CARD_BORDER_ALPHA = 0.2;
export const CARD_BG_ALPHA = 0.9;

export const IMAGE_TEXT = {
  grid: "grid items-center gap-12 md:grid-cols-2",
  image: "h-[330px] w-full rounded-[var(--radius)] object-cover",
  title: HEADING2,
  body: "mt-3",
} as const;

export const TEXT_BLOCK = {
  title: HEADING2,
  body: "mx-auto mt-3 max-w-[640px] text-lg",
} as const;

/** Titulo de seccion centrado con margen (rejillas). */
export const HEADING2_CENTER = "mb-8 text-center text-[clamp(1.8rem,4vw,3rem)]";
const GRID3 = "grid gap-4 md:grid-cols-3";
const CARD = "rounded-[var(--radius)] border p-6";
/** Base del boton (mismo que el primitivo Button del sitio). El color/relleno va aparte. */
export const BUTTON_BASE = "inline-block px-[1.1rem] py-[0.7rem] font-medium transition-opacity hover:opacity-90";

export const PRODUCT_TIERS = {
  title: HEADING2_CENTER,
  grid: GRID3,
  card: "rounded-[var(--radius)] border p-6 text-center",
  // font-bold: el sitio usa <strong>; el preview usa <p>, asi igualan.
  price: "mt-2 block text-3xl font-bold",
} as const;

export const SERVICES = {
  title: HEADING2_CENTER,
  grid: GRID3,
  card: CARD,
  icon: "mb-3 inline-block h-6 w-6",
  desc: "mt-1",
} as const;

export const STATS = {
  grid: GRID3,
  cell: "text-center",
  number: "block text-3xl font-bold",
  label: "mt-1",
} as const;

export const CTA_BANNER = {
  row: "flex flex-col items-start gap-6 md:flex-row md:items-center",
  title: HEADING2,
  cta: "md:ml-auto",
} as const;

export const CAROUSEL = {
  frame: "relative h-[420px]",
  slide: "h-full w-full rounded-[var(--radius)] object-cover",
} as const;

export const GALLERY = {
  grid: "grid grid-cols-2 gap-3 md:grid-cols-3",
  image: "aspect-square w-full rounded-[var(--radius)] object-cover",
} as const;

export const BG_IMAGE = {
  section: "relative h-[480px]",
  image: "h-full w-full object-cover",
  overlay: "absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-12",
  caption: "text-xl text-white",
} as const;

export const BG_VIDEO = {
  inner: "py-16 text-center",
} as const;

export const BLOG = {
  title: HEADING2_CENTER,
  grid: GRID3,
  card: "overflow-hidden rounded-[var(--radius)] border",
  image: "h-[180px] w-full object-cover",
  body: "p-5",
  excerpt: "mt-1",
} as const;

export const PROMOS = {
  title: HEADING2_CENTER,
  grid: "grid gap-6 md:grid-cols-3",
  card: "relative rounded-[var(--radius)] border p-6 pt-8 text-center",
  tag: "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-extrabold text-white",
  desc: "mt-1",
} as const;

export const TESTIMONIALS = {
  title: HEADING2_CENTER,
  grid: GRID3,
  card: CARD,
  author: "mt-4 block font-bold",
} as const;

export const FAQ = {
  title: HEADING2_CENTER,
  list: "mx-auto w-full max-w-[760px]",
  item: "my-3 rounded-[var(--radius)] border p-4",
  summary: "cursor-pointer font-bold",
  answer: "mt-2",
} as const;

export const CONTACT = {
  grid: "grid items-start gap-12 md:grid-cols-2",
  title: HEADING2,
  subtitle: "mt-3",
  address: "mt-6 not-italic",
  input: "w-full rounded-[calc(var(--radius)/2)] border p-3",
} as const;
