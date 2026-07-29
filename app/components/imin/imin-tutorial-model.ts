export type TutorialTab = "editar" | "paleta" | "publicar";

export type EditTool = "texto" | "imagenes" | "iconos";
export type BlocksTool = "agregar-bloque" | "animacion" | "multimedia";
export const paletteToolIds = ["neutral", "grafito", "oceano", "bosque", "terracota"] as const;
export type PaletteTool = (typeof paletteToolIds)[number];
export type PublishTool = "resumen";
export type TutorialTool = EditTool | BlocksTool | PaletteTool | PublishTool;

export type TutorialElementKind =
  | "text"
  | "image"
  | "icon"
  | "section"
  | "media";

export type TutorialElement = {
  id: string;
  kind: TutorialElementKind;
  title: string;
  description: string;
};

export type HomeTextId =
  | "nav-el-1"
  | "nav-el-2"
  | "nav-el-3"
  | "nav-el-4"
  | "nav-cta-1"
  | "hero-el-1"
  | "hero-el-2"
  | "hero-el-3"
  | "body-el-1"
  | "body-el-2"
  | "body-el-3"
  | "body-el-4"
  | "body-el-5"
  | "footer-el-1"
  | "footer-el-2";

export type HomeTextMap = Record<HomeTextId, string>;

export type HomeImageId = "hero-img-1" | "gallery-img-1" | "gallery-img-2" | "gallery-img-3";
export type HomeImageMap = Record<HomeImageId, string>;

export type IconOptionId =
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "x"
  | "whatsapp"
  | "tiktok";

export type HomeIconId = "footer-icon-1" | "footer-icon-2" | "footer-icon-3";
export type HomeIconMap = Record<HomeIconId, IconOptionId>;

export type PalettePreset = PaletteTool;

export const palettePresets: Record<
  PalettePreset,
  {
    label: string;
    description: string;
    swatches: [string, string, string];
    colors: {
      previewBg: string;
      line: string;
      surface: string;
      surfaceAlt: string;
      card: string;
      text: string;
      muted: string;
      navBg: string;
      navMuted: string;
      heroCardBg: string;
      heroCardLine: string;
      heroEyebrow: string;
      heroTitle: string;
      heroBody: string;
      accent: string;
      accentSoft: string;
      accentInk: string;
      footerBg: string;
      footerText: string;
      footerMuted: string;
      iconBorder: string;
      labelBg: string;
      labelText: string;
    };
  }
> = {
  neutral: {
    label: "Neutral",
    description: "Base editorial clara con acento calido para interfaces limpias.",
    swatches: ["#ebe7dc", "#171717", "#589bf9"],
    colors: {
      previewBg: "#ebe7dc",
      line: "rgba(80, 71, 54, 0.14)",
      surface: "#ffffff",
      surfaceAlt: "#f8f6ef",
      card: "#ffffff",
      text: "#171717",
      muted: "#5d5952",
      navBg: "#fbfaf6",
      navMuted: "#585654",
      heroCardBg: "rgba(0, 0, 0, 0.18)",
      heroCardLine: "rgba(255, 255, 255, 0.12)",
      heroEyebrow: "#f9d36d",
      heroTitle: "#ffffff",
      heroBody: "rgba(255, 255, 255, 0.78)",
      accent: "#589bf9",
      accentSoft: "rgba(255, 137, 4, 0.12)",
      accentInk: "#a14d00",
      footerBg: "#0a1020",
      footerText: "#ffffff",
      footerMuted: "rgba(255, 255, 255, 0.72)",
      iconBorder: "rgba(255, 255, 255, 0.12)",
      labelBg: "rgba(214, 209, 198, 0.7)",
      labelText: "#58544d",
    },
  },
  grafito: {
    label: "Grafito",
    description: "Neutros oscuros y acento azul para un tono premium corporativo.",
    swatches: ["#171a1f", "#eff3f6", "#5da9ff"],
    colors: {
      previewBg: "#1b2027",
      line: "rgba(226, 232, 240, 0.12)",
      surface: "#11161d",
      surfaceAlt: "#171d25",
      card: "#202833",
      text: "#eff3f6",
      muted: "#aeb8c4",
      navBg: "#10151b",
      navMuted: "#cad4de",
      heroCardBg: "rgba(7, 11, 18, 0.48)",
      heroCardLine: "rgba(255, 255, 255, 0.18)",
      heroEyebrow: "#93c5fd",
      heroTitle: "#ffffff",
      heroBody: "rgba(239, 243, 246, 0.82)",
      accent: "#5da9ff",
      accentSoft: "rgba(93, 169, 255, 0.16)",
      accentInk: "#9ed0ff",
      footerBg: "#090d12",
      footerText: "#eff3f6",
      footerMuted: "rgba(239, 243, 246, 0.72)",
      iconBorder: "rgba(255, 255, 255, 0.14)",
      labelBg: "rgba(54, 65, 79, 0.74)",
      labelText: "#e2e8f0",
    },
  },
  oceano: {
    label: "Océano",
    description: "Azules profundos y cian para sitios tecnologicos de alto contraste.",
    swatches: ["#e8f7fb", "#0f3950", "#31c4d8"],
    colors: {
      previewBg: "#dff4f8",
      line: "rgba(19, 94, 117, 0.18)",
      surface: "#f6fdff",
      surfaceAlt: "#eaf8fb",
      card: "#ffffff",
      text: "#113b4b",
      muted: "#456775",
      navBg: "#f7feff",
      navMuted: "#456775",
      heroCardBg: "rgba(6, 36, 48, 0.45)",
      heroCardLine: "rgba(223, 244, 248, 0.24)",
      heroEyebrow: "#7ee7f3",
      heroTitle: "#ffffff",
      heroBody: "rgba(240, 253, 255, 0.82)",
      accent: "#31c4d8",
      accentSoft: "rgba(49, 196, 216, 0.18)",
      accentInk: "#0f7382",
      footerBg: "#0f3950",
      footerText: "#f5fdff",
      footerMuted: "rgba(245, 253, 255, 0.72)",
      iconBorder: "rgba(245, 253, 255, 0.16)",
      labelBg: "rgba(205, 232, 237, 0.72)",
      labelText: "#255162",
    },
  },
  bosque: {
    label: "Bosque",
    description: "Verdes sobrios y arena para marcas naturales o wellness.",
    swatches: ["#f0efe8", "#18372d", "#5f9f74"],
    colors: {
      previewBg: "#ece9df",
      line: "rgba(58, 84, 67, 0.16)",
      surface: "#fbfaf4",
      surfaceAlt: "#f3f0e6",
      card: "#ffffff",
      text: "#193126",
      muted: "#5f6f64",
      navBg: "#f7f5ee",
      navMuted: "#56655c",
      heroCardBg: "rgba(16, 36, 28, 0.44)",
      heroCardLine: "rgba(255, 255, 255, 0.16)",
      heroEyebrow: "#b9e3a4",
      heroTitle: "#ffffff",
      heroBody: "rgba(247, 250, 244, 0.82)",
      accent: "#5f9f74",
      accentSoft: "rgba(95, 159, 116, 0.16)",
      accentInk: "#3d6e4f",
      footerBg: "#18372d",
      footerText: "#f4f7f2",
      footerMuted: "rgba(244, 247, 242, 0.72)",
      iconBorder: "rgba(244, 247, 242, 0.16)",
      labelBg: "rgba(213, 218, 204, 0.72)",
      labelText: "#435347",
    },
  },
  terracota: {
    label: "Terracota",
    description: "Warm neutrals y rojizos suaves para sitios lifestyle y hospitality.",
    swatches: ["#f4e6dc", "#6f2f22", "#d77a50"],
    colors: {
      previewBg: "#f0dfd3",
      line: "rgba(111, 47, 34, 0.16)",
      surface: "#fffaf6",
      surfaceAlt: "#f8ede5",
      card: "#ffffff",
      text: "#47241c",
      muted: "#7b6157",
      navBg: "#fff8f4",
      navMuted: "#7b6157",
      heroCardBg: "rgba(50, 18, 14, 0.42)",
      heroCardLine: "rgba(255, 255, 255, 0.16)",
      heroEyebrow: "#ffd0b0",
      heroTitle: "#fff7f2",
      heroBody: "rgba(255, 247, 242, 0.82)",
      accent: "#d77a50",
      accentSoft: "rgba(215, 122, 80, 0.16)",
      accentInk: "#9d4a25",
      footerBg: "#6f2f22",
      footerText: "#fff7f2",
      footerMuted: "rgba(255, 247, 242, 0.72)",
      iconBorder: "rgba(255, 247, 242, 0.16)",
      labelBg: "rgba(232, 211, 198, 0.78)",
      labelText: "#6e4a3c",
    },
  },
};

export function isPaletteTool(tool: TutorialTool): tool is PaletteTool {
  return paletteToolIds.includes(tool as PaletteTool);
}

export const tutorialTabs: {
  id: TutorialTab;
  label: string;
  tools: { id: TutorialTool; label: string; description: string }[];
}[] = [
  {
    id: "editar",
    label: "Editar",
    tools: [
      {
        id: "texto",
        label: "Texto",
        description: "Edita titulares, subtítulos y mensajes clave del inicio.",
      },
      {
        id: "imagenes",
        label: "Imágenes",
        description: "Inserta o sustituye elementos visuales dentro del contenido.",
      },
      {
        id: "iconos",
        label: "Iconos",
        description: "Agrega apoyos visuales para beneficios o características.",
      },
    ],
  },
  {
    id: "paleta",
    label: "Paleta",
    tools: [
      {
        id: "neutral",
        label: "Neutral",
        description: palettePresets.neutral.description,
      },
      {
        id: "grafito",
        label: "Grafito",
        description: palettePresets.grafito.description,
      },
      {
        id: "oceano",
        label: "Océano",
        description: palettePresets.oceano.description,
      },
      {
        id: "bosque",
        label: "Bosque",
        description: palettePresets.bosque.description,
      },
      {
        id: "terracota",
        label: "Terracota",
        description: palettePresets.terracota.description,
      },
    ],
  },
  {
    id: "publicar",
    label: "Publicar",
    tools: [
      {
        id: "resumen",
        label: "Resumen",
        description: "Revisa el inicio listo para publicarse.",
      },
    ],
  },
];

export const heroImage =
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80";

export const galleryImages = [
  "https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
];

export const defaultHomeImages: HomeImageMap = {
  "hero-img-1": heroImage,
  "gallery-img-1": galleryImages[0],
  "gallery-img-2": galleryImages[1],
  "gallery-img-3": galleryImages[2],
};

export const iconOptions: { id: IconOptionId; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "tiktok", label: "TikTok" },
];

export const defaultHomeIcons: HomeIconMap = {
  "footer-icon-1": "instagram",
  "footer-icon-2": "facebook",
  "footer-icon-3": "youtube",
};

export const defaultHomeTexts: HomeTextMap = {
  "nav-el-1": "Inicio",
  "nav-el-2": "Producto",
  "nav-el-3": "Galería",
  "nav-el-4": "Contacto",
  "nav-cta-1": "Solicitar demo",
  "hero-el-1": "Contenido",
  "hero-el-2": "Edita el inicio del cliente desde una sola página.",
  "hero-el-3": "Aquí viven el encabezado, el contenido central y todo lo que agregues con las herramientas activas.",
  "body-el-1": "Contenido de Inicio",
  "body-el-2": "Contenido principal del sitio",
  "body-el-3": "La estructura base de Inicio se mantiene ordenada mientras IMIN permite añadir recursos puntuales desde pestañas muy claras.",
  "body-el-4": "Explicación del producto",
  "body-el-5": "Un contenido sencillo para editar textos, imágenes y multimedia.",
  "footer-el-1": "Pie de página",
  "footer-el-2": "Redes, contacto y cierre del inicio.",
};

export function getDefaultTool(tab: TutorialTab): TutorialTool {
  const match = tutorialTabs.find((item) => item.id === tab);
  return match?.tools[0]?.id ?? "texto";
}
