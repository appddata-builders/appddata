import {
  BUILD_PLANS,
  NAV_CONTENT,
  NAV_CONTENT_DEFAULTS,
  PAGES,
  TEMPLATES,
  WIDGET_DEFAULTS,
  type BuildPlanId,
  type Doc,
  type NavMode,
  type PageId,
  type TemplateId,
  type WidgetId,
} from "@/app/components/build/build-model";

type Content = Record<string, string>;
type SavedDocument = { version?: number; plan?: BuildPlanId; template?: TemplateId; navMode?: NavMode; doc?: Doc; content?: Content };
export type GeneratedFile = { path: string; body: string };

const pageNames: Record<PageId, string> = { home: "Home", about: "About", productos: "Productos", contact: "Contact" };
const anchors: Record<PageId, string> = { home: "inicio", about: "nosotros", productos: "productos", contact: "contacto" };
const gradientDirection: Record<string, string> = { right: "to right", br: "135deg", bottom: "to bottom", bl: "225deg", left: "to left", tl: "315deg", top: "to top", tr: "45deg" };

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
const attr = (value: unknown) => esc(value).replace(/`/g, "&#96;");
const safeUrl = (value: string, fallback = "#") => /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value.trim()) ? attr(value.trim()) : fallback;
const safeImageUrl = (value: string, fallback = "") => /^(https?:\/\/|\/)/i.test(value.trim()) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value.trim()) ? attr(value.trim()) : fallback;
const parse = <T>(raw: string | undefined, fallback: T): T => { try { return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; } };

function pageLabel(doc: Doc, page: PageId) {
  if (page !== "contact") return pageNames[page];
  const names: Partial<Record<WidgetId, string>> = { contact: "Contact", faq: "FAQs", blog: "Blog", testimonials: "Testimony", promos: "Promotions" };
  return names[doc.pages.contact?.[0]?.widgetId] ?? "Contact";
}

function sanitizeSvg(value: string) {
  if (!value.trim().startsWith("<svg")) return "";
  return value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "").replace(/\son\w+\s*=\s*(["']).*?\1/gi, "").replace(/javascript:/gi, "");
}

function icon(value: string, fallback = "✦") {
  const svg = sanitizeSvg(value);
  if (svg) return `<span class="custom-icon">${svg}</span>`;
  const icons: Record<string, string> = { sparkles: "✦", layers: "▱", wrench: "⚙", calendar: "▣", check: "✓", star: "★", quote: "❝", mail: "✉", pin: "⌖", play: "▶", image: "▧" };
  return `<span class="fallback-icon" aria-hidden="true">${icons[value] ?? fallback}</span>`;
}

function socialIcon(name: string) {
  const label: Record<string, string> = { instagram: "◎", facebook: "f", youtube: "▶", linkedin: "in" };
  return label[name] ?? "•";
}

export function generateSiteFiles(projectName: string, raw: unknown): GeneratedFile[] {
  const saved = (raw && typeof raw === "object" ? raw : {}) as SavedDocument;
  const plan = saved.plan && saved.plan in BUILD_PLANS ? saved.plan : "beginner";
  const template = saved.template && saved.template in TEMPLATES ? saved.template : "aurora";
  const navMode: NavMode = saved.navMode === "multi" ? "multi" : "single";
  const doc = saved.doc;
  if (!doc?.pages) throw new Error("El preview no contiene un documento de sitio valido.");
  const content = saved.content && typeof saved.content === "object" ? saved.content : {};
  const tokens = TEMPLATES[template];
  const accent = BUILD_PLANS[plan];
  const getChrome = (key: string) => content[key] ?? NAV_CONTENT_DEFAULTS[key] ?? "";
  const files: GeneratedFile[] = [{ path: "/styles.css", body: css(tokens, accent.accent) }, { path: "/site.js", body: script() }];
  const renderPage = (only?: PageId) => documentHtml(projectName, doc, content, navMode, only, getChrome, tokens, accent);
  if (navMode === "single") files.push({ path: "/index.html", body: renderPage() });
  else for (const page of PAGES) files.push({ path: page.id === "home" ? "/index.html" : `/${page.id}/index.html`, body: renderPage(page.id) });
  return files;
}

function documentHtml(name: string, doc: Doc, content: Content, navMode: NavMode, only: PageId | undefined, getChrome: (key: string) => string, tokens: (typeof TEMPLATES)[TemplateId], accent: (typeof BUILD_PLANS)[BuildPlanId]) {
  const pages = only ? PAGES.filter((page) => page.id === only) : PAGES;
  const href = (id: PageId) => navMode === "single" ? `#${anchors[id]}` : id === "home" ? "/" : `/${id}/`;
  const links = PAGES.map((page) => `<a href="${href(page.id)}"${page.id === only ? ' aria-current="page"' : ""}>${esc(pageLabel(doc, page.id))}</a>`).join("");
  const cta = doc.navbarVariant === "cta" ? `<a class="button nav-cta" style="${buttonStyle(content[`${NAV_CONTENT.cta}:style`], accent, tokens.radius)}" href="${href("contact")}">${esc(getChrome(NAV_CONTENT.cta))}</a>` : "";
  const logoValue = getChrome(NAV_CONTENT.logo);
  const logo = logoValue && logoValue !== "/brand-plane.png" ? `<img class="logo" src="${safeImageUrl(logoValue)}" alt="${attr(name)}">` : `<strong>${esc(name)}</strong>`;
  const body = pages.map((page) => `<main id="${anchors[page.id]}" class="page">${(doc.pages[page.id] ?? []).map((instance) => renderWidget(instance.iid, instance.widgetId, content, tokens, accent)).join("")}</main>`).join("");
  const mapQuery = encodeURIComponent(getChrome(NAV_CONTENT.mapQuery));
  const footerBg = backgroundStyle(content[NAV_CONTENT.footerBg], tokens.footerBg);
  const slots = [0, 1, 2, 3].filter((i) => content[`chrome:footer:social:${i}:enabled`] !== "false");
  const seen = new Set<string>();
  const socials = slots.map((i) => ({ icon: content[`chrome:footer:social:${i}:icon`] ?? NAV_CONTENT_DEFAULTS[`chrome:footer:social:${i}:icon`] ?? "", url: content[`chrome:footer:social:${i}:url`] ?? NAV_CONTENT_DEFAULTS[`chrome:footer:social:${i}:url`] ?? "#" })).filter((item) => item.icon && !seen.has(item.icon) && seen.add(item.icon)).slice(0, 4).map((item) => `<a class="social" href="${safeUrl(item.url)}" target="_blank" rel="noreferrer" aria-label="${attr(item.icon)}">${socialIcon(item.icon)}</a>`).join("");
  const columns = `<div class="footer-columns">${[NAV_CONTENT.c1, NAV_CONTENT.c2, NAV_CONTENT.c3].map((key, i) => `<div><strong>${esc(getChrome(key))}</strong>${[PAGES[i % 4], PAGES[(i + 2) % 4]].map((page) => `<a href="${href(page.id)}">${esc(pageLabel(doc, page.id))}</a>`).join("")}</div>`).join("")}</div>`;
  const map = doc.footerVariant === "map" ? `<iframe class="map" title="Mapa" loading="lazy" src="https://www.google.com/maps?q=${mapQuery}&output=embed"></iframe>` : "";
  const newsletter = doc.footerVariant === "newsletter" ? `<form class="newsletter" onsubmit="event.preventDefault();this.classList.add('sent')"><label>${esc(getChrome(NAV_CONTENT.newsletter))}</label><div><input type="email" required placeholder="tu@email.com"><button class="button" style="${buttonStyle(content[`${NAV_CONTENT.newsletter}:send:style`], accent, tokens.radius)}">Enviar</button></div><small>Gracias por suscribirte.</small></form>` : "";
  const footerInner = doc.footerVariant === "simple" || doc.footerVariant === "social" ? `<div class="footer-simple"><strong>${esc(getChrome(NAV_CONTENT.brand))}</strong><div class="socials">${socials}</div></div>` : `${map}<div class="footer-grid"><strong>${esc(getChrome(NAV_CONTENT.brand))}</strong>${columns}${newsletter}<div class="socials">${socials}</div></div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title><meta name="description" content="${attr(name)}"><link rel="stylesheet" href="/styles.css"></head><body style="--surface:${tokens.surface};--alt:${tokens.surfaceAlt};--ink:${tokens.ink};--muted:${tokens.muted};--accent:${accent.accent};--accent-text:${accent.accentText};--radius:${tokens.radius}px;--title:${attr(tokens.titleFamily)};--body:${attr(tokens.bodyFamily)};${tokens.grayscale ? "filter:grayscale(1);" : ""}"><header class="navbar ${doc.navbarVariant}" style="background:${tokens.navBg};color:${content["chrome:navbar:ink"] || tokens.navInk}">${logo}<button class="menu" aria-label="Abrir menú">☰</button><nav>${links}${cta}</nav></header>${body}<footer style="${footerBg};color:${tokens.footerInk}">${footerInner}<p class="copyright">© ${new Date().getFullYear()} ${esc(getChrome(NAV_CONTENT.brand))}</p></footer><script src="/site.js" defer></script></body></html>`;
}

function backgroundStyle(raw: string | undefined, fallback: string) {
  if (raw?.startsWith("#")) return `background-color:${raw}`;
  const style = parse(raw, { fill: "solid", color: "", color2: "", direction: "right" });
  const first = style.color || fallback;
  return style.fill === "gradient" ? `background-color:${first};background-image:linear-gradient(${gradientDirection[style.direction] ?? "to right"},${first},${style.color2 || first})` : `background-color:${first};background-image:none`;
}

function buttonStyle(raw: string | undefined, accent: (typeof BUILD_PLANS)[BuildPlanId], radius: number, whiteDefault = false) {
  const style = parse(raw, { fill: "solid", color: "", color2: "", direction: "right" });
  const first = style.color || (whiteDefault ? "#ffffff" : accent.accent);
  const foreground = whiteDefault && !style.color ? accent.accentText : "#ffffff";
  if (style.fill === "gradient") return `border-radius:${radius / 2}px;background-image:linear-gradient(${gradientDirection[style.direction] ?? "to right"},${first},${style.color2 || first});color:${foreground}`;
  if (style.fill === "soft") return `border-radius:${radius / 2}px;background:${first}22;color:${first};border:1px solid ${first}55`;
  return `border-radius:${radius / 2}px;background:${first};color:${foreground}`;
}

function text(value: string, key: string, content: Content, tag = "p", className = "") {
  const style = parse(content[`${key}:textStyle`], { fill: "solid", color: "", color2: "", direction: "right" });
  let css = style.color ? `color:${style.color}` : "";
  if (/^h[1-3]$/.test(tag) && style.fill === "gradient" && style.color) css = `background-image:linear-gradient(${gradientDirection[style.direction] ?? "to right"},${style.color},${style.color2 || style.color});background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent`;
  return `<${tag} class="${className}" style="${css}">${esc(value)}</${tag}>`;
}

function renderWidget(iid: string, widget: WidgetId, content: Content, tokens: (typeof TEMPLATES)[TemplateId], accent: (typeof BUILD_PLANS)[BuildPlanId]) {
  const get = (field: string) => content[`${iid}:${field}`] ?? WIDGET_DEFAULTS[widget]?.[field] ?? "";
  const t = (field: string, tag = "p", cls = "") => text(get(field), `${iid}:${field}`, content, tag, cls);
  const image = (field: string, cls = "") => `<img class="${cls}" src="${safeImageUrl(get(field))}" alt="">`;
  const bgFallback = widget === "cta-banner" ? accent.accent : widget === "bg-video" ? "#020617" : ["text-block", "product-tiers", "stats", "gallery", "promos", "faq"].includes(widget) ? tokens.surfaceAlt : tokens.surface;
  const bg = backgroundStyle(content[`${iid}:background`], bgFallback);
  const section = (inside: string, cls = "") => `<section class="widget ${cls}" style="${bg}"><div class="container">${inside}</div></section>`;
  if (widget === "hero") return section(`${t("eyebrow", "p", "eyebrow")}${t("title", "h1")}${t("subtitle", "p", "lead")}<a class="button" style="${buttonStyle(content[`${iid}:cta:style`], accent, tokens.radius)}" href="#contacto">${esc(get("cta"))}</a>`, `hero ${tokens.heroAlign}`);
  if (widget === "features") return section(`<div class="cards">${[1,2,3].map(i => `<article>${icon(get(`icon${i}`))}${t(`f${i}t`, "h3")}${t(`f${i}d`)}</article>`).join("")}</div>`);
  if (widget === "image-text") return section(`<div class="split ${get("layout") === "image-right" ? "reverse" : ""}">${image("image")}<div>${t("title", "h2")}${t("body")}</div></div>`);
  if (widget === "text-block") return section(`${t("title", "h2")}${t("body", "p", "lead")}`, "center");
  if (widget === "product-tiers") return section(`${t("title", "h2", "center-title")}<div class="cards tiers">${[1,2,3].map(i => `<article>${t(`t${i}name`, "h3")}${t(`t${i}price`, "strong", "price")}</article>`).join("")}</div>`);
  if (widget === "services") return section(`${t("title", "h2", "center-title")}<div class="cards">${[1,2,3].map(i => `<article>${icon(get(`serviceIcon${i}`), "✓")}${t(`s${i}name`, "h3")}${t(`s${i}desc`)}</article>`).join("")}</div>`);
  if (widget === "stats") return section(`<div class="cards stats">${[1,2,3].map(i => `<article>${t(`n${i}`, "strong", "number")}${t(`l${i}`)}</article>`).join("")}</div>`);
  if (widget === "cta-banner") return section(`<div class="cta-row">${t("title", "h2")}<a class="button light" style="${buttonStyle(content[`${iid}:cta:style`], accent, tokens.radius, true)}" href="#contacto">${esc(get("cta"))}</a></div>`, "cta-banner");
  if (widget === "carousel") return section(`<div class="carousel">${[1,2,3].map((i) => image(`image${i}`, i === 1 ? "active" : "")).join("")}<button data-carousel="prev" aria-label="Anterior">‹</button><button data-carousel="next" aria-label="Siguiente">›</button></div>`);
  if (widget === "gallery") return section(`<div class="gallery">${[1,2,3,4,5,6].map(i => image(`g${i}`)).join("")}</div>`);
  if (widget === "bg-image") return `<section class="image-banner">${image("image")}<div>${t("caption", "p")}</div></section>`;
  if (widget === "bg-video") return section(`<div class="video-placeholder">${icon(get("playIcon"), "▶")}${t("title", "h3")}</div>`, "dark-widget");
  if (widget === "blog") return section(`${t("title", "h2", "center-title")}<div class="cards">${[1,2,3].map(i => `<article class="post">${image(`p${i}img`)}<div>${t(`p${i}t`, "h3")}${t(`p${i}e`)}</div></article>`).join("")}</div>`);
  if (widget === "promos") return section(`${t("title", "h2", "center-title")}<div class="cards promos">${[1,2,3].map(i => `<article><span class="tag">${esc(get(`o${i}tag`))}</span>${t(`o${i}t`, "h3")}${t(`o${i}d`)}</article>`).join("")}</div>`);
  if (widget === "testimonials") return section(`${t("title", "h2", "center-title")}<div class="cards">${[1,2,3].map(i => `<article>${icon(get(`quoteIcon${i}`), "❝")}${t(`q${i}`)}${t(`a${i}`, "strong", "author")}</article>`).join("")}</div>`);
  if (widget === "faq") return section(`${t("title", "h2", "center-title")}<div class="faqs">${[1,2,3].map(i => `<details><summary>${esc(get(`q${i}`))}</summary>${t(`a${i}`)}</details>`).join("")}</div>`);
  if (widget === "contact") return section(`<div class="split contact"><div>${t("title", "h2")}${t("subtitle")}<address>${esc(get("email"))}<br>${esc(get("phone"))}<br>${esc(get("address"))}</address></div><form onsubmit="event.preventDefault();this.classList.add('sent')"><input required placeholder="Nombre"><input required type="email" placeholder="Correo"><textarea required placeholder="Mensaje"></textarea><button class="button" style="${buttonStyle(content[`${iid}:send:style`], accent, tokens.radius)}">Enviar</button><small>Mensaje enviado.</small></form></div>`);
  return "";
}

function css(tokens: (typeof TEMPLATES)[TemplateId], accent: string) { return `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--surface);color:var(--ink);font-family:var(--body);line-height:1.55}img{display:block;max-width:100%;object-fit:cover}a{color:inherit;text-decoration:none}button,input,textarea{font:inherit}.navbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:2rem;padding:1rem max(5vw,1rem);border-bottom:1px solid color-mix(in srgb,var(--muted) 20%,transparent)}.navbar.centered{flex-direction:column}.navbar nav{margin-left:auto;display:flex;align-items:center;gap:1.4rem}.navbar.centered nav{margin:auto}.navbar nav a[aria-current=page]{font-weight:800}.logo{width:110px;height:34px;object-fit:contain}.menu{display:none;margin-left:auto;border:0;background:none;color:inherit;font-size:1.4rem}.button{display:inline-block;border:0;border-radius:calc(var(--radius)/2);padding:.7rem 1.1rem;background:var(--accent);color:white;cursor:pointer}.nav-cta{padding:.45rem .8rem}.page{scroll-margin-top:70px}.widget{padding:4.5rem max(5vw,1.25rem)}.container{width:min(1050px,100%);margin:auto}.container>h1,.container>h2,.container>h3,h1,h2,h3{font-family:var(--title);font-weight:${tokens.titleWeight};line-height:1.12;margin:0 0 1rem}h1{font-size:clamp(2.5rem,7vw,5.5rem)}h2{font-size:clamp(1.8rem,4vw,3rem)}h3{font-size:1.1rem}p{margin:.4rem 0;color:var(--muted)}.hero{text-align:center;padding-block:7rem}.hero.left{text-align:left}.hero.left .lead{margin-left:0}.eyebrow{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.2em}.lead{font-size:1.08rem;max-width:620px;margin:1rem auto 1.6rem}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.cards article{position:relative;padding:1.5rem;border-radius:var(--radius);background:color-mix(in srgb,var(--alt) 86%,transparent);border:1px solid color-mix(in srgb,var(--muted) 18%,transparent)}.fallback-icon,.custom-icon{display:inline-grid;color:var(--accent);font-size:1.5rem;margin-bottom:.7rem}.custom-icon svg{width:1.5rem;height:1.5rem;fill:currentColor}.split{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:3rem}.split.reverse>img{order:2}.split>img{width:100%;height:330px;border-radius:var(--radius)}.center{text-align:center}.center-title{text-align:center;margin-bottom:2rem!important}.price,.number{display:block;font-size:2rem;color:var(--accent)}.stats article{text-align:center;background:transparent}.cta-row{display:flex;align-items:center;gap:2rem}.cta-row .button{margin-left:auto}.light{background:white;color:${accent}}.carousel{height:420px;position:relative}.carousel img{display:none;width:100%;height:100%;border-radius:var(--radius)}.carousel img.active{display:block}.carousel button{position:absolute;top:50%;translate:0 -50%;width:44px;height:44px;border:0;border-radius:50%;font-size:2rem}.carousel button[data-carousel=prev]{left:1rem}.carousel button[data-carousel=next]{right:1rem}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}.gallery img{width:100%;aspect-ratio:1;border-radius:var(--radius)}.image-banner{height:480px;position:relative}.image-banner>img{width:100%;height:100%}.image-banner>div{position:absolute;inset:0;display:flex;align-items:flex-end;padding:3rem;background:linear-gradient(transparent,#000b)}.image-banner p{color:white;font-size:1.2rem}.dark-widget{color:white}.video-placeholder{text-align:center;padding:4rem}.post{padding:0!important;overflow:hidden}.post img{width:100%;height:180px}.post div{padding:1.2rem}.promos article{text-align:center;padding-top:2rem}.tag{position:absolute;top:-.75rem;left:50%;translate:-50%;background:var(--accent);color:white;border-radius:99px;padding:.25rem .8rem;font-weight:800}.author{display:block;color:var(--accent);margin-top:1rem}.faqs{width:min(760px,100%);margin:auto}.faqs details{padding:1rem 1.2rem;margin:.7rem 0;background:var(--surface);border-radius:var(--radius);border:1px solid color-mix(in srgb,var(--muted) 20%,transparent)}.faqs summary{font-weight:700;cursor:pointer}.contact address{font-style:normal;margin-top:1.5rem}.contact form,.newsletter{display:grid;gap:.8rem}.contact input,.contact textarea,.newsletter input{width:100%;padding:.8rem;border:1px solid color-mix(in srgb,var(--muted) 35%,transparent);border-radius:calc(var(--radius)/2);background:var(--surface);color:var(--ink)}.contact textarea{min-height:130px}.contact small,.newsletter small{display:none}.contact form.sent small,.newsletter.sent small{display:block;color:var(--accent)}footer{padding:3.5rem max(5vw,1.25rem) 1.2rem}.footer-simple,.footer-grid{width:min(1050px,100%);margin:auto;display:flex;align-items:flex-start;gap:3rem}.footer-simple .socials{margin-left:auto}.footer-grid{display:grid;grid-template-columns:auto 1fr 1fr;align-items:start}.footer-columns{display:flex;gap:3rem}.footer-columns strong,.footer-columns a{display:block;margin-bottom:.4rem}.footer-columns a{opacity:.65;font-size:.85rem}.socials{display:flex;gap:.5rem}.social{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#ffffff18;font-weight:800}.map{width:min(1050px,100%);height:250px;border:0;border-radius:var(--radius);display:block;margin:0 auto 2rem}.copyright{text-align:center;color:inherit;opacity:.5;font-size:.75rem;margin-top:2rem}@media(max-width:720px){.navbar nav{display:none;position:absolute;top:100%;left:0;right:0;padding:1rem;flex-direction:column;background:inherit;border-bottom:1px solid #8883}.navbar.open nav{display:flex}.menu{display:block}.cards,.split,.footer-grid{grid-template-columns:1fr}.split.reverse>img{order:0}.cta-row,.footer-simple{align-items:flex-start;flex-direction:column}.cta-row .button,.footer-simple .socials{margin-left:0}.gallery{grid-template-columns:repeat(2,1fr)}.widget{padding-block:3.2rem}.carousel{height:280px}.footer-columns{flex-wrap:wrap}}`; }

function script() { return `document.querySelector('.menu')?.addEventListener('click',()=>document.querySelector('.navbar')?.classList.toggle('open'));document.querySelectorAll('.carousel').forEach(c=>{const imgs=[...c.querySelectorAll('img')];let i=0;const go=d=>{imgs[i].classList.remove('active');i=(i+d+imgs.length)%imgs.length;imgs[i].classList.add('active')};c.querySelector('[data-carousel=prev]')?.addEventListener('click',()=>go(-1));c.querySelector('[data-carousel=next]')?.addEventListener('click',()=>go(1));});`; }
