/**
 * Genera los componentes Navbar y Footer del sitio, con el contenido de chrome
 * (logo, enlaces, columnas, redes, mapa) ya resuelto y horneado como datos
 * dentro de cada componente.
 */

import {
  NAV_CONTENT,
  NAV_CONTENT_DEFAULTS,
  PAGES,
  pageLabel,
  type BuildPlanId,
  type Doc,
  type NavMode,
  type PageId,
  type TemplateTokens,
} from "@/app/components/build/build-model";
import type { GeneratedFile } from "@/lib/generated-site";
import { backgroundStyle, safeImageUrl, safeUrl, SOCIAL_GLYPHS, type Content } from "@/lib/react-site/content";
import { toJsLiteral } from "@/lib/react-site/serialize";

const DEFAULT_LOGO = "/brand-plane.png";

function chromeReader(content: Content) {
  return (key: string): string => content[key] ?? NAV_CONTENT_DEFAULTS[key] ?? "";
}

function anchorOf(page: PageId): string {
  return PAGES.find((p) => p.id === page)?.anchor ?? page;
}

function hrefFor(page: PageId, navMode: NavMode): string {
  if (navMode === "single") return `#${anchorOf(page)}`;
  return page === "home" ? "/" : `/${page}`;
}

function contactHref(navMode: NavMode): string {
  return navMode === "single" ? "#contacto" : "/contact";
}

/* -------------------------------- Navbar -------------------------------- */

export function navbarFile(name: string, doc: Doc, content: Content, navMode: NavMode): GeneratedFile {
  const getChrome = chromeReader(content);
  const links = PAGES.map((page) => ({ href: hrefFor(page.id, navMode), label: pageLabel(doc, page.id) }));
  const cta = doc.navbarVariant === "cta" ? { href: contactHref(navMode), label: getChrome(NAV_CONTENT.cta) } : null;

  const logoValue = getChrome(NAV_CONTENT.logo);
  const logoUrl = logoValue && logoValue !== DEFAULT_LOGO ? safeImageUrl(logoValue) : "";
  const brand = JSON.stringify(name);
  const logo = logoUrl
    ? `<img data-imin-key="${NAV_CONTENT.logo}" src=${JSON.stringify(logoUrl)} alt={${brand}} className="h-9 w-auto object-contain" />`
    : `<strong className="text-lg font-bold">{${brand}}</strong>`;

  const centered = doc.navbarVariant === "centered";
  const headerClass =
    "sticky top-0 z-20 flex items-center gap-8 border-b border-muted/20 bg-nav px-[max(5vw,1rem)] py-4 text-nav-ink" +
    (centered ? " md:flex-col" : "");
  const navDesktop = centered ? "md:mx-auto" : "md:ml-auto";
  const linkClass = doc.navbarVariant === "minimal" || centered ? "hover:text-accent" : "hover:text-accent";

  const source = `"use client";

import { useState } from "react";

const links: { href: string; label: string }[] = ${toJsLiteral(links)};
const cta: { href: string; label: string } | null = ${cta ? toJsLiteral(cta) : "null"};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="${headerClass}">
      ${logo}
      <button type="button" onClick={() => setOpen(!open)} aria-label="Abrir menu" className="ml-auto text-2xl md:hidden">
        {"\\u2630"}
      </button>
      <nav
        className={
          (open ? "flex" : "hidden") +
          " absolute left-0 right-0 top-full flex-col gap-4 border-b border-muted/20 bg-nav p-4 ${navDesktop} md:static md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0"
        }
      >
        {links.map((link) => (
          <a key={link.href} href={link.href} className="${linkClass}">
            {link.label}
          </a>
        ))}
        {cta ? (
          <a href={cta.href} data-imin-key="${NAV_CONTENT.cta}" className="rounded-[calc(var(--radius)/2)] bg-accent px-4 py-2 text-white">
            {cta.label}
          </a>
        ) : null}
      </nav>
    </header>
  );
}
`;
  return { path: "components/Navbar.tsx", body: source };
}

/* -------------------------------- Footer -------------------------------- */

type Social = { glyph: string; url: string };

function resolveSocials(content: Content): Social[] {
  const seen = new Set<string>();
  const out: Social[] = [];
  for (let i = 0; i < 4; i += 1) {
    if (content[`chrome:footer:social:${i}:enabled`] === "false") continue;
    const icon = content[`chrome:footer:social:${i}:icon`] ?? NAV_CONTENT_DEFAULTS[`chrome:footer:social:${i}:icon`] ?? "";
    const url = content[`chrome:footer:social:${i}:url`] ?? NAV_CONTENT_DEFAULTS[`chrome:footer:social:${i}:url`] ?? "#";
    if (!icon || seen.has(icon)) continue;
    seen.add(icon);
    out.push({ glyph: SOCIAL_GLYPHS[icon] ?? "•", url: safeUrl(url) });
  }
  return out.slice(0, 4);
}

export function footerFile(doc: Doc, content: Content, navMode: NavMode, tokens: TemplateTokens): GeneratedFile {
  const getChrome = chromeReader(content);
  const brand = getChrome(NAV_CONTENT.brand);
  const socials = resolveSocials(content);
  const bg = backgroundStyle(content[NAV_CONTENT.footerBg], tokens.footerBg);

  const isCompact = doc.footerVariant === "simple" || doc.footerVariant === "social";
  const columns = [NAV_CONTENT.c1, NAV_CONTENT.c2, NAV_CONTENT.c3].map((key, i) => ({
    key,
    title: getChrome(key),
    links: [PAGES[i % 4], PAGES[(i + 2) % 4]].map((page) => ({ href: hrefFor(page.id, navMode), label: pageLabel(doc, page.id) })),
  }));
  const newsletterLabel = doc.footerVariant === "newsletter" ? getChrome(NAV_CONTENT.newsletter) : "";
  const mapSrc =
    doc.footerVariant === "map"
      ? `https://www.google.com/maps?q=${encodeURIComponent(getChrome(NAV_CONTENT.mapQuery))}&output=embed`
      : "";

  const socialsBlock = `<div className="flex gap-2">
        {socials.map((social, i) => (
          <a key={i} href={social.url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 font-extrabold">
            {social.glyph}
          </a>
        ))}
      </div>`;

  const compactInner = `<div className="mx-auto flex w-full max-w-[1050px] flex-col items-start gap-6 md:flex-row md:items-center">
        <strong data-imin-key="${NAV_CONTENT.brand}" className="text-lg">{${JSON.stringify(brand)}}</strong>
        <div className="md:ml-auto">
          ${socialsBlock}
        </div>
      </div>`;

  const mapBlock = mapSrc
    ? `<iframe title="Mapa" loading="lazy" src=${JSON.stringify(mapSrc)} className="mx-auto mb-8 block h-[250px] w-full max-w-[1050px] rounded-[var(--radius)] border-0" />`
    : "";
  const newsletterBlock = newsletterLabel
    ? `<form className="grid gap-2">
          <label data-imin-key="${NAV_CONTENT.newsletter}">{${JSON.stringify(newsletterLabel)}}</label>
          <div className="flex gap-2">
            <input type="email" placeholder="tu@email.com" className="flex-1 rounded-[calc(var(--radius)/2)] border border-white/25 bg-white/10 p-2 text-footer-ink" />
            <button type="button" className="rounded-[calc(var(--radius)/2)] bg-accent px-4 text-white">Enviar</button>
          </div>
        </form>`
    : "";

  const richInner = `${mapBlock}
      <div className="mx-auto grid w-full max-w-[1050px] items-start gap-8 md:grid-cols-[auto_1fr_1fr]">
        <strong data-imin-key="${NAV_CONTENT.brand}" className="text-lg">{${JSON.stringify(brand)}}</strong>
        <div className="flex flex-wrap gap-8">
          {columns.map((column, i) => (
            <div key={i}>
              <strong data-imin-key={column.key} className="mb-1 block">{column.title}</strong>
              {column.links.map((link, j) => (
                <a key={j} href={link.href} className="block text-sm opacity-65 hover:opacity-100">
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        ${newsletterBlock}
        ${socialsBlock}
      </div>`;

  const inner = isCompact ? compactInner : richInner;
  const needsColumns = !isCompact;

  const source = `const socials = ${toJsLiteral(socials)};
${needsColumns ? `const columns = ${toJsLiteral(columns)};\n` : ""}const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="px-[max(5vw,1.25rem)] pb-5 pt-14 text-footer-ink" style={${toJsLiteral(bg)}}>
      ${inner}
      <p className="mt-8 text-center text-xs opacity-50">{"\\u00a9 " + year + " "}{${JSON.stringify(brand)}}</p>
    </footer>
  );
}
`;
  return { path: "components/Footer.tsx", body: source };
}
