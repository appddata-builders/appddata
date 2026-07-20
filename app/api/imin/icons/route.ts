import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Busca iconos en react-icons y devuelve su SVG listo para inyectar.
 *
 * Existe para que el editor IMIN ofrezca las ~52,000 opciones de react-icons
 * sin pagarlas en el bundle del navegador. Un intento previo de importarlas con
 * import() dinamico en el cliente llevo la carga inicial de /imin de 827 KB a
 * 20 MB, porque el bundler no separo los chunks.
 *
 * No se usa react-dom/server (Next 16 lo prohibe en route handlers): en vez de
 * renderizar, se lee la definicion de cada icono del fuente de react-icons, que
 * tiene forma estable `function Nombre (props) { return GenIcon({...})(props); }`,
 * y se serializa el arbol a SVG.
 */

const LIBRARIES = new Set([
  "ai", "bi", "bs", "cg", "ci", "di", "fa", "fa6", "fc", "fi", "gi", "go", "gr",
  "hi", "hi2", "im", "io", "io5", "lia", "lu", "md", "pi", "ri", "rx", "si",
  "sl", "tb", "tfi", "ti", "vsc", "wi",
]);

const MAX_LIMIT = 240;

type IconNode = { tag: string; attr?: Record<string, string>; child?: IconNode[] };

const ICON_PATTERN =
  /function\s+([A-Z][A-Za-z0-9]*)\s*\(props\)\s*\{\s*return\s+GenIcon\((\{[\s\S]*?\})\)\(props\);/g;

// Atributos SVG que conservan mayusculas; el resto pasa de camelCase a kebab.
const PRESERVE_CASE = new Set([
  "viewBox", "preserveAspectRatio", "gradientTransform", "gradientUnits",
  "patternContentUnits", "patternUnits", "patternTransform", "baseFrequency",
  "numOctaves", "spreadMethod", "clipPathUnits", "maskUnits", "maskContentUnits",
  "primitiveUnits", "filterUnits", "markerWidth", "markerHeight", "markerUnits",
  "refX", "refY", "textLength", "lengthAdjust", "startOffset", "pathLength",
  "stdDeviation", "tableValues", "xChannelSelector", "yChannelSelector",
]);

function toSvgAttrName(name: string): string {
  if (PRESERVE_CASE.has(name)) {
    return name;
  }
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function serialize(node: IconNode): string {
  const attrs = Object.entries(node.attr ?? {})
    .map(([key, value]) => `${toSvgAttrName(key)}="${escapeAttr(String(value))}"`)
    .join(" ");
  const children = (node.child ?? []).map(serialize).join("");
  return `<${node.tag}${attrs ? " " + attrs : ""}>${children}</${node.tag}>`;
}

// Replica los valores por defecto que aplica IconBase en react-icons.
function toSvgMarkup(node: IconNode, size: number): string {
  const root: IconNode = {
    ...node,
    attr: {
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0",
      ...(node.attr ?? {}),
      height: String(size),
      width: String(size),
      xmlns: "http://www.w3.org/2000/svg",
    },
  };
  return serialize(root);
}

// Se ubica node_modules en runtime, subiendo desde el directorio de trabajo.
// Hacerlo con require.resolve fallaba: el bundler intentaba resolverlo en build
// y react-icons no expone su package.json en el campo exports.
let cachedRoot: string | null | undefined;

function findReactIconsRoot(): string | null {
  if (cachedRoot !== undefined) {
    return cachedRoot;
  }

  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, "node_modules", "react-icons");
    if (existsSync(candidate)) {
      cachedRoot = candidate;
      return cachedRoot;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      cachedRoot = null;
      return cachedRoot;
    }
    dir = parent;
  }
}

// Las definiciones son inmutables: se parsean una vez por libreria y quedan en
// memoria del proceso.
const libraryCache = new Map<string, Map<string, string>>();

async function getLibrary(lib: string) {
  const cached = libraryCache.get(lib);
  if (cached) {
    return cached;
  }

  const packageRoot = findReactIconsRoot();
  if (!packageRoot) {
    throw new Error("no se encontro react-icons en node_modules");
  }
  const source = await readFile(path.join(packageRoot, lib, "index.mjs"), "utf8");

  const definitions = new Map<string, string>();
  for (const match of source.matchAll(ICON_PATTERN)) {
    definitions.set(match[1], match[2]);
  }

  libraryCache.set(lib, definitions);
  return definitions;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lib = url.searchParams.get("lib")?.trim() ?? "";
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!LIBRARIES.has(lib)) {
    return Response.json({ error: "libreria desconocida" }, { status: 400 });
  }

  let definitions: Map<string, string>;
  try {
    definitions = await getLibrary(lib);
  } catch {
    return Response.json({ error: "no se pudo leer la libreria" }, { status: 500 });
  }

  const names = query
    ? [...definitions.keys()].filter((name) => name.toLowerCase().includes(query))
    : [...definitions.keys()];

  const icons: { name: string; svg: string }[] = [];
  for (const name of names.slice(0, MAX_LIMIT)) {
    try {
      icons.push({ name, svg: toSvgMarkup(JSON.parse(definitions.get(name)!), 20) });
    } catch {
      // Un icono con forma inesperada se omite en vez de tumbar la busqueda.
    }
  }

  return Response.json(
    { lib, total: names.length, limit: MAX_LIMIT, icons },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
