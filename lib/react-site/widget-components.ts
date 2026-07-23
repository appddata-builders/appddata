/**
 * Plantillas de los componentes React de cada widget y la logica para armar sus
 * props a partir del documento del sitio.
 *
 * Cada tipo de widget se emite como un archivo `.tsx` constante (el codigo no
 * cambia entre sitios); lo que varia es el contenido, que la pagina pasa como
 * props. `buildProps` traduce una instancia colocada (iid + content) al objeto
 * de props que se serializa en la pagina.
 *
 * Cada texto/imagen editable lleva `data-imin-key="<iid>:<campo>"`: la misma
 * clave que usa el armador y que se siembra en la base, para que IMIN lo edite
 * por clave y el sitio lo hidrate en runtime. Los componentes reciben `iid` y
 * construyen las claves; los arrays traen la clave por item.
 */

import type { CSSProperties } from "react";

import type { BuildPlanId, TemplateTokens, WidgetId } from "@/app/components/build/build-model";
import type { GeneratedFile } from "@/lib/generated-site";
import {
  backgroundStyle,
  buttonStyle,
  resolveIcon,
  safeImageUrl,
  textStyle,
  type Content,
  type IconSpec,
} from "@/lib/react-site/content";

/* --------------------------- Contexto de armado ------------------------- */

export type WidgetContext = {
  iid: string;
  widget: WidgetId;
  get: (field: string) => string;
  content: Content;
  plan: BuildPlanId;
  tokens: TemplateTokens;
  /** Destino del CTA hacia contacto segun el modo de navegacion. */
  contactHref: string;
};

function styleMap(entries: Record<string, CSSProperties>): Record<string, CSSProperties> | undefined {
  const out: Record<string, CSSProperties> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value && Object.keys(value).length > 0) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const ALT_BG: WidgetId[] = ["text-block", "product-tiers", "stats", "gallery", "promos", "faq"];

function sectionBg(ctx: WidgetContext): CSSProperties {
  const fallback =
    ctx.widget === "cta-banner"
      ? "var(--color-accent)"
      : ctx.widget === "bg-video"
        ? "#020617"
        : ALT_BG.includes(ctx.widget)
          ? ctx.tokens.surfaceAlt
          : ctx.tokens.surface;
  return backgroundStyle(ctx.content[`${ctx.iid}:background`], fallback);
}

function ts(ctx: WidgetContext, field: string, tag: string): CSSProperties {
  return textStyle(ctx.content[`${ctx.iid}:${field}:textStyle`], tag);
}

function iconOf(ctx: WidgetContext, field: string, fallback = "✦"): IconSpec {
  return resolveIcon(ctx.get(field), fallback);
}

/* ------------------------------ Primitivos ------------------------------ */

const PRIMITIVES = `import type { CSSProperties, ReactNode } from "react";

import { resolveReactIcon } from "@/components/widgets/react-icons";

export function Section({ children, style, className = "" }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <section className={"px-[max(5vw,1.25rem)] py-18 " + className} style={style}>
      <div className="mx-auto w-full max-w-[1050px]">{children}</div>
    </section>
  );
}

export function Button({ href, children, style, className = "", dataKey }: { href: string; children: ReactNode; style?: CSSProperties; className?: string; dataKey?: string }) {
  return (
    <a href={href} data-imin-key={dataKey} className={"inline-block px-[1.1rem] py-[0.7rem] font-medium transition-opacity hover:opacity-90 " + className} style={style}>
      {children}
    </a>
  );
}

export function Icon({ glyph, icon }: { glyph: string; icon?: string }) {
  const ReactIcon = resolveReactIcon(icon);
  if (ReactIcon) {
    return <ReactIcon aria-hidden className="mb-3 inline-block h-6 w-6 text-accent" />;
  }
  return (
    <span aria-hidden className="mb-3 inline-grid text-2xl text-accent">
      {glyph}
    </span>
  );
}
`;

/* --------------------------- Fuentes de widgets ------------------------- */

const HERO = `import type { CSSProperties } from "react";

import { Button, Section } from "@/components/widgets/primitives";

type Props = {
  iid: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  ctaHref: string;
  align?: "center" | "left";
  bg?: CSSProperties;
  ctaStyle?: CSSProperties;
  styles?: Record<string, CSSProperties>;
};

export default function Hero({ iid, eyebrow, title, subtitle, cta, ctaHref, align = "center", bg, ctaStyle, styles }: Props) {
  const left = align === "left";
  return (
    <Section style={bg} className={left ? "py-28 text-left" : "py-28 text-center"}>
      {eyebrow ? (
        <p data-imin-key={iid + ":eyebrow"} className="font-bold uppercase tracking-[0.2em] text-accent" style={styles?.eyebrow}>
          {eyebrow}
        </p>
      ) : null}
      <h1 data-imin-key={iid + ":title"} className="mt-2 text-[clamp(2.5rem,7vw,5.5rem)]" style={styles?.title}>
        {title}
      </h1>
      <p data-imin-key={iid + ":subtitle"} className={(left ? "" : "mx-auto ") + "mt-4 max-w-[620px] text-lg text-muted"} style={styles?.subtitle}>
        {subtitle}
      </p>
      {cta ? (
        <Button href={ctaHref} dataKey={iid + ":cta"} className="mt-6" style={ctaStyle}>
          {cta}
        </Button>
      ) : null}
    </Section>
  );
}
`;

const FEATURES = `import type { CSSProperties } from "react";

import { Icon, Section } from "@/components/widgets/primitives";

type Item = { glyph: string; icon?: string; titleKey: string; title?: string; descKey: string; desc?: string };

export default function Features({ items, bg }: { items: Item[]; bg?: CSSProperties }) {
  return (
    <Section style={bg}>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <article key={i} className="rounded-[var(--radius)] border border-muted/20 bg-surface-alt/90 p-6">
            <Icon glyph={item.glyph} icon={item.icon} />
            <h3 data-imin-key={item.titleKey}>{item.title}</h3>
            <p data-imin-key={item.descKey} className="mt-1 text-muted">{item.desc}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
`;

const IMAGE_TEXT = `import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Props = {
  iid: string;
  title?: string;
  body?: string;
  image: string;
  reverse?: boolean;
  bg?: CSSProperties;
  styles?: Record<string, CSSProperties>;
};

export default function ImageText({ iid, title, body, image, reverse, bg, styles }: Props) {
  return (
    <Section style={bg}>
      <div className="grid items-center gap-12 md:grid-cols-2">
        <img data-imin-key={iid + ":image"} src={image} alt="" className={"h-[330px] w-full rounded-[var(--radius)] object-cover " + (reverse ? "md:order-2" : "")} />
        <div>
          <h2 data-imin-key={iid + ":title"} className="text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
            {title}
          </h2>
          <p data-imin-key={iid + ":body"} className="mt-3 text-muted" style={styles?.body}>
            {body}
          </p>
        </div>
      </div>
    </Section>
  );
}
`;

const TEXT_BLOCK = `import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Props = { iid: string; title?: string; body?: string; bg?: CSSProperties; styles?: Record<string, CSSProperties> };

export default function TextBlock({ iid, title, body, bg, styles }: Props) {
  return (
    <Section style={bg} className="text-center">
      <h2 data-imin-key={iid + ":title"} className="text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
        {title}
      </h2>
      <p data-imin-key={iid + ":body"} className="mx-auto mt-3 max-w-[640px] text-lg text-muted" style={styles?.body}>
        {body}
      </p>
    </Section>
  );
}
`;

const PRODUCT_TIERS = `import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Tier = { nameKey: string; name?: string; priceKey: string; price?: string };

export default function ProductTiers({ iid, title, tiers, bg, styles }: { iid: string; title?: string; tiers: Tier[]; bg?: CSSProperties; styles?: Record<string, CSSProperties> }) {
  return (
    <Section style={bg}>
      <h2 data-imin-key={iid + ":title"} className="mb-8 text-center text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier, i) => (
          <article key={i} className="rounded-[var(--radius)] border border-muted/20 bg-surface-alt/90 p-6 text-center">
            <h3 data-imin-key={tier.nameKey}>{tier.name}</h3>
            <strong data-imin-key={tier.priceKey} className="mt-2 block text-3xl text-accent">{tier.price}</strong>
          </article>
        ))}
      </div>
    </Section>
  );
}
`;

const SERVICES = `import type { CSSProperties } from "react";

import { Icon, Section } from "@/components/widgets/primitives";

type Item = { glyph: string; icon?: string; nameKey: string; name?: string; descKey: string; desc?: string };

export default function Services({ iid, title, items, bg, styles }: { iid: string; title?: string; items: Item[]; bg?: CSSProperties; styles?: Record<string, CSSProperties> }) {
  return (
    <Section style={bg}>
      <h2 data-imin-key={iid + ":title"} className="mb-8 text-center text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <article key={i} className="rounded-[var(--radius)] border border-muted/20 bg-surface-alt/90 p-6">
            <Icon glyph={item.glyph} icon={item.icon} />
            <h3 data-imin-key={item.nameKey}>{item.name}</h3>
            <p data-imin-key={item.descKey} className="mt-1 text-muted">{item.desc}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
`;

const STATS = `import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Item = { numberKey: string; number?: string; labelKey: string; label?: string };

export default function Stats({ items, bg }: { items: Item[]; bg?: CSSProperties }) {
  return (
    <Section style={bg}>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <article key={i} className="text-center">
            <strong data-imin-key={item.numberKey} className="block text-3xl text-accent">{item.number}</strong>
            <p data-imin-key={item.labelKey} className="mt-1 text-muted">{item.label}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
`;

const CTA_BANNER = `import type { CSSProperties } from "react";

import { Button, Section } from "@/components/widgets/primitives";

type Props = { iid: string; title?: string; cta?: string; ctaHref: string; bg?: CSSProperties; ctaStyle?: CSSProperties; styles?: Record<string, CSSProperties> };

export default function CtaBanner({ iid, title, cta, ctaHref, bg, ctaStyle, styles }: Props) {
  return (
    <Section style={bg}>
      <div className="flex flex-col items-start gap-6 text-white md:flex-row md:items-center">
        <h2 data-imin-key={iid + ":title"} className="text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
          {title}
        </h2>
        {cta ? (
          <Button href={ctaHref} dataKey={iid + ":cta"} className="md:ml-auto" style={ctaStyle}>
            {cta}
          </Button>
        ) : null}
      </div>
    </Section>
  );
}
`;

const CAROUSEL = `"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Slide = { key: string; src: string };

export default function Carousel({ images, bg }: { images: Slide[]; bg?: CSSProperties }) {
  const [index, setIndex] = useState(0);
  const go = (delta: number) => setIndex((prev) => (prev + delta + images.length) % images.length);
  return (
    <Section style={bg}>
      <div className="relative h-[420px]">
        {images.map((slide, i) => (
          <img key={i} data-imin-key={slide.key} src={slide.src} alt="" className={"h-full w-full rounded-[var(--radius)] object-cover " + (i === index ? "block" : "hidden")} />
        ))}
        <button type="button" onClick={() => go(-1)} aria-label="Anterior" className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-2xl text-slate-900">
          {"\\u2039"}
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Siguiente" className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-2xl text-slate-900">
          {"\\u203a"}
        </button>
      </div>
    </Section>
  );
}
`;

const GALLERY = `import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Img = { key: string; src: string };

export default function Gallery({ images, bg }: { images: Img[]; bg?: CSSProperties }) {
  return (
    <Section style={bg}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {images.map((img, i) => (
          <img key={i} data-imin-key={img.key} src={img.src} alt="" className="aspect-square w-full rounded-[var(--radius)] object-cover" />
        ))}
      </div>
    </Section>
  );
}
`;

const BG_IMAGE = `type Props = { iid: string; image: string; caption?: string };

export default function BgImage({ iid, image, caption }: Props) {
  return (
    <section className="relative h-[480px]">
      <img data-imin-key={iid + ":image"} src={image} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-12">
        <p data-imin-key={iid + ":caption"} className="text-xl text-white">{caption}</p>
      </div>
    </section>
  );
}
`;

const BG_VIDEO = `import type { CSSProperties } from "react";

import { Icon, Section } from "@/components/widgets/primitives";

type Props = { iid: string; title?: string; icon: { glyph: string; icon?: string }; bg?: CSSProperties };

export default function BgVideo({ iid, title, icon, bg }: Props) {
  return (
    <Section style={bg} className="text-white">
      <div className="py-16 text-center">
        <Icon glyph={icon.glyph} icon={icon.icon} />
        <h3 data-imin-key={iid + ":title"}>{title}</h3>
      </div>
    </Section>
  );
}
`;

const BLOG = `import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Post = { imageKey: string; image: string; titleKey: string; title?: string; excerptKey: string; excerpt?: string };

export default function Blog({ iid, title, posts, bg, styles }: { iid: string; title?: string; posts: Post[]; bg?: CSSProperties; styles?: Record<string, CSSProperties> }) {
  return (
    <Section style={bg}>
      <h2 data-imin-key={iid + ":title"} className="mb-8 text-center text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {posts.map((post, i) => (
          <article key={i} className="overflow-hidden rounded-[var(--radius)] border border-muted/20 bg-surface-alt/90">
            <img data-imin-key={post.imageKey} src={post.image} alt="" className="h-[180px] w-full object-cover" />
            <div className="p-5">
              <h3 data-imin-key={post.titleKey}>{post.title}</h3>
              <p data-imin-key={post.excerptKey} className="mt-1 text-muted">{post.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
`;

const PROMOS = `import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Item = { tagKey: string; tag?: string; titleKey: string; title?: string; descKey: string; desc?: string };

export default function Promos({ iid, title, items, bg, styles }: { iid: string; title?: string; items: Item[]; bg?: CSSProperties; styles?: Record<string, CSSProperties> }) {
  return (
    <Section style={bg}>
      <h2 data-imin-key={iid + ":title"} className="mb-8 text-center text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
        {title}
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item, i) => (
          <article key={i} className="relative rounded-[var(--radius)] border border-muted/20 bg-surface-alt/90 p-6 pt-8 text-center">
            <span data-imin-key={item.tagKey} className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-sm font-extrabold text-white">{item.tag}</span>
            <h3 data-imin-key={item.titleKey}>{item.title}</h3>
            <p data-imin-key={item.descKey} className="mt-1 text-muted">{item.desc}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
`;

const TESTIMONIALS = `import type { CSSProperties } from "react";

import { Icon, Section } from "@/components/widgets/primitives";

type Item = { glyph: string; icon?: string; quoteKey: string; quote?: string; authorKey: string; author?: string };

export default function Testimonials({ iid, title, items, bg, styles }: { iid: string; title?: string; items: Item[]; bg?: CSSProperties; styles?: Record<string, CSSProperties> }) {
  return (
    <Section style={bg}>
      <h2 data-imin-key={iid + ":title"} className="mb-8 text-center text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <article key={i} className="rounded-[var(--radius)] border border-muted/20 bg-surface-alt/90 p-6">
            <Icon glyph={item.glyph} icon={item.icon} />
            <p data-imin-key={item.quoteKey} className="text-muted">{item.quote}</p>
            <strong data-imin-key={item.authorKey} className="mt-4 block text-accent">{item.author}</strong>
          </article>
        ))}
      </div>
    </Section>
  );
}
`;

const FAQ = `import type { CSSProperties } from "react";

import { Section } from "@/components/widgets/primitives";

type Item = { qKey: string; q?: string; aKey: string; a?: string };

export default function Faq({ iid, title, items, bg, styles }: { iid: string; title?: string; items: Item[]; bg?: CSSProperties; styles?: Record<string, CSSProperties> }) {
  return (
    <Section style={bg}>
      <h2 data-imin-key={iid + ":title"} className="mb-8 text-center text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
        {title}
      </h2>
      <div className="mx-auto w-full max-w-[760px]">
        {items.map((item, i) => (
          <details key={i} className="my-3 rounded-[var(--radius)] border border-muted/20 bg-surface p-4">
            <summary data-imin-key={item.qKey} className="cursor-pointer font-bold">{item.q}</summary>
            <p data-imin-key={item.aKey} className="mt-2 text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
`;

const CONTACT = `"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

import { Button, Section } from "@/components/widgets/primitives";

type Props = {
  iid: string;
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  sendStyle?: CSSProperties;
  bg?: CSSProperties;
  styles?: Record<string, CSSProperties>;
};

export default function Contact({ iid, title, subtitle, email, phone, address, sendStyle, bg, styles }: Props) {
  const [sent, setSent] = useState(false);
  const inputClass = "w-full rounded-[calc(var(--radius)/2)] border border-muted/35 bg-surface p-3 text-ink";
  return (
    <Section style={bg}>
      <div className="grid items-start gap-12 md:grid-cols-2">
        <div>
          <h2 data-imin-key={iid + ":title"} className="text-[clamp(1.8rem,4vw,3rem)]" style={styles?.title}>
            {title}
          </h2>
          <p data-imin-key={iid + ":subtitle"} className="mt-3 text-muted" style={styles?.subtitle}>
            {subtitle}
          </p>
          <address className="mt-6 not-italic text-muted">
            <span data-imin-key={iid + ":email"}>{email}</span>
            <br />
            <span data-imin-key={iid + ":phone"}>{phone}</span>
            <br />
            <span data-imin-key={iid + ":address"}>{address}</span>
          </address>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
        >
          <input required placeholder="Nombre" className={inputClass} />
          <input required type="email" placeholder="Correo" className={inputClass} />
          <textarea required placeholder="Mensaje" className={inputClass + " min-h-[130px]"} />
          <Button href="#" className="text-center" style={sendStyle}>
            Enviar
          </Button>
          {sent ? <small className="text-accent">Mensaje enviado.</small> : null}
        </form>
      </div>
    </Section>
  );
}
`;

/* ------------------------------ Registro -------------------------------- */

type WidgetTemplate = {
  component: string;
  file: string;
  source: string;
  buildProps: (ctx: WidgetContext) => Record<string, unknown>;
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const k = (ctx: WidgetContext, field: string) => `${ctx.iid}:${field}`;

export const WIDGET_TEMPLATES: Record<WidgetId, WidgetTemplate> = {
  hero: {
    component: "Hero",
    file: "components/widgets/Hero.tsx",
    source: HERO,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      eyebrow: ctx.get("eyebrow"),
      title: ctx.get("title"),
      subtitle: ctx.get("subtitle"),
      cta: ctx.get("cta"),
      ctaHref: ctx.contactHref,
      align: ctx.tokens.heroAlign,
      bg: sectionBg(ctx),
      ctaStyle: buttonStyle(ctx.content[`${ctx.iid}:cta:style`], ctx.plan, ctx.tokens.radius),
      styles: styleMap({ eyebrow: ts(ctx, "eyebrow", "p"), title: ts(ctx, "title", "h1"), subtitle: ts(ctx, "subtitle", "p") }),
    }),
  },
  features: {
    component: "Features",
    file: "components/widgets/Features.tsx",
    source: FEATURES,
    buildProps: (ctx) => ({
      bg: sectionBg(ctx),
      items: range(3).map((i) => ({ ...iconOf(ctx, `icon${i}`), titleKey: k(ctx, `f${i}t`), title: ctx.get(`f${i}t`), descKey: k(ctx, `f${i}d`), desc: ctx.get(`f${i}d`) })),
    }),
  },
  "image-text": {
    component: "ImageText",
    file: "components/widgets/ImageText.tsx",
    source: IMAGE_TEXT,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      body: ctx.get("body"),
      image: safeImageUrl(ctx.get("image")),
      reverse: ctx.get("layout") === "image-right",
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2"), body: ts(ctx, "body", "p") }),
    }),
  },
  "text-block": {
    component: "TextBlock",
    file: "components/widgets/TextBlock.tsx",
    source: TEXT_BLOCK,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      body: ctx.get("body"),
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2"), body: ts(ctx, "body", "p") }),
    }),
  },
  "product-tiers": {
    component: "ProductTiers",
    file: "components/widgets/ProductTiers.tsx",
    source: PRODUCT_TIERS,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      tiers: range(3).map((i) => ({ nameKey: k(ctx, `t${i}name`), name: ctx.get(`t${i}name`), priceKey: k(ctx, `t${i}price`), price: ctx.get(`t${i}price`) })),
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2") }),
    }),
  },
  services: {
    component: "Services",
    file: "components/widgets/Services.tsx",
    source: SERVICES,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      items: range(3).map((i) => ({ ...iconOf(ctx, `serviceIcon${i}`, "✓"), nameKey: k(ctx, `s${i}name`), name: ctx.get(`s${i}name`), descKey: k(ctx, `s${i}desc`), desc: ctx.get(`s${i}desc`) })),
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2") }),
    }),
  },
  stats: {
    component: "Stats",
    file: "components/widgets/Stats.tsx",
    source: STATS,
    buildProps: (ctx) => ({
      items: range(3).map((i) => ({ numberKey: k(ctx, `n${i}`), number: ctx.get(`n${i}`), labelKey: k(ctx, `l${i}`), label: ctx.get(`l${i}`) })),
      bg: sectionBg(ctx),
    }),
  },
  "cta-banner": {
    component: "CtaBanner",
    file: "components/widgets/CtaBanner.tsx",
    source: CTA_BANNER,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      cta: ctx.get("cta"),
      ctaHref: ctx.contactHref,
      bg: sectionBg(ctx),
      ctaStyle: buttonStyle(ctx.content[`${ctx.iid}:cta:style`], ctx.plan, ctx.tokens.radius, true),
      styles: styleMap({ title: ts(ctx, "title", "h2") }),
    }),
  },
  carousel: {
    component: "Carousel",
    file: "components/widgets/Carousel.tsx",
    source: CAROUSEL,
    buildProps: (ctx) => ({
      images: range(3).map((i) => ({ key: k(ctx, `image${i}`), src: safeImageUrl(ctx.get(`image${i}`)) })),
      bg: sectionBg(ctx),
    }),
  },
  gallery: {
    component: "Gallery",
    file: "components/widgets/Gallery.tsx",
    source: GALLERY,
    buildProps: (ctx) => ({
      images: range(6).map((i) => ({ key: k(ctx, `g${i}`), src: safeImageUrl(ctx.get(`g${i}`)) })),
      bg: sectionBg(ctx),
    }),
  },
  "bg-image": {
    component: "BgImage",
    file: "components/widgets/BgImage.tsx",
    source: BG_IMAGE,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      image: safeImageUrl(ctx.get("image")),
      caption: ctx.get("caption"),
    }),
  },
  "bg-video": {
    component: "BgVideo",
    file: "components/widgets/BgVideo.tsx",
    source: BG_VIDEO,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      icon: iconOf(ctx, "playIcon", "▶"),
      bg: sectionBg(ctx),
    }),
  },
  blog: {
    component: "Blog",
    file: "components/widgets/Blog.tsx",
    source: BLOG,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      posts: range(3).map((i) => ({ imageKey: k(ctx, `p${i}img`), image: safeImageUrl(ctx.get(`p${i}img`)), titleKey: k(ctx, `p${i}t`), title: ctx.get(`p${i}t`), excerptKey: k(ctx, `p${i}e`), excerpt: ctx.get(`p${i}e`) })),
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2") }),
    }),
  },
  promos: {
    component: "Promos",
    file: "components/widgets/Promos.tsx",
    source: PROMOS,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      items: range(3).map((i) => ({ tagKey: k(ctx, `o${i}tag`), tag: ctx.get(`o${i}tag`), titleKey: k(ctx, `o${i}t`), title: ctx.get(`o${i}t`), descKey: k(ctx, `o${i}d`), desc: ctx.get(`o${i}d`) })),
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2") }),
    }),
  },
  testimonials: {
    component: "Testimonials",
    file: "components/widgets/Testimonials.tsx",
    source: TESTIMONIALS,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      items: range(3).map((i) => ({ ...iconOf(ctx, `quoteIcon${i}`, "❝"), quoteKey: k(ctx, `q${i}`), quote: ctx.get(`q${i}`), authorKey: k(ctx, `a${i}`), author: ctx.get(`a${i}`) })),
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2") }),
    }),
  },
  faq: {
    component: "Faq",
    file: "components/widgets/Faq.tsx",
    source: FAQ,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      items: range(3).map((i) => ({ qKey: k(ctx, `q${i}`), q: ctx.get(`q${i}`), aKey: k(ctx, `a${i}`), a: ctx.get(`a${i}`) })),
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2") }),
    }),
  },
  contact: {
    component: "Contact",
    file: "components/widgets/Contact.tsx",
    source: CONTACT,
    buildProps: (ctx) => ({
      iid: ctx.iid,
      title: ctx.get("title"),
      subtitle: ctx.get("subtitle"),
      email: ctx.get("email"),
      phone: ctx.get("phone"),
      address: ctx.get("address"),
      sendStyle: buttonStyle(ctx.content[`${ctx.iid}:send:style`], ctx.plan, ctx.tokens.radius),
      bg: sectionBg(ctx),
      styles: styleMap({ title: ts(ctx, "title", "h2"), subtitle: ts(ctx, "subtitle", "p") }),
    }),
  },
};

/** El archivo de primitivos compartidos (Section, Button, Icon). */
export const PRIMITIVES_FILE: GeneratedFile = {
  path: "components/widgets/primitives.tsx",
  body: PRIMITIVES,
};
