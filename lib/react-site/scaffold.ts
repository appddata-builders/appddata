/**
 * Archivos de andamiaje del proyecto Next.js generado: configuracion, tema
 * (globals.css con Tailwind v4) y layout raiz. Equivale a lo que produce
 * `npx create-next-app` mas la integracion de Tailwind, pero con el tema del
 * sitio ya inyectado.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { GeneratedFile } from "@/lib/generated-site";
import type { PlanMeta, TemplateTokens } from "@/app/components/build/build-model";

/** URL base de la app (para que el sitio lea su contenido editable). */
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://appddata.com").replace(/\/$/, "");
const CONTENT_ENDPOINT = `${APP_URL}/api/public/site-content`;

/** Lee el bridge de IMIN del repo para incrustarlo en el sitio generado. */
function readBridgeScript(): string {
  try {
    return readFileSync(join(process.cwd(), "imin-bridge", "imin-editor-bridge.js"), "utf8");
  } catch {
    return "/* IMIN bridge no disponible en build */\n";
  }
}

/**
 * Hidratador publico: en una visita normal (no dentro del editor) lee el
 * contenido editable del sitio por API y lo aplica sobre los `data-imin-key`
 * (textos e imagenes) y las ediciones por selector (color/icono/medios). Asi
 * los cambios guardados en IMIN se ven sin volver a desplegar.
 */
const HYDRATOR = `(function () {
  "use strict";
  if (window.self !== window.top) return; // dentro del editor lo maneja el bridge
  var slug = window.IMIN_SLUG, base = window.IMIN_CONTENT_URL;
  if (!slug || !base) return;

  function applyTexts(texts) {
    var nodes = document.querySelectorAll("[data-imin-key]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], key = el.getAttribute("data-imin-key");
      if (!key || !Object.prototype.hasOwnProperty.call(texts, key)) continue;
      var value = texts[key];
      if (el.tagName === "IMG") el.setAttribute("src", value);
      else el.textContent = value;
    }
  }

  function applyEdit(edit) {
    if (!edit || !edit.selector) return;
    var el = document.querySelector(edit.selector);
    if (!el) return;
    if (edit.type === "set-text" && typeof edit.value === "string") {
      el.textContent = edit.value;
    } else if (edit.type === "set-media" && edit.src) {
      if (edit.kind === "background") el.style.backgroundImage = "url(" + edit.src + ")";
      else if (el.tagName === "IMG") el.setAttribute("src", edit.src);
      else { var img = el.querySelector("img"); if (img) img.setAttribute("src", edit.src); }
    } else if (edit.type === "set-color" && edit.color) {
      var paint = edit.fill === "gradient" && edit.colorEnd
        ? "linear-gradient(" + (edit.direction === "left" ? "to left" : "to right") + "," + edit.color + "," + edit.colorEnd + ")"
        : edit.color;
      if (edit.colorTarget === "background") el.style.background = paint;
      else el.style.color = edit.color;
    } else if (edit.type === "set-icon" && edit.svg) {
      el.innerHTML = edit.svg;
    }
  }

  fetch(base + "?slug=" + encodeURIComponent(slug), { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      if (data.texts) applyTexts(data.texts);
      if (Array.isArray(data.edits)) data.edits.forEach(applyEdit);
    })
    .catch(function () {});
})();
`;

function packageName(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "sitio-appddata";
}

/** package.json de un proyecto Next.js + Tailwind v4. */
function packageJson(projectName: string): string {
  return (
    JSON.stringify(
      {
        name: packageName(projectName),
        version: "1.0.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "^15.1.0",
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          "react-icons": "^5.6.0",
        },
        devDependencies: {
          "@tailwindcss/postcss": "^4.0.0",
          "@types/node": "^20",
          "@types/react": "^19",
          "@types/react-dom": "^19",
          postcss: "^8",
          tailwindcss: "^4.0.0",
          typescript: "^5",
        },
      },
      null,
      2,
    ) + "\n"
  );
}

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sitio estatico: 'next build' genera la carpeta out/ con HTML plano.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
`;

const POSTCSS_CONFIG = `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./*"] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  },
  null,
  2,
) + "\n";

const GITIGNORE = `# dependencias
node_modules

# build de Next
/.next
/out

# entorno
.env*

# generados
next-env.d.ts
*.tsbuildinfo
.DS_Store
`;

const NETLIFY_TOML = `[build]
  command = "npm run build"
  publish = "out"
`;

function readme(projectName: string): string {
  return `# ${projectName}

Sitio generado con Appddata como proyecto **Next.js + Tailwind CSS**, listo para editar.

## Desarrollo local

\`\`\`bash
npm install
npm run dev
\`\`\`

Abre http://localhost:3000.

## Estructura

- \`app/\` — rutas y layout (App Router).
- \`components/\` — Navbar, Footer y cada widget como componente editable.
- \`app/globals.css\` — Tailwind y el tema del sitio (colores, radio, tipografias).

## Editar el contenido

El texto y las imagenes viven en las paginas de \`app/\` (se pasan como props a
cada componente). La estructura y el estilo de cada seccion viven en su
componente dentro de \`components/widgets/\`.

## Deploy

El repositorio esta pensado para desplegarse en Netlify (build \`npm run build\`).
Cada push reconstruye el sitio.
`;
}

/** Devuelve un CSS var de tipografia sin comillas problematicas para el bloque @theme. */
function fontStack(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** URL css2 de Google Fonts para las familias de titulo y cuerpo del sitio. */
function googleFontsImport(tokens: TemplateTokens): string {
  const families = Array.from(new Set([tokens.titleFont, tokens.bodyFont].filter(Boolean)));
  if (families.length === 0) return "";
  const fam = families.map((f) => `family=${f.replace(/\s+/g, "+")}:wght@400;600;700`).join("&");
  return `@import url("https://fonts.googleapis.com/css2?${fam}&display=swap");\n`;
}

/** app/globals.css: Tailwind v4 + tema del sitio via @theme. */
function globalsCss(tokens: TemplateTokens, accent: PlanMeta): string {
  const filter = tokens.grayscale ? "\n  filter: grayscale(1);" : "";
  return `${googleFontsImport(tokens)}@import "tailwindcss";

@theme {
  --color-surface: ${tokens.surface};
  --color-surface-alt: ${tokens.surfaceAlt};
  --color-ink: ${tokens.ink};
  --color-muted: ${tokens.muted};
  --color-accent: ${accent.accent};
  --color-accent-ink: ${accent.accentText};
  --color-nav: ${tokens.navBg};
  --color-nav-ink: ${tokens.navInk};
  --color-footer: ${tokens.footerBg};
  --color-footer-ink: ${tokens.footerInk};
  --radius: ${tokens.radius}px;
  --title-weight: ${tokens.titleWeight};
  --font-title: ${fontStack(tokens.titleFamily)};
  --font-body: ${fontStack(tokens.bodyFamily)};
}

@layer base {
  html {
    scroll-behavior: smooth;${filter}
  }

  body {
    font-family: var(--font-body);
    line-height: 1.55;
  }

  h1,
  h2,
  h3 {
    font-family: var(--font-title);
    font-weight: var(--title-weight);
    line-height: 1.12;
  }
}
`;
}

/** app/layout.tsx: layout raiz con Navbar + contenido + Footer + IMIN. */
function layoutTsx(projectName: string, slug: string): string {
  const title = projectName.replace(/"/g, '\\"');
  const config = `window.IMIN_SLUG=${JSON.stringify(slug)};window.IMIN_CONTENT_URL=${JSON.stringify(CONTENT_ENDPOINT)};`;
  return `import type { Metadata } from "next";
import type { ReactNode } from "react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "${title}",
  description: "${title}",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-surface text-ink antialiased">
        <Navbar />
        {children}
        <Footer />
        {/* IMIN: bridge para editar dentro del editor + hidratador para reflejar los cambios guardados. */}
        <script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(config)} }} />
        <script src="/imin-editor-bridge.js" defer />
        <script src="/imin-hydrate.js" defer />
      </body>
    </html>
  );
}
`;
}

/** Todos los archivos de andamiaje (independientes de los widgets colocados). */
export function scaffoldFiles(projectName: string, slug: string, tokens: TemplateTokens, accent: PlanMeta): GeneratedFile[] {
  return [
    { path: "package.json", body: packageJson(projectName) },
    { path: "next.config.mjs", body: NEXT_CONFIG },
    { path: "postcss.config.mjs", body: POSTCSS_CONFIG },
    { path: "tsconfig.json", body: TSCONFIG },
    { path: ".gitignore", body: GITIGNORE },
    { path: "netlify.toml", body: NETLIFY_TOML },
    { path: "README.md", body: readme(projectName) },
    { path: "app/globals.css", body: globalsCss(tokens, accent) },
    { path: "app/layout.tsx", body: layoutTsx(projectName, slug) },
    { path: "public/imin-editor-bridge.js", body: readBridgeScript() },
    { path: "public/imin-hydrate.js", body: HYDRATOR },
  ];
}
