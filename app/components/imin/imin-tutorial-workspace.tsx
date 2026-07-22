"use client";

import { ChevronDown, ChevronUp, ImagePlay, LayoutGrid, Monitor, MousePointer2, Palette, Plus, Trash2, Type } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { IconType } from "react-icons";
import { FaCircle } from "react-icons/fa";
import {
  FaArrowLeft,
  FaArrowRight,
  FaArrowTrendUp,
  FaAward,
  FaBagShopping,
  FaBarcode,
  FaBars,
  FaBolt,
  FaBoxOpen,
  FaBuilding,
  FaCalendarDays,
  FaCamera,
  FaCarBattery,
  FaCarSide,
  FaCartShopping,
  FaCheck,
  FaChevronDown,
  FaChevronRight,
  FaCircleCheck,
  FaCircleInfo,
  FaCircleQuestion,
  FaClock,
  FaCommentDots,
  FaCreditCard,
  FaDownload,
  FaDroplet,
  FaEnvelope,
  FaEye,
  FaFacebookF,
  FaFileLines,
  FaFire,
  FaGasPump,
  FaGaugeHigh,
  FaGear,
  FaGithub,
  FaGlobe,
  FaHammer,
  FaHandshake,
  FaHeadset,
  FaHeart,
  FaHouse,
  FaImage,
  FaInstagram,
  FaLightbulb,
  FaLinkedinIn,
  FaLocationDot,
  FaLock,
  FaMagnifyingGlass,
  FaOilCan,
  FaPaperclip,
  FaPaperPlane,
  FaPercent,
  FaPhone,
  FaPinterestP,
  FaPlay,
  FaPrint,
  FaReceipt,
  FaRocket,
  FaScrewdriverWrench,
  FaShareNodes,
  FaShield,
  FaShieldHalved,
  FaSnapchat,
  FaSnowflake,
  FaStar,
  FaStore,
  FaTag,
  FaTelegram,
  FaTemperatureHalf,
  FaThreads,
  FaThumbsUp,
  FaTiktok,
  FaTriangleExclamation,
  FaTruckFast,
  FaUpRightFromSquare,
  FaUpload,
  FaUser,
  FaUsers,
  FaVideo,
  FaWallet,
  FaWhatsapp,
  FaWind,
  FaWrench,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { GiAutoRepair, GiCarDoor, GiCarSeat, GiCarWheel, GiSteeringWheel, GiTireIron } from "react-icons/gi";
import {
  SiAmericanexpress,
  SiMastercard,
  SiMercadopago,
  SiPaypal,
  SiStripe,
  SiVisa,
} from "react-icons/si";
import { TbEngine, TbManualGearbox } from "react-icons/tb";

import { Badge } from "@/app/components/ui/badge";
import { WIDGETS, type WidgetId } from "@/app/components/build/build-model";
import { cn } from "@/lib/utils";

const DEFAULT_SITE_URL = "https://refautomex.com";
const DEFAULT_EDITS_ENDPOINT = "/api/dashboard/imin/edits";

type EditorMode = "navigate" | "text" | "media" | "style" | "widgets";
// El bridge distingue imagen de primer plano, fondo y video.
type MediaKind = "image" | "background" | "video";
// Relleno solido o degradado de dos colores.
type ColorFill = "solid" | "gradient";
// Hacia donde avanza el degradado.
type GradientDirection =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const GRADIENT_DIRECTIONS: { value: GradientDirection; label: string }[] = [
  { value: "left", label: "← Izquierda" },
  { value: "right", label: "Derecha →" },
  { value: "top", label: "↑ Arriba" },
  { value: "bottom", label: "Abajo ↓" },
  { value: "top-left", label: "↖ Esq. sup. izq." },
  { value: "top-right", label: "Esq. sup. der. ↗" },
  { value: "bottom-left", label: "↙ Esq. inf. izq." },
  { value: "bottom-right", label: "Esq. inf. der. ↘" },
];

function gradientCssDirection(direction: GradientDirection): string {
  return direction.replace("-", " ");
}

function colorWithOpacity(color: string, opacity: number): string {
  const hex = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity / 100})`;
}

type BridgeMessage =
  | { source: "imin-bridge"; type: "ready" }
  | { source: "imin-bridge"; type: "text-changed"; selector: string; value: string }
  | {
      source: "imin-bridge";
      type: "text-selected";
      selector: string;
      value: string;
      color: string;
    }
  | { source: "imin-bridge"; type: "media-selected"; selector: string; kind: MediaKind }
  | { source: "imin-bridge"; type: "color-selected"; selector: string }
  | { source: "imin-bridge"; type: "icon-selected"; selector: string };

// Estado del editor de estilo abierto, o null si esta cerrado.
//
// En modo estilo solo se pintan FONDOS: el color del texto se maneja junto al
// contenido, en el modo de textos.
type StyleEditor =
  | { kind: "color"; selector: string }
  | { kind: "icon"; selector: string }
  | null;

// Texto seleccionado en el modo de textos. La escritura y el color viven en
// pestañas separadas del mismo panel para que no se estorben.
type TextTab = "description" | "color";
type TextEditor = { selector: string; value: string } | null;

const modeOptions: { id: EditorMode; label: string; icon: typeof Type }[] = [
  { id: "navigate", label: "Navegar", icon: MousePointer2 },
  { id: "text", label: "Editar textos", icon: Type },
  { id: "media", label: "Editar medios", icon: ImagePlay },
  { id: "style", label: "Colores e iconos", icon: Palette },
  { id: "widgets", label: "Widgets", icon: LayoutGrid },
];

type IminWidget = { id: string; type: WidgetId };

// Catalogo de iconos para reemplazar en el sitio. Todo sale de react-icons
// para que el trazo sea consistente con lo que ya usa el proyecto.
//
// Se combinan varias librerias segun el tipo: Font Awesome 6 para lo general y
// las marcas, Simple Icons para medios de pago, y Game Icons / Tabler para
// piezas de automovil que las demas no cubren.
//
// `keywords` alimenta el buscador con terminos alternativos en español, y `lib`
// deja ver de que libreria viene cada icono.
type IconEntry = {
  name: string;
  keywords: string;
  lib: string;
  Icon: IconType;
};

const ICON_CATEGORIES: { category: string; icons: IconEntry[] }[] = [
  {
    category: "Redes sociales",
    icons: [
      { name: "WhatsApp", keywords: "whatsapp wasap chat mensaje", lib: "fa6", Icon: FaWhatsapp },
      { name: "Facebook", keywords: "facebook fb meta red social", lib: "fa6", Icon: FaFacebookF },
      { name: "Instagram", keywords: "instagram ig fotos red social", lib: "fa6", Icon: FaInstagram },
      { name: "X (Twitter)", keywords: "x twitter tuit red social", lib: "fa6", Icon: FaXTwitter },
      { name: "TikTok", keywords: "tiktok videos red social", lib: "fa6", Icon: FaTiktok },
      { name: "YouTube", keywords: "youtube video canal", lib: "fa6", Icon: FaYoutube },
      { name: "LinkedIn", keywords: "linkedin trabajo profesional", lib: "fa6", Icon: FaLinkedinIn },
      { name: "Telegram", keywords: "telegram mensajeria chat", lib: "fa6", Icon: FaTelegram },
      { name: "Pinterest", keywords: "pinterest pines inspiracion", lib: "fa6", Icon: FaPinterestP },
      { name: "Threads", keywords: "threads meta red social", lib: "fa6", Icon: FaThreads },
      { name: "Snapchat", keywords: "snapchat snap", lib: "fa6", Icon: FaSnapchat },
      { name: "GitHub", keywords: "github codigo repositorio", lib: "fa6", Icon: FaGithub },
    ],
  },
  {
    category: "Pagos",
    icons: [
      { name: "Visa", keywords: "visa tarjeta pago credito", lib: "si", Icon: SiVisa },
      { name: "Mastercard", keywords: "mastercard tarjeta pago", lib: "si", Icon: SiMastercard },
      { name: "American Express", keywords: "amex american express tarjeta", lib: "si", Icon: SiAmericanexpress },
      { name: "PayPal", keywords: "paypal pago en linea", lib: "si", Icon: SiPaypal },
      { name: "Mercado Pago", keywords: "mercadopago mercado libre pago", lib: "si", Icon: SiMercadopago },
      { name: "Stripe", keywords: "stripe pago tarjeta", lib: "si", Icon: SiStripe },
      { name: "Tarjeta", keywords: "tarjeta credito debito pago", lib: "fa6", Icon: FaCreditCard },
      { name: "Cartera", keywords: "dinero saldo billetera", lib: "fa6", Icon: FaWallet },
    ],
  },
  {
    category: "Navegacion",
    icons: [
      { name: "Inicio", keywords: "casa home principal", lib: "fa6", Icon: FaHouse },
      { name: "Menu", keywords: "hamburguesa lineas barras", lib: "fa6", Icon: FaBars },
      { name: "Buscar", keywords: "lupa busqueda search", lib: "fa6", Icon: FaMagnifyingGlass },
      { name: "Flecha izquierda", keywords: "atras anterior volver", lib: "fa6", Icon: FaArrowLeft },
      { name: "Flecha derecha", keywords: "siguiente adelante continuar", lib: "fa6", Icon: FaArrowRight },
      { name: "Chevron derecha", keywords: "mas ver detalle", lib: "fa6", Icon: FaChevronRight },
      { name: "Chevron abajo", keywords: "desplegar acordeon", lib: "fa6", Icon: FaChevronDown },
      { name: "Enlace externo", keywords: "abrir link salir", lib: "fa6", Icon: FaUpRightFromSquare },
    ],
  },
  {
    category: "Comercio",
    icons: [
      { name: "Carrito", keywords: "compra cart comprar", lib: "fa6", Icon: FaCartShopping },
      { name: "Bolsa", keywords: "compra bolsa tienda", lib: "fa6", Icon: FaBagShopping },
      { name: "Etiqueta", keywords: "precio oferta tag", lib: "fa6", Icon: FaTag },
      { name: "Paquete", keywords: "caja producto envio", lib: "fa6", Icon: FaBoxOpen },
      { name: "Envio", keywords: "camion entrega reparto rapido", lib: "fa6", Icon: FaTruckFast },
      { name: "Recibo", keywords: "factura ticket comprobante", lib: "fa6", Icon: FaReceipt },
      { name: "Descuento", keywords: "porcentaje promocion rebaja", lib: "fa6", Icon: FaPercent },
      { name: "Tienda", keywords: "sucursal local negocio", lib: "fa6", Icon: FaStore },
      { name: "Codigo de barras", keywords: "sku inventario escaner", lib: "fa6", Icon: FaBarcode },
    ],
  },
  {
    category: "Contacto",
    icons: [
      { name: "Telefono", keywords: "llamar contacto tel", lib: "fa6", Icon: FaPhone },
      { name: "Correo", keywords: "email mail sobre", lib: "fa6", Icon: FaEnvelope },
      { name: "Ubicacion", keywords: "mapa direccion pin", lib: "fa6", Icon: FaLocationDot },
      { name: "Mensaje", keywords: "chat comentario globo", lib: "fa6", Icon: FaCommentDots },
      { name: "Enviar", keywords: "mandar submit avion", lib: "fa6", Icon: FaPaperPlane },
      { name: "Reloj", keywords: "horario tiempo hora", lib: "fa6", Icon: FaClock },
      { name: "Calendario", keywords: "fecha agenda cita", lib: "fa6", Icon: FaCalendarDays },
      { name: "Usuario", keywords: "cuenta perfil persona", lib: "fa6", Icon: FaUser },
      { name: "Usuarios", keywords: "equipo clientes personas", lib: "fa6", Icon: FaUsers },
      { name: "Soporte", keywords: "ayuda atencion audifonos", lib: "fa6", Icon: FaHeadset },
      { name: "Empresa", keywords: "edificio oficina corporativo", lib: "fa6", Icon: FaBuilding },
      { name: "Sitio web", keywords: "globo internet idioma", lib: "fa6", Icon: FaGlobe },
    ],
  },
  {
    category: "Taller y autopartes",
    icons: [
      { name: "Auto", keywords: "coche carro vehiculo", lib: "fa6", Icon: FaCarSide },
      { name: "Herramientas", keywords: "taller reparar desarmador llave", lib: "fa6", Icon: FaScrewdriverWrench },
      { name: "Llave inglesa", keywords: "herramienta ajustar tuerca", lib: "fa6", Icon: FaWrench },
      { name: "Martillo", keywords: "herramienta golpe taller", lib: "fa6", Icon: FaHammer },
      { name: "Engrane", keywords: "motor pieza mecanica configuracion", lib: "fa6", Icon: FaGear },
      { name: "Motor", keywords: "engine bloque cilindros", lib: "tb", Icon: TbEngine },
      { name: "Transmision", keywords: "caja velocidades palanca estandar", lib: "tb", Icon: TbManualGearbox },
      { name: "Llanta", keywords: "rueda neumatico rin", lib: "gi", Icon: GiCarWheel },
      { name: "Volante", keywords: "direccion manejo timon", lib: "gi", Icon: GiSteeringWheel },
      { name: "Puerta", keywords: "carroceria lamina", lib: "gi", Icon: GiCarDoor },
      { name: "Asiento", keywords: "interior tapiceria butaca", lib: "gi", Icon: GiCarSeat },
      { name: "Hojalateria", keywords: "reparacion taller carroceria", lib: "gi", Icon: GiAutoRepair },
      { name: "Llave de cruz", keywords: "birlos tuercas llanta", lib: "gi", Icon: GiTireIron },
      { name: "Aceite", keywords: "lubricante cambio motor", lib: "fa6", Icon: FaOilCan },
      { name: "Bateria", keywords: "acumulador carga electrico", lib: "fa6", Icon: FaCarBattery },
      { name: "Tablero", keywords: "velocimetro medidor rendimiento", lib: "fa6", Icon: FaGaugeHigh },
      { name: "Combustible", keywords: "gasolina bomba diesel", lib: "fa6", Icon: FaGasPump },
      { name: "Electrico", keywords: "rayo energia corriente", lib: "fa6", Icon: FaBolt },
      { name: "Faro", keywords: "luz foco lampara idea", lib: "fa6", Icon: FaLightbulb },
      { name: "Temperatura", keywords: "termometro calor motor", lib: "fa6", Icon: FaTemperatureHalf },
      { name: "Aire", keywords: "viento ventilacion clima", lib: "fa6", Icon: FaWind },
      { name: "Anticongelante", keywords: "gota liquido refrigerante", lib: "fa6", Icon: FaDroplet },
      { name: "Clima frio", keywords: "nieve aire acondicionado ac", lib: "fa6", Icon: FaSnowflake },
      { name: "Escape", keywords: "fuego calor combustion", lib: "fa6", Icon: FaFire },
    ],
  },
  {
    category: "Confianza",
    icons: [
      { name: "Check", keywords: "listo correcto ok", lib: "fa6", Icon: FaCheck },
      { name: "Check circulo", keywords: "aprobado exito valido", lib: "fa6", Icon: FaCircleCheck },
      { name: "Advertencia", keywords: "alerta cuidado triangulo", lib: "fa6", Icon: FaTriangleExclamation },
      { name: "Informacion", keywords: "info dato nota", lib: "fa6", Icon: FaCircleInfo },
      { name: "Pregunta", keywords: "ayuda duda faq", lib: "fa6", Icon: FaCircleQuestion },
      { name: "Estrella", keywords: "favorito calificacion rating", lib: "fa6", Icon: FaStar },
      { name: "Corazon", keywords: "favorito me gusta", lib: "fa6", Icon: FaHeart },
      { name: "Pulgar arriba", keywords: "like recomendado bueno", lib: "fa6", Icon: FaThumbsUp },
      { name: "Escudo", keywords: "seguridad proteccion", lib: "fa6", Icon: FaShield },
      { name: "Garantia", keywords: "escudo certificado seguro", lib: "fa6", Icon: FaShieldHalved },
      { name: "Premio", keywords: "calidad reconocimiento medalla", lib: "fa6", Icon: FaAward },
      { name: "Candado", keywords: "seguro privado bloqueado", lib: "fa6", Icon: FaLock },
      { name: "Ver", keywords: "ojo visualizar preview", lib: "fa6", Icon: FaEye },
      { name: "Acuerdo", keywords: "trato alianza manos", lib: "fa6", Icon: FaHandshake },
      { name: "Cohete", keywords: "rapido lanzamiento impulso", lib: "fa6", Icon: FaRocket },
      { name: "Tendencia", keywords: "crecimiento grafica subida", lib: "fa6", Icon: FaArrowTrendUp },
    ],
  },
  {
    category: "Multimedia",
    icons: [
      { name: "Imagen", keywords: "foto galeria picture", lib: "fa6", Icon: FaImage },
      { name: "Video", keywords: "camara pelicula clip", lib: "fa6", Icon: FaVideo },
      { name: "Reproducir", keywords: "play iniciar", lib: "fa6", Icon: FaPlay },
      { name: "Camara", keywords: "foto capturar", lib: "fa6", Icon: FaCamera },
      { name: "Documento", keywords: "archivo pdf texto", lib: "fa6", Icon: FaFileLines },
      { name: "Descargar", keywords: "bajar guardar", lib: "fa6", Icon: FaDownload },
      { name: "Subir", keywords: "cargar upload", lib: "fa6", Icon: FaUpload },
      { name: "Adjunto", keywords: "clip archivo", lib: "fa6", Icon: FaPaperclip },
      { name: "Imprimir", keywords: "impresora papel", lib: "fa6", Icon: FaPrint },
      { name: "Compartir", keywords: "enviar redes share", lib: "fa6", Icon: FaShareNodes },
    ],
  },
];

// Librerias de react-icons que ofrece el buscador. Los iconos NO se importan
// aqui: se piden a /api/imin/icons, que los renderiza en el servidor y devuelve
// solo el SVG. Importarlas en el cliente llevaba la carga inicial de /imin de
// 827 KB a 20 MB, porque el bundler no separaba los chunks.
//
// `note` describe el grosor del trazo, que suele ser lo que decide la eleccion:
// Font Awesome es solido y pesado; Tabler, Feather o Circum son finos.
const ICON_LIBRARIES: { id: string; label: string; note: string }[] = [
  { id: "tb", label: "Tabler", note: "5,963 · trazo fino" },
  { id: "lu", label: "Lucide", note: "1,541 · trazo fino" },
  { id: "fi", label: "Feather", note: "287 · trazo muy fino" },
  { id: "ci", label: "Circum", note: "288 · trazo muy fino" },
  { id: "sl", label: "Simple Line", note: "189 · trazo muy fino" },
  { id: "pi", label: "Phosphor", note: "9,072 · de fino a solido" },
  { id: "hi2", label: "Heroicons 2", note: "972 · contorno y solido" },
  { id: "io5", label: "Ionicons 5", note: "1,332 · contorno y solido" },
  { id: "ri", label: "Remix", note: "3,058 · contorno y relleno" },
  { id: "bs", label: "Bootstrap", note: "2,754 · contorno y relleno" },
  { id: "bi", label: "BoxIcons", note: "1,634 · contorno y relleno" },
  { id: "ai", label: "Ant Design", note: "831 · contorno y relleno" },
  { id: "md", label: "Material Design", note: "4,341 · solido" },
  { id: "fa6", label: "Font Awesome 6", note: "2,058 · solido y marcas" },
  { id: "fa", label: "Font Awesome 5", note: "1,611 · solido y marcas" },
  { id: "si", label: "Simple Icons", note: "3,364 · logos de marcas" },
  { id: "gi", label: "Game Icons", note: "4,040 · siluetas, autopartes" },
  { id: "lia", label: "Line Awesome", note: "1,544 · trazo ligero" },
  { id: "hi", label: "Heroicons 1", note: "460 · contorno y solido" },
  { id: "io", label: "Ionicons 4", note: "696 · contorno y solido" },
  { id: "cg", label: "css.gg", note: "704 · trazo fino" },
  { id: "gr", label: "Grommet", note: "637 · trazo medio" },
  { id: "vsc", label: "VS Code", note: "498 · trazo fino" },
  { id: "im", label: "IcoMoon", note: "491 · solido" },
  { id: "tfi", label: "Themify", note: "352 · trazo fino" },
  { id: "ti", label: "Typicons", note: "336 · solido" },
  { id: "rx", label: "Radix", note: "332 · trazo fino" },
  { id: "fc", label: "Flat Color", note: "329 · a color" },
  { id: "go", label: "Octicons", note: "264 · trazo medio" },
  { id: "wi", label: "Weather", note: "219 · clima" },
  { id: "di", label: "Devicons", note: "192 · tecnologias" },
];

type RemoteIcon = { name: string; svg: string };

// El bridge reporta el color computado como "rgb(r, g, b)"; el input type=color
// solo entiende hexadecimal. Devuelve null si no se puede convertir.
function cssColorToHex(value: string): string | null {
  const match = value.match(/^rgba?\(([^)]+)\)/);
  if (!match) {
    return /^#[0-9a-f]{6}$/i.test(value) ? value : null;
  }
  const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return (
    "#" +
    parts
      .slice(0, 3)
      .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
      .join("")
  );
}

// Solo mp4 para video; cualquier imagen para imagen/fondo.
function acceptForKind(kind: MediaKind): string {
  return kind === "video" ? "video/mp4" : "image/*";
}

function isValidFileForKind(file: File, kind: MediaKind): boolean {
  if (kind === "video") {
    return file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
  }
  return file.type.startsWith("image/");
}

export type IminWorkspaceProps = {
  /**
   * "demo" es la copia publica de /imin: se anuncia como demostracion y no
   * puede guardar. "panel" es la del dashboard: ocupa toda la pantalla y
   * persiste los cambios contra el proyecto.
   */
  variant?: "demo" | "panel";
  projectSlug?: string;
  /** URL publica del sitio que tiene instalado el bridge IMIN. */
  siteUrl?: string;
  /** Nombre corto mostrado en la barra y en el titulo del iframe. */
  siteName?: string;
  /** Permite conectar el workspace a otro backend sin reescribir el editor. */
  editsEndpoint?: string;
  demoTitle?: string;
  demoDescription?: string;
};

/** Una edicion aplicada al sitio, tal cual se le manda al bridge. */
type StoredEdit = Record<string, unknown> & { type: string; selector: string };

function editKey(edit: StoredEdit): string {
  return `${edit.type}|${edit.selector}`;
}

export function IminWorkspace({
  variant = "demo",
  projectSlug,
  siteUrl = DEFAULT_SITE_URL,
  siteName = "refautomex.com",
  editsEndpoint = DEFAULT_EDITS_ENDPOINT,
  demoTitle = "Demostración IMIN",
  demoDescription = "Tutorial de edición de refautomex.com. Demostrativo.",
}: IminWorkspaceProps = {}) {
  const targetOrigin = new URL(siteUrl).origin;
  const canSave = variant === "panel" && typeof projectSlug === "string" && projectSlug !== "";
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingMediaRef = useRef<{ selector: string; kind: MediaKind } | null>(null);
  const [mode, setMode] = useState<EditorMode>("navigate");
  const [bridgeReady, setBridgeReady] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Modo destino a la espera de confirmar guardar/descartar (null = sin dialogo).
  const [pendingMode, setPendingMode] = useState<EditorMode | null>(null);
  // Editor de estilo (color o iconos) abierto tras cliquear un elemento.
  const [styleEditor, setStyleEditor] = useState<StyleEditor>(null);
  const [textEditor, setTextEditor] = useState<TextEditor>(null);
  const [textTab, setTextTab] = useState<TextTab>("description");
  const [textDraft, setTextDraft] = useState("");
  const [textColorValue, setTextColorValue] = useState("#0455a2");
  const [textColorEndValue, setTextColorEndValue] = useState("#7c3aed");
  const [textColorFill, setTextColorFill] = useState<ColorFill>("solid");
  const [textGradientDirection, setTextGradientDirection] = useState<GradientDirection>("right");
  const [colorValue, setColorValue] = useState("#0455a2");
  const [colorEndValue, setColorEndValue] = useState("#7c3aed");
  const [colorFill, setColorFill] = useState<ColorFill>("solid");
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>("right");
  const [backgroundOpacity, setBackgroundOpacity] = useState(100);
  const [iconQuery, setIconQuery] = useState("");
  // "curated" = la seleccion por tema; cualquier otro id = libreria completa.
  const [iconLib, setIconLib] = useState("curated");
  const [libIcons, setLibIcons] = useState<RemoteIcon[]>([]);
  const [libTotal, setLibTotal] = useState(0);
  const [libLimit, setLibLimit] = useState(0);
  const [libLoading, setLibLoading] = useState(false);
  const [widgets, setWidgets] = useState<IminWidget[]>([]);

  // Acumulador de cambios de la sesion. Es un ref y no estado porque solo se
  // lee al guardar y al reaplicar: no debe redibujar el editor.
  const editsRef = useRef<Map<string, StoredEdit>>(new Map());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const post = useCallback((message: Record<string, unknown>) => {
    // Todo lo que sea "set-*" (menos el cambio de modo) es una edicion real del
    // sitio, asi que se registra en el mismo punto por el que se envia.
    const type = message.type;
    const selector = message.selector;
    if (
      typeof type === "string" &&
      type.startsWith("set-") &&
      type !== "set-mode" &&
      typeof selector === "string"
    ) {
      const edit = { ...message, type, selector } as StoredEdit;
      editsRef.current.set(editKey(edit), edit);
    }

    iframeRef.current?.contentWindow?.postMessage(
      { source: "imin-editor", ...message },
      targetOrigin,
    );
  }, [targetOrigin]);

  // Cambia de modo, pero al volver a "Navegar" con cambios pendientes primero
  // pregunta si se desean guardar.
  const requestMode = (next: EditorMode) => {
    if (next === mode) {
      return;
    }
    if (next === "navigate" && mode !== "navigate" && hasChanges) {
      setPendingMode(next);
      return;
    }
    // Cada modo tiene su propio panel: al cambiar, se cierra lo que quedo abierto.
    setStyleEditor(null);
    setTextEditor(null);
    setMode(next);
  };

  // Cambios ya guardados en el proyecto. Se reaplican cada vez que el sitio
  // incrustado carga, para que el editor abra donde se quedo.
  const savedEditsRef = useRef<StoredEdit[]>([]);

  useEffect(() => {
    if (!canSave) return;
    let cancelled = false;
    fetch(`${editsEndpoint}?slug=${encodeURIComponent(projectSlug ?? "")}`)
      .then((res) => (res.ok ? res.json() : { edits: [] }))
      .then((data: { edits?: StoredEdit[] }) => {
        if (!cancelled) {
          savedEditsRef.current = data.edits ?? [];
          const widgetEdit = savedEditsRef.current.find((edit) => edit.type === "set-widgets");
          if (widgetEdit && Array.isArray(widgetEdit.widgets)) setWidgets((widgetEdit.widgets as IminWidget[]).slice(0, 4));
        }
      })
      .catch(() => {
        savedEditsRef.current = [];
      });
    return () => {
      cancelled = true;
    };
  }, [canSave, editsEndpoint, projectSlug]);

  useEffect(() => {
    if (!bridgeReady) return;
    // La estructura debe existir antes de reaplicar textos, medios y estilos
    // cuyos selectores pueden apuntar a los widgets administrados.
    const orderedEdits = [...savedEditsRef.current].sort((a, b) =>
      a.type === "set-widgets" ? -1 : b.type === "set-widgets" ? 1 : 0,
    );
    for (const edit of orderedEdits) {
      // postMessage directo: reaplicar lo ya guardado no es una edicion nueva.
      iframeRef.current?.contentWindow?.postMessage(
        { source: "imin-editor", ...edit },
        targetOrigin,
      );
    }
  }, [bridgeReady, targetOrigin]);

  const applyWidgets = (next: IminWidget[]) => {
    const valid = next.slice(0, 4);
    setWidgets(valid);
    post({ type: "set-widgets", selector: "__imin_widgets__", widgets: valid });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaveState("saving");
    const edits = [...editsRef.current.values()];
    try {
      const res = await fetch(editsEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: projectSlug, edits }),
      });
      if (!res.ok) throw new Error("no se pudo guardar");

      const merged = new Map(savedEditsRef.current.map((edit) => [editKey(edit), edit]));
      for (const edit of edits) merged.set(editKey(edit), edit);
      savedEditsRef.current = [...merged.values()];
      editsRef.current.clear();

      setHasChanges(false);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2500);
      if (pendingMode) {
        setMode(pendingMode);
        setPendingMode(null);
      }
    } catch {
      setSaveState("error");
    }
  };

  const handleDiscard = () => {
    // Revierte los cambios recargando el sitio incrustado.
    if (iframeRef.current) {
      iframeRef.current.src = siteUrl;
    }
    editsRef.current.clear();
    setHasChanges(false);
    if (pendingMode) {
      setMode(pendingMode);
    }
    setPendingMode(null);
  };

  // Avisa al bridge del modo activo (y lo reenvia cuando el bridge anuncia "ready").
  useEffect(() => {
    post({ type: "set-mode", mode });
  }, [mode, post, bridgeReady]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin) {
        return;
      }

      const data = event.data as BridgeMessage;

      if (!data || data.source !== "imin-bridge") {
        return;
      }

      if (data.type === "ready") {
        setBridgeReady(true);
        return;
      }

      if (data.type === "media-selected") {
        pendingMediaRef.current = { selector: data.selector, kind: data.kind };
        if (fileInputRef.current) {
          fileInputRef.current.accept = acceptForKind(data.kind);
          fileInputRef.current.click();
        }
        return;
      }

      // Edicion en linea dentro del sitio: el bridge ya la aplico, aqui solo se
      // registra para poder guardarla y reaplicarla despues.
      if (data.type === "text-changed") {
        const edit: StoredEdit = {
          type: "set-text",
          selector: data.selector,
          value: data.value,
        };
        editsRef.current.set(editKey(edit), edit);
        setHasChanges(true);
        return;
      }

      if (data.type === "text-selected") {
        setTextEditor({ selector: data.selector, value: data.value });
        setTextDraft(data.value);
        setTextTab("description");
        // Arranca el control con el color que el texto ya tiene en el sitio.
        setTextColorValue(cssColorToHex(data.color) ?? "#0455a2");
        setTextColorFill("solid");
        return;
      }

      if (data.type === "color-selected") {
        setStyleEditor({ kind: "color", selector: data.selector });
        return;
      }

      if (data.type === "icon-selected") {
        setStyleEditor({ kind: "icon", selector: data.selector });
        return;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [targetOrigin]);

  const handleMediaFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const pending = pendingMediaRef.current;
    event.target.value = "";
    pendingMediaRef.current = null;

    if (!file || !pending) {
      return;
    }

    if (!isValidFileForKind(file, pending.kind)) {
      window.alert(
        pending.kind === "video"
          ? "Solo se permiten videos en formato mp4."
          : "El archivo seleccionado no es una imagen valida.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        post({
          type: "set-media",
          selector: pending.selector,
          kind: pending.kind,
          src: reader.result,
        });
        setHasChanges(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Modo estilo: pinta el fondo del contenedor seleccionado.
  const applyColor = () => {
    if (!styleEditor || styleEditor.kind !== "color") {
      return;
    }
    post({
      type: "set-color",
      selector: styleEditor.selector,
      colorTarget: "background",
      fill: colorFill,
      color: colorValue,
      colorEnd: colorEndValue,
      direction: gradientDirection,
      opacity: backgroundOpacity,
    });
    setHasChanges(true);
    setStyleEditor(null);
  };

  // Modo textos, pestaña "Descripcion": reemplaza el contenido en el sitio.
  const applyTextValue = () => {
    if (!textEditor) {
      return;
    }
    post({ type: "set-text", selector: textEditor.selector, value: textDraft });
    setHasChanges(true);
    setTextEditor(null);
  };

  // Modo textos, pestaña "Color". No cierra el panel, para poder ajustar el
  // color varias veces sin tener que reseleccionar el texto.
  const applyTextColor = () => {
    if (!textEditor) {
      return;
    }
    post({
      type: "set-color",
      selector: textEditor.selector,
      colorTarget: "text",
      fill: textColorFill,
      color: textColorValue,
      colorEnd: textColorEndValue,
      direction: textGradientDirection,
    });
    setHasChanges(true);
    setTextEditor(null);
  };

  // Pide los iconos al servidor cuando cambia la libreria o la busqueda.
  //
  // Va con debounce para no disparar una peticion por tecla, y descarta las
  // respuestas que llegan tarde si el usuario ya cambio de criterio.
  useEffect(() => {
    if (styleEditor?.kind !== "icon" || iconLib === "curated") {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) {
        return;
      }
      setLibLoading(true);
      const params = new URLSearchParams({ lib: iconLib, q: iconQuery.trim() });

      fetch(`/api/imin/icons?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("fallo"))))
        .then((data: { icons: RemoteIcon[]; total: number; limit: number }) => {
          if (cancelled) {
            return;
          }
          setLibIcons(data.icons);
          setLibTotal(data.total);
          setLibLimit(data.limit);
        })
        .catch(() => {
          if (!cancelled) {
            setLibIcons([]);
            setLibTotal(0);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLibLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [iconLib, iconQuery, styleEditor]);

  // Filtra el catalogo por nombre, categoria o palabras clave. Sin busqueda
  // devuelve todo, agrupado como esta definido.
  const visibleIconCategories = (() => {
    const query = iconQuery.trim().toLowerCase();
    if (!query) {
      return ICON_CATEGORIES;
    }
    return ICON_CATEGORIES.map(({ category, icons }) => ({
      category,
      icons: icons.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          entry.keywords.includes(query) ||
          entry.lib.includes(query) ||
          category.toLowerCase().includes(query),
      ),
    })).filter(({ icons }) => icons.length > 0);
  })();

  const applyIcon = (svgMarkup: string) => {
    if (!styleEditor || styleEditor.kind !== "icon") {
      return;
    }
    post({ type: "set-icon", selector: styleEditor.selector, svg: svgMarkup });
    setHasChanges(true);
    setStyleEditor(null);
  };

  const modeHelpText =
    mode === "text"
      ? "Modo edición de textos: la navegación esta pausada. Haz clic sobre un texto existente para editarlo."
      : mode === "media"
        ? "Modo edición de medios: la navegación esta pausada. Haz clic en una imagen o video para reemplazarlo (los videos solo aceptan mp4)."
        : mode === "style"
          ? "Modo colores e iconos: la navegación esta pausada. Haz clic en un icono para cambiarlo o en cualquier elemento para pintar su color."
          : mode === "widgets"
            ? "Agrega, ordena o elimina secciones administradas dentro del sitio real."
          : "Navegación activa: haz clic en cualquier parte del sitio para interactuar con el.";

  const workspaceSectionDescription =
    mode === "text"
      ? "Edita textos, tipografía y color."
      : mode === "media"
        ? "Reemplaza imágenes, fondos y videos."
      : mode === "style"
          ? "Personaliza colores, degradados e iconos."
          : mode === "widgets"
            ? "Agrega y organiza secciones del sitio."
          : "Explora e interactúa con el sitio.";

  return (
    <div
      className={cn(
        "min-h-0 flex-1 px-4 py-4 sm:px-6 sm:py-5",
        variant === "panel" ? "flex flex-col overflow-hidden p-0 sm:p-0" : "overflow-y-auto",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleMediaFileChange}
      />

      {variant === "demo" ? (
        <>
          <p className="text-center text-3xl my-3 font-semibold text-amber-400">
            {demoTitle}
          </p>
          <p className="mb-3 text-center text-sm text-slate-500 text-bold">
            {demoDescription}
          </p>
        </>
      ) : null}
      <div
        className={cn(
          "rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4",
          variant === "panel" &&
            "flex min-h-0 flex-1 flex-col rounded-none border-0 bg-white p-2 sm:p-2",
        )}
      >
        <div
          className={cn(
            "mb-3 flex gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            variant === "panel"
              ? "mb-2 flex-col items-stretch gap-2"
              : "items-center justify-between overflow-x-auto",
          )}
        >
          <div
            className={cn(
              "inline-flex w-fit shrink-0 items-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              variant === "panel" && "p-0.5",
            )}
          >
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const active = mode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => requestMode(option.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] transition",
                    variant === "panel" && "px-2.5 py-1 text-[0.62rem] tracking-[0.14em]",
                    active
                      ? "bg-[#0455a2] text-white"
                      : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-3 w-3 pr-1 text-blue-300" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center gap-1",
              variant === "panel" &&
                "order-first w-full justify-end border-b border-slate-200 pb-2",
            )}
          >
            {variant === "panel" ? (
              <p
                title={workspaceSectionDescription}
                className="mr-auto min-w-0 flex-1 truncate pr-3 text-[0.68rem] uppercase tracking-[0.16em] text-slate-500"
              >
                {workspaceSectionDescription}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canSave || saveState === "saving"}
              title={canSave ? undefined : "Disponible con el paquete IMIN"}
              onClick={() => void handleSave()}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] transition",
                variant === "panel" && "px-2.5 py-0.5 text-[0.62rem] tracking-[0.14em]",
                canSave
                  ? "border-[#0455a2] bg-[#0455a2] text-white hover:bg-[#03407a] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
              )}
            >
              {saveState === "saving"
                ? "Guardando..."
                : saveState === "saved"
                  ? "Cambios guardados"
                  : saveState === "error"
                    ? "Error al guardar"
                    : "Guardar cambios"}
            </button>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 whitespace-nowrap bg-slate-100 text-blue-400",
                variant === "panel" && "px-2 py-0.5 tracking-[0.18em]",
              )}
            >
              <button
                type="button"
                onClick={() => window.open(siteUrl, "_blank", "noopener,noreferrer")}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-500 cursor-pointer"
              >
                <Monitor className={cn("mr-2 h-3.5 w-3.5", variant === "panel" && "mr-1 h-3 w-3")} />
                {siteName}
              </button>
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 whitespace-nowrap bg-amber-50 font-bold tracking-[0.18em] text-yellow-600",
                variant === "panel" && "px-2 py-0.5 tracking-[0.14em]",
              )}
            >
              <FaCircle className="mr-2 h-2 w-2 animate-pulse text-yellow-600" />
              IMIN
            </Badge>
          </div>
        </div>

        {variant === "demo" ? (
          <p className="my-3 text-center text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">
            {modeHelpText}
          </p>
        ) : null}
        {mode === "widgets" ? (
          <div className="mb-2 grid max-h-56 shrink-0 gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_1fr]">
            <div className="min-h-0 overflow-y-auto">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Agregar widget</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4">
                {WIDGETS.map((widget) => {
                  const Icon = widget.icon;
                  return <button key={widget.id} type="button" disabled={widgets.length >= 4} onClick={() => applyWidgets([...widgets, { id: `${widget.id}-${Date.now().toString(36)}`, type: widget.id }].slice(0, 4))} className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-left text-[0.65rem] text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35"><Icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{widget.name}</span><Plus className="ml-auto h-3 w-3 shrink-0" /></button>;
                })}
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto border-t border-slate-100 pt-2 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Secciones agregadas · {widgets.length}/4</p>
              {widgets.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">Todavia no hay widgets administrados.</p> : <div className="space-y-1">{widgets.map((widget, index) => {
                const definition = WIDGETS.find((item) => item.id === widget.type);
                return <div key={widget.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600"><span className="min-w-0 flex-1 truncate">{definition?.name ?? widget.type}</span><button type="button" disabled={index === 0} onClick={() => { const next = [...widgets]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; applyWidgets(next); }} className="disabled:opacity-25" aria-label="Subir"><ChevronUp className="h-3.5 w-3.5" /></button><button type="button" disabled={index === widgets.length - 1} onClick={() => { const next = [...widgets]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; applyWidgets(next); }} className="disabled:opacity-25" aria-label="Bajar"><ChevronDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => applyWidgets(widgets.filter((item) => item.id !== widget.id))} className="text-rose-500" aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button></div>;
              })}</div>}
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "mx-auto w-full max-w-336 overflow-hidden rounded-2xl shadow-[0_30px_120px_rgba(0,0,0,0.3)]",
            variant === "panel" &&
              "min-h-0 max-w-none flex-1 rounded-lg border border-slate-200 shadow-none",
          )}
        >
          <iframe
            ref={iframeRef}
            src={siteUrl}
            title={siteName}
            className={cn(
              "block w-full border-0 bg-white",
              variant === "panel" ? "h-full" : "h-[90vh]",
            )}
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setBridgeReady(false)}
          />
        </div>

      </div>

      {pendingMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_32px_100px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5 sm:p-7">
            <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <span className="text-lg font-semibold">!</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Cambios sin guardar
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Hiciste cambios en el sitio. ¿Deseas guardarlos antes de volver al
              modo navegacion?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={!canSave || saveState === "saving"}
                title={canSave ? undefined : "Disponible con el paquete IMIN"}
                onClick={() => void handleSave()}
                className={cn(
                  "w-full rounded-full px-4 py-2 text-sm font-medium transition",
                  canSave
                    ? "bg-[#0455a2] text-white hover:bg-[#03407a] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    : "cursor-not-allowed bg-slate-100 text-slate-400",
                )}
              >
                {saveState === "saving" ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Descartar cambios
              </button>
              <button
                type="button"
                onClick={() => setPendingMode(null)}
                className="w-full px-4 py-2 text-sm text-slate-400 transition hover:text-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Panel de textos: escribir y pintar viven en pestañas separadas. */}
      {mode === "text" && textEditor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_32px_100px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5 sm:p-7">
            <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#0455a2] ring-1 ring-blue-100">
              <Type className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Cambiar texto</h3>
            <p className="mt-2 text-sm text-slate-500">
              Edita el contenido o el color del texto seleccionado.
            </p>

            <div className="mt-5 inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 p-1">
              {(["description", "color"] as TextTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTextTab(tab)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    textTab === tab ? "bg-[#0455a2] text-white" : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {tab === "description" ? "Descripcion" : "Color"}
                </button>
              ))}
            </div>

            {textTab === "description" ? (
              <>
                <textarea
                  value={textDraft}
                  onChange={(event) => setTextDraft(event.target.value)}
                  rows={4}
                  className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm outline-none transition focus:border-[#0455a2] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={applyTextValue}
                  className="mt-4 w-full rounded-full bg-[#0455a2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#03407a]"
                >
                  Aplicar
                </button>
              </>
            ) : (
              <>
                <div className="mt-4 inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 p-1">
                  {(["solid", "gradient"] as ColorFill[]).map((fill) => (
                    <button
                      key={fill}
                      type="button"
                      onClick={() => setTextColorFill(fill)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition",
                        textColorFill === fill
                          ? "bg-[#0455a2] text-white"
                          : "text-slate-500 hover:bg-slate-100",
                      )}
                    >
                      {fill === "solid" ? "Solido" : "Degradado"}
                    </button>
                  ))}
                </div>

                <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm text-slate-600">
                    {textColorFill === "gradient" ? "Color inicial" : "Color"}
                  </span>
                  <input
                    type="color"
                    value={textColorValue}
                    onChange={(event) => setTextColorValue(event.target.value)}
                    className="imin-color-input h-10 w-10 cursor-pointer rounded-full border border-slate-200 bg-white p-0.5"
                  />
                </label>

                {textColorFill === "gradient" ? (
                  <>
                    <label className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                      <span className="text-sm text-slate-600">Color final</span>
                      <input
                        type="color"
                        value={textColorEndValue}
                        onChange={(event) => setTextColorEndValue(event.target.value)}
                        className="imin-color-input h-10 w-10 cursor-pointer rounded-full border border-slate-200 bg-white p-0.5"
                      />
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-4">
                      {GRADIENT_DIRECTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTextGradientDirection(value)}
                          className={cn(
                            "rounded-xl px-2 py-1.5 text-[0.65rem] font-medium transition",
                            textGradientDirection === value
                              ? "bg-[#0455a2] text-white"
                              : "text-slate-500 hover:bg-slate-100",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="mt-4 rounded-2xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Vista previa</p>
                  <span
                    className="mt-2 inline-block max-w-full break-words text-2xl font-bold"
                    style={
                      textColorFill === "gradient"
                        ? {
                            backgroundImage: `linear-gradient(to ${gradientCssDirection(textGradientDirection)}, ${textColorValue}, ${textColorEndValue})`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }
                        : { color: textColorValue }
                    }
                  >
                    {textDraft || "Texto de ejemplo"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={applyTextColor}
                  className="mt-4 w-full rounded-full bg-[#0455a2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#03407a]"
                >
                  Aplicar
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}


      {styleEditor?.kind === "color" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_32px_100px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5 sm:p-7">
            <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
              <Palette className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Cambiar fondo</h3>
            <p className="mt-2 text-sm text-slate-500">
              Elige el fondo del contenedor seleccionado. Para cambiar el color de un texto usa el
              modo “Editar textos”.
            </p>

            <div className="mt-4 inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 p-1">
              {(["solid", "gradient"] as ColorFill[]).map((fill) => (
                <button
                  key={fill}
                  type="button"
                  onClick={() => setColorFill(fill)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    colorFill === fill
                      ? "bg-[#0455a2] text-white"
                      : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {fill === "solid" ? "Solido" : "Degradado"}
                </button>
              ))}
            </div>

            <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-600">
                {colorFill === "gradient" ? "Color inicial" : "Color"}
              </span>
              <input
                type="color"
                value={colorValue}
                onChange={(event) => setColorValue(event.target.value)}
                className="imin-color-input h-10 w-10 cursor-pointer rounded-full border border-slate-200 bg-white p-0.5"
              />
            </label>

            {colorFill === "gradient" ? (
              <>
                <label className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm text-slate-600">Color final</span>
                  <input
                    type="color"
                    value={colorEndValue}
                    onChange={(event) => setColorEndValue(event.target.value)}
                    className="imin-color-input h-10 w-10 cursor-pointer rounded-full border border-slate-200 bg-white p-0.5"
                  />
                </label>

                <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-4">
                  {GRADIENT_DIRECTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGradientDirection(value)}
                      className={cn(
                        "rounded-xl px-2 py-1.5 text-[0.65rem] font-medium transition",
                        gradientDirection === value
                          ? "bg-[#0455a2] text-white"
                          : "text-slate-500 hover:bg-slate-100",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <label className="mt-3 block rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <span className="flex items-center justify-between gap-3 text-sm text-slate-600">
                <span>Opacidad</span>
                <span className="font-medium tabular-nums text-slate-900">{backgroundOpacity}%</span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={backgroundOpacity}
                onChange={(event) => setBackgroundOpacity(Number(event.target.value))}
                className="mt-3 h-2 w-full cursor-pointer accent-[#0455a2]"
              />
            </label>

            {/* Vista previa: refleja exactamente lo que aplicara el bridge. */}
            <div className="mt-4 rounded-2xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Vista previa</p>
              <div
                className="mt-1 h-12 rounded-xl"
                style={
                  colorFill === "gradient"
                    ? {
                        backgroundImage: `linear-gradient(to ${gradientCssDirection(gradientDirection)}, ${colorWithOpacity(colorValue, backgroundOpacity)}, ${colorWithOpacity(colorEndValue, backgroundOpacity)})`,
                      }
                    : { backgroundColor: colorWithOpacity(colorValue, backgroundOpacity) }
                }
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={applyColor}
                className="w-full rounded-full bg-[#0455a2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#03407a]"
              >
                Aplicar fondo
              </button>
              <button
                type="button"
                onClick={() => setStyleEditor(null)}
                className="w-full px-4 py-2 text-sm text-slate-400 transition hover:text-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {styleEditor?.kind === "icon" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_32px_100px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5 sm:p-7">
            <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <Palette className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Elegir icono</h3>
            <p className="mt-2 text-sm text-slate-500">
              Selecciona el icono con el que quieres reemplazar el actual.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <select
                value={iconLib}
                onChange={(event) => setIconLib(event.target.value)}
                className="w-full min-w-0 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-[#0455a2]"
              >
                <option value="curated">Sugeridos (por tema)</option>
                {ICON_LIBRARIES.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.label} — {library.note}
                  </option>
                ))}
              </select>

              <input
                type="search"
                value={iconQuery}
                onChange={(event) => setIconQuery(event.target.value)}
                placeholder={
                  iconLib === "curated" ? "Buscar: llanta, envio, garantia..." : "Buscar: car, wrench, arrow..."
                }
                className="w-full min-w-0 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-[#0455a2]"
              />
            </div>

            {iconLib !== "curated" ? (
              <p className="mt-2 text-xs text-slate-400">
                {libLoading
                  ? "Buscando..."
                  : `${libTotal} iconos${
                      libTotal > libLimit ? ` · mostrando ${libLimit}, refina la busqueda` : ""
                    } · los nombres estan en ingles`}
              </p>
            ) : null}

            <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1">
              {iconLib !== "curated" ? (
                libLoading && libIcons.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Cargando iconos...</p>
                ) : libIcons.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Sin resultados para “{iconQuery}”.
                  </p>
                ) : (
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
                    {/* El SVG lo genera nuestro endpoint desde react-icons; no
                        proviene de entrada del usuario. */}
                    {libIcons.map((icon) => (
                      <button
                        key={icon.name}
                        type="button"
                        title={`${icon.name} · ${iconLib}`}
                        dangerouslySetInnerHTML={{ __html: icon.svg }}
                        onClick={() => applyIcon(icon.svg)}
                        className="flex aspect-square items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:border-[#0455a2] hover:bg-slate-50 hover:text-[#0455a2]"
                      />
                    ))}
                  </div>
                )
              ) : visibleIconCategories.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Sin resultados para “{iconQuery}”.
                </p>
              ) : (
                visibleIconCategories.map(({ category, icons }) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                      {category}
                    </p>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
                      {icons.map(({ name, lib, Icon }) => (
                        <button
                          key={category + name}
                          type="button"
                          title={`${name} · ${lib}`}
                          onClick={(event) => {
                            const svg = event.currentTarget.querySelector("svg");
                            if (svg) {
                              applyIcon(svg.outerHTML);
                            }
                          }}
                          className="flex aspect-square items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:border-[#0455a2] hover:bg-slate-50 hover:text-[#0455a2]"
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setStyleEditor(null)}
              className="mt-5 w-full px-4 py-2 text-sm text-slate-400 transition hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Configuracion estable de la demostracion publica de /imin. */
export default function IminTutorialWorkspace() {
  return <IminWorkspace variant="demo" />;
}
