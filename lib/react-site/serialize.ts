/**
 * Utilidades para emitir codigo JSX/TSX legible a partir de datos.
 *
 * El generador arma componentes React como texto: las paginas se componen
 * invocando `<Widget prop="valor" .../>`. Estas funciones serializan valores de
 * JS (strings, numeros, objetos de estilo, arrays de datos) a fragmentos de
 * codigo fuente validos y editables a mano.
 */

/** Marca un valor para emitirse tal cual (expresion JS cruda) dentro del literal. */
export type RawExpr = { __raw: string };
export const raw = (expr: string): RawExpr => ({ __raw: expr });
const isRaw = (value: unknown): value is RawExpr =>
  typeof value === "object" && value !== null && "__raw" in value;

/** Escapa un string para un literal JS con comillas dobles. */
function jsString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** Convierte cualquier valor a un literal de codigo JS/TSX (recursivo). */
export function toJsLiteral(value: unknown, indent = 2): string {
  if (isRaw(value)) return value.__raw;
  if (value === null || value === undefined) return "undefined";
  if (typeof value === "string") return jsString(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const pad = " ".repeat(indent);
  const padEnd = " ".repeat(Math.max(0, indent - 2));
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((item) => `${pad}${toJsLiteral(item, indent + 2)}`).join(",\n");
    return `[\n${items},\n${padEnd}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    const body = entries
      .map(([key, v]) => `${pad}${isIdentifier(key) ? key : jsString(key)}: ${toJsLiteral(v, indent + 2)}`)
      .join(",\n");
    return `{\n${body},\n${padEnd}}`;
  }
  return "undefined";
}

function isIdentifier(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

/** Un atributo JSX de string: `name="valor"` o `name={"con \"comillas\""}` si hace falta. */
export function attr(name: string, value: string): string {
  if (value === "") return "";
  if (/["\\\n{}<>]/.test(value)) return ` ${name}={${jsString(value)}}`;
  return ` ${name}="${value}"`;
}

/** Un atributo JSX de expresion: `name={expr}` (objeto de estilo, array, numero, bool). */
export function exprAttr(name: string, value: unknown): string {
  if (value === undefined) return "";
  return ` ${name}={${toJsLiteral(value)}}`;
}

/** Texto para hijos JSX: seguro ante `{`, `}`, `<`. */
export function jsxText(value: string): string {
  if (value === "") return "";
  if (/[{}<>]/.test(value)) return `{${jsString(value)}}`;
  return value;
}

/** Serializa un objeto de estilo React (`CSSProperties`) a literal, o undefined si vacio. */
export function styleLiteral(style: Record<string, string | number> | undefined): RawExpr | undefined {
  if (!style || Object.keys(style).length === 0) return undefined;
  return raw(toJsLiteral(style));
}
