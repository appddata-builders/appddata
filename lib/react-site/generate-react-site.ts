/**
 * Generador de sitios como proyecto Next.js + Tailwind editable.
 *
 * Toma el mismo documento que produce el armador (`{ plan, template, navMode,
 * doc, content }`) y devuelve el arbol de archivos de un proyecto Next.js
 * (App Router) listo para subir a GitHub y construir en Netlify. Cada widget
 * es un componente React editable; las paginas los componen con el contenido
 * real como props.
 */

import {
  BUILD_PLANS,
  PAGES,
  TEMPLATES,
  type BuildPlanId,
  type Doc,
  type Instance,
  type NavMode,
  type PageId,
  type TemplateId,
} from "@/app/components/build/build-model";
import type { GeneratedFile } from "@/lib/generated-site";
import { fieldReader, type Content } from "@/lib/react-site/content";
import { footerFile, navbarFile } from "@/lib/react-site/chrome";
import { scaffoldFiles } from "@/lib/react-site/scaffold";
import { attr, exprAttr } from "@/lib/react-site/serialize";
import { PRIMITIVES_FILE, WIDGET_TEMPLATES, type WidgetContext } from "@/lib/react-site/widget-components";

type SavedDocument = {
  version?: number;
  plan?: BuildPlanId;
  template?: TemplateId;
  navMode?: NavMode;
  doc?: Doc;
  content?: Content;
};

const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/i;

/**
 * Extrae las imagenes subidas (data URLs) a archivos binarios en `public/uploads`
 * y reescribe el contenido para referenciarlas por ruta.
 *
 * Sin esto, una imagen grande se hornea como base64 dentro del .tsx y la Contents
 * API de GitHub rechaza el archivo (400: request malformado / demasiado grande).
 */
function extractImageAssets(content: Content): { content: Content; assets: GeneratedFile[] } {
  const resolved: Content = { ...content };
  const assets: GeneratedFile[] = [];
  let index = 0;
  for (const [key, value] of Object.entries(content)) {
    const match = DATA_IMAGE.exec((value ?? "").trim());
    if (!match) continue;
    const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    const name = `${key.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase()}-${index++}.${ext}`;
    assets.push({ path: `public/uploads/${name}`, body: match[2], encoding: "base64" });
    resolved[key] = `/uploads/${name}`;
  }
  return { content: resolved, assets };
}

const anchorOf = (page: PageId): string => PAGES.find((p) => p.id === page)?.anchor ?? page;
const pageFunctionName = (page: PageId): string =>
  page === "home" ? "HomePage" : `${page.charAt(0).toUpperCase()}${page.slice(1)}Page`;

/** Emite `<Component prop="..." expr={...} />` a partir de un objeto de props. */
function emitElement(component: string, props: Record<string, unknown>, indent: string): string {
  const attrs = Object.entries(props)
    .map(([key, value]) => (typeof value === "string" ? attr(key, value) : exprAttr(key, value)))
    .filter((piece) => piece !== "")
    .join("");
  return `${indent}<${component}${attrs} />`;
}

/** Compone los widgets de un conjunto de instancias en JSX y reune sus componentes. */
function composeInstances(
  instances: Instance[],
  content: Content,
  plan: BuildPlanId,
  tokens: (typeof TEMPLATES)[TemplateId],
  navMode: NavMode,
  indent: string,
): { jsx: string; components: Set<string> } {
  const components = new Set<string>();
  const parts = instances.map((instance) => {
    const template = WIDGET_TEMPLATES[instance.widgetId];
    components.add(template.component);
    const ctx: WidgetContext = {
      iid: instance.iid,
      widget: instance.widgetId,
      get: fieldReader(instance.iid, instance.widgetId, content),
      content,
      plan,
      tokens,
      contactHref: navMode === "single" ? "#contacto" : "/contact",
    };
    return emitElement(template.component, template.buildProps(ctx), indent);
  });
  return { jsx: parts.join("\n"), components };
}

function importsBlock(components: Set<string>): string {
  return [...components]
    .sort()
    .map((name) => `import ${name} from "@/components/widgets/${name}";`)
    .join("\n");
}

const DEFAULT_ICON_REFS = [
  "lu:LuSparkles", "lu:LuLayers", "lu:LuWrench", "lu:LuCalendar", "lu:LuCheck",
  "lu:LuStar", "lu:LuQuote", "lu:LuMail", "lu:LuMapPin", "lu:LuPlay", "lu:LuImage",
];

function reactIconsFile(content: Content): GeneratedFile {
  const refs = new Set(DEFAULT_ICON_REFS);
  for (const value of Object.values(content)) {
    if (/^[a-z0-9]+:[A-Z][A-Za-z0-9]*$/.test(value)) refs.add(value);
  }
  const grouped = new Map<string, string[]>();
  for (const ref of refs) {
    const [lib, name] = ref.split(":");
    grouped.set(lib, [...(grouped.get(lib) ?? []), name]);
  }
  const imports = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([lib, names]) => `import { ${[...new Set(names)].sort().join(", ")} } from "react-icons/${lib}";`)
    .join("\n");
  const entries = [...refs].sort().map((ref) => `  ${JSON.stringify(ref)}: ${ref.split(":")[1]},`).join("\n");
  return {
    path: "components/widgets/react-icons.ts",
    body: `import type { IconType } from "react-icons";\n${imports}\n\nconst ICONS: Record<string, IconType> = {\n${entries}\n};\n\nexport function resolveReactIcon(ref?: string): IconType | undefined {\n  return ref ? ICONS[ref] : undefined;\n}\n`,
  };
}

/** Pagina individual (modo multi): un archivo por ruta. */
function multiPageFile(page: PageId, doc: Doc, content: Content, plan: BuildPlanId, tokens: (typeof TEMPLATES)[TemplateId]): GeneratedFile {
  const { jsx, components } = composeInstances(doc.pages[page] ?? [], content, plan, tokens, "multi", "      ");
  const path = page === "home" ? "app/page.tsx" : `app/${page}/page.tsx`;
  const body = `${importsBlock(components)}${components.size ? "\n\n" : ""}export default function ${pageFunctionName(page)}() {
  return (
    <main id="${anchorOf(page)}">
${jsx}
    </main>
  );
}
`;
  return { path, body };
}

/** Pagina unica (modo single): todas las secciones con anclas. */
function singlePageFile(doc: Doc, content: Content, plan: BuildPlanId, tokens: (typeof TEMPLATES)[TemplateId]): GeneratedFile {
  const components = new Set<string>();
  const sections = PAGES.map((page) => {
    const composed = composeInstances(doc.pages[page.id] ?? [], content, plan, tokens, "single", "        ");
    composed.components.forEach((c) => components.add(c));
    return `      <div id="${anchorOf(page.id)}">
${composed.jsx}
      </div>`;
  }).join("\n");
  const body = `${importsBlock(components)}${components.size ? "\n\n" : ""}export default function Home() {
  return (
    <main>
${sections}
    </main>
  );
}
`;
  return { path: "app/page.tsx", body };
}

export function generateReactSiteFiles(projectName: string, slug: string, raw: unknown): GeneratedFile[] {
  const saved = (raw && typeof raw === "object" ? raw : {}) as SavedDocument;
  const plan: BuildPlanId = saved.plan && saved.plan in BUILD_PLANS ? saved.plan : "beginner";
  const template: TemplateId = saved.template && saved.template in TEMPLATES ? saved.template : "aurora";
  const navMode: NavMode = saved.navMode === "multi" ? "multi" : "single";
  const doc = saved.doc;
  if (!doc?.pages) throw new Error("El preview no contiene un documento de sitio valido.");
  const rawContent = saved.content && typeof saved.content === "object" ? saved.content : {};
  // Las imagenes subidas (data URLs) salen a public/uploads como binarios; el
  // resto del contenido queda igual pero apuntando a esas rutas.
  const { content, assets } = extractImageAssets(rawContent);
  const tokens = TEMPLATES[template];
  const accent = BUILD_PLANS[plan];

  const files: GeneratedFile[] = [
    ...scaffoldFiles(projectName, slug, tokens, accent),
    ...assets,
    navbarFile(projectName, doc, content, navMode),
    footerFile(doc, content, navMode, tokens),
    PRIMITIVES_FILE,
    reactIconsFile(content),
  ];

  // Paginas segun el modo de navegacion.
  if (navMode === "single") {
    files.push(singlePageFile(doc, content, plan, tokens));
  } else {
    for (const page of PAGES) files.push(multiPageFile(page.id, doc, content, plan, tokens));
  }

  // Componentes de los tipos de widget efectivamente usados.
  const usedWidgets = new Set<string>();
  for (const page of PAGES) for (const instance of doc.pages[page.id] ?? []) usedWidgets.add(instance.widgetId);
  for (const widgetId of usedWidgets) {
    const template = WIDGET_TEMPLATES[widgetId as keyof typeof WIDGET_TEMPLATES];
    files.push({ path: template.file, body: template.source });
  }

  return files;
}
