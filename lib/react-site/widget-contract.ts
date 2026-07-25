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
 * RESPONSIVE via CONTAINER QUERIES (Tailwind v4):
 *  - Cada seccion es un `@container`, asi el layout responde al ANCHO DEL
 *    CONTENEDOR (el panel del preview o el viewport del sitio), no al viewport
 *    del navegador. Por eso el preview movil (panel angosto) reflowea de verdad.
 *  - Las rejillas usan variantes `@2xl:`/`@3xl:` (no `md:`), el padding va en el
 *    contenedor interno (descendiente del `@container`), y los titulos escalan
 *    con `cqw` (ancho del contenedor) en vez de `vw` (viewport).
 *
 * Este modulo es solo constantes: lo pueden importar tanto client components
 * (el preview) como el generador (server).
 */

/** Hero: seccion de portada. */
export const HERO = {
  section: "@container",
  container: "mx-auto w-full max-w-[1050px] px-5 py-16 @2xl:px-8 @3xl:py-24",
  eyebrow: "font-bold uppercase tracking-[0.2em]",
  title: "mt-2 text-[clamp(1.9rem,5cqw,3rem)]",
  subtitle: "mt-4 max-w-[620px] text-base @2xl:text-lg",
  cta: "mt-6 inline-block px-[1.1rem] py-[0.7rem] font-medium transition-opacity hover:opacity-90",
  /** Alineacion del bloque segun el token heroAlign de la plantilla. */
  alignText: (left: boolean): string => (left ? "text-left" : "text-center"),
  /** El subtitulo se centra salvo en heroAlign izquierda. */
  subtitleLead: (left: boolean): string => (left ? "" : "mx-auto "),
} as const;

/** Contenedor de seccion comun (mismo que el primitivo Section del sitio). */
export const SECTION = {
  outer: "@container",
  container: "mx-auto w-full max-w-[1050px] px-5 py-12 @2xl:px-8 @3xl:py-16",
} as const;

/** Titulo de seccion clamp (h2), escalado por el ancho del contenedor. */
export const HEADING2 = "text-[clamp(1.5rem,3.5cqw,2.25rem)]";

/** Features: rejilla de tarjetas con icono. La estructura es compartida; los
 * colores de la tarjeta (borde/fondo) y del icono/textos van por valor. */
export const FEATURES = {
  grid: "grid gap-4 @3xl:grid-cols-3",
  card: "rounded-[var(--radius)] border p-6",
  icon: "mb-3 inline-block h-6 w-6",
  desc: "mt-1",
} as const;

/** Alpha de tema usados por las tarjetas, para igualar `border-muted/20` y
 * `bg-surface-alt/90` con estilos inline en el preview. */
export const CARD_BORDER_ALPHA = 0.2;
export const CARD_BG_ALPHA = 0.9;

export const IMAGE_TEXT = {
  grid: "grid items-center gap-8 @2xl:grid-cols-2 @2xl:gap-12",
  image: "h-[220px] w-full rounded-[var(--radius)] object-cover @2xl:h-[330px]",
  title: HEADING2,
  body: "mt-3",
} as const;

export const TEXT_BLOCK = {
  title: HEADING2,
  body: "mx-auto mt-3 max-w-[640px] text-base @2xl:text-lg",
} as const;

/** Titulo de seccion centrado con margen (rejillas). */
export const HEADING2_CENTER = "mb-8 text-center text-[clamp(1.5rem,3.5cqw,2.25rem)]";
const GRID3 = "grid gap-4 @3xl:grid-cols-3";
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
  row: "flex flex-col items-start gap-6 @2xl:flex-row @2xl:items-center",
  title: HEADING2,
  cta: "@2xl:ml-auto",
} as const;

export const CAROUSEL = {
  frame: "relative h-[240px] @2xl:h-[420px]",
  slide: "h-full w-full rounded-[var(--radius)] object-cover",
} as const;

export const GALLERY = {
  grid: "grid grid-cols-2 gap-3 @3xl:grid-cols-3",
  image: "aspect-square w-full rounded-[var(--radius)] object-cover",
} as const;

export const BG_IMAGE = {
  section: "relative h-screen min-h-[420px] overflow-hidden",
  image: "h-full w-full object-cover",
  /** Tela de color/gradiente editable (opacidad <=50%) DELANTE de la imagen.
   * pointer-events-none: no bloquea el boton "Cambiar" de la imagen. */
  cloth: "absolute inset-0 z-[1] pointer-events-none",
  /** Overlay del caption: por encima de imagen+tela (z-[2]) pero por DEBAJO del
   * boton "Cambiar" del preview (z-10). No captura clics; el caption los reactiva. */
  overlay: "absolute inset-0 z-[2] flex items-end bg-gradient-to-t from-black/60 to-transparent p-8 @2xl:p-12 pointer-events-none",
  caption: "text-lg @2xl:text-xl text-white pointer-events-auto",
} as const;

export const BG_VIDEO = {
  section: "relative min-h-screen overflow-hidden",
  media: "absolute inset-0 z-0 h-full w-full object-cover",
  /** Tela de color/gradiente editable (opacidad <=50%) DELANTE del video.
   * pointer-events-none: nunca bloquea los controles del video. */
  cloth: "absolute inset-0 z-[1] pointer-events-none",
  /** Overlay del titulo/play: no captura clics (pasan al video); los hijos
   * interactivos reactivan pointer-events con `pointer-events-auto`. */
  overlay: "absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-black/30 pointer-events-none",
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
  grid: "grid gap-6 @3xl:grid-cols-3",
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
  grid: "grid items-start gap-8 @2xl:grid-cols-2 @2xl:gap-12",
  title: HEADING2,
  subtitle: "mt-3",
  address: "mt-6 not-italic",
  input: "w-full rounded-[calc(var(--radius)/2)] border p-3",
} as const;
