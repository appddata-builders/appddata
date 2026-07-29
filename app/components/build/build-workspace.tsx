"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LuArrowLeftRight,
  LuCalendarClock,
  LuCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuGripVertical,
  LuImagePlus,
  LuLayers,
  LuLayoutTemplate,
  LuLock,
  LuMailOpen,
  LuMapPin,
  LuMenu,
  LuMinus,
  LuMonitor,
  LuPanelTop,
  LuPause,
  LuPencil,
  LuPlay,
  LuPlus,
  LuQuote,
  LuRotateCcw,
  LuSmartphone,
  LuSparkles,
  LuStar,
  LuTicket,
  LuTrash2,
  LuUpload,
  LuVideo,
  LuWrench,
  LuX,
} from "react-icons/lu";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube } from "react-icons/fa6";

import {
  BG_IMAGE,
  BG_VIDEO,
  BLOG,
  BUTTON_BASE,
  CARD_BG_ALPHA,
  CARD_BORDER_ALPHA,
  CAROUSEL,
  CONTACT,
  CTA_BANNER,
  FAQ,
  FEATURES,
  GALLERY,
  HERO,
  IMAGE_TEXT,
  PROMOS,
  PRODUCT_TIERS,
  SECTION,
  SERVICES,
  STATS,
  TESTIMONIALS,
  TEXT_BLOCK,
} from "@/lib/react-site/widget-contract";
import { cn } from "@/lib/utils";
import { resolvePublicAssetUrl } from "@/lib/public-assets";
import type { AvailableSitePackages } from "@/lib/plans";

import {
  BUILD_PLANS,
  type BuildPlanId,
  BUTTON_FILLS,
  type ButtonStyle,
  countInstances,
  DEFAULT_BUTTON_STYLE,
  defaultDoc,
  type Doc,
  emptyDoc,
  fontStackOf,
  FOOTER_VARIANTS,
  type FooterVariant,
  type Instance,
  maxWidgetsFor,
  newIid,
  NAV_CONTENT,
  NAV_CONTENT_DEFAULTS,
  NAVBAR_VARIANTS,
  type NavbarVariant,
  type NavMode,
  pageLabel,
  type PageId,
  PAGES,
  PLAN_ORDER,
  STOCK_IMAGES,
  type TemplateId,
  TEMPLATE_ORDER,
  TEMPLATES,
  type TemplateTokens,
  tokensWithFonts,
  type WidgetDef,
  WIDGET_DEFAULTS,
  WIDGETS_BY_ID,
  widgetsForPage,
  type WidgetId,
} from "./build-model";

const STORAGE_KEY = "appddata:build-workspace-v6";
/** Ancho de diseno del preview: el sitio se renderiza a este ancho FIJO (como un
 * viewport real) y se escala para caber en el panel, asi el preview es fiel al
 * deploy (mismas container queries y cqw). */
const PREVIEW_DESIGN_WIDTH: Record<"desktop" | "mobile", number> = { desktop: 1280, mobile: 390 };
const PAGE_BY_ID = Object.fromEntries(PAGES.map((page) => [page.id, page])) as Record<
  PageId,
  (typeof PAGES)[number]
>;

type Content = Record<string, string>;

type ActiveDrag =
  | { kind: "new"; widget: WidgetDef }
  | { kind: "item"; iid: string; widgetId: WidgetId; page: PageId }
  | null;

type PersistedState = {
  plan: BuildPlanId;
  template: TemplateId;
  navMode: NavMode;
  doc: Doc;
  content: Content;
};

function readPersisted(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.doc || !parsed?.plan || !parsed?.template) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ============================ Componente raiz =========================== */

export default function BuildWorkspace({
  siteName,
  initialPlan,
  availableSitePackages,
  isInternal,
}: {
  siteName: string;
  initialPlan: BuildPlanId;
  availableSitePackages: AvailableSitePackages;
  isInternal: boolean;
}) {
  const [plan, setPlan] = useState<BuildPlanId>(initialPlan);
  const [template, setTemplate] = useState<TemplateId>("aurora");
  const [navMode, setNavMode] = useState<NavMode>("single");
  const [activePage, setActivePage] = useState<PageId>("home");
  const [doc, setDoc] = useState<Doc>(() => defaultDoc());
  const [content, setContent] = useState<Content>({});
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [hydrated, setHydrated] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [panelStep, setPanelStep] = useState<1 | 2 | 3>(1);
  const [projectName, setProjectName] = useState("");
  // El nombre se pide y valida ANTES de mostrar el builder; hasta que no queda
  // confirmado se muestra el gate en vez del lienzo.
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [createState, setCreateState] = useState<{ step: "input" | "valid" | "creating" | "done"; message?: string; slug?: string; url?: string; repoUrl?: string }>({ step: "input" });
  const previewRef = useRef<HTMLDivElement>(null);
  // Frame escalado del preview: se mide el ancho disponible (stage) y la altura
  // natural del frame para escalar el sitio (renderizado a ancho de diseno fijo).
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [frameHeight, setFrameHeight] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = readPersisted();
      if (saved) {
        setPlan(initialPlan);
        setTemplate(saved.template);
        setNavMode(saved.navMode);
        setDoc(
          initialPlan !== "premium" && saved.doc.navbarVariant === "cta"
            ? { ...saved.doc, navbarVariant: "standard" }
            : saved.doc,
        );
        setContent({
          ...(saved.content ?? {}),
          ...(saved.content?.[NAV_CONTENT.cta] === "Cotizar"
            ? { [NAV_CONTENT.cta]: NAV_CONTENT_DEFAULTS[NAV_CONTENT.cta] }
            : {}),
        });
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialPlan]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ plan, template, navMode, doc, content }),
    );
  }, [plan, template, navMode, doc, content, hydrated]);

  // Escala del frame: ancho disponible / ancho de diseno (solo reduce, nunca amplia).
  useEffect(() => {
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!stage || !frame) return;
    const design = PREVIEW_DESIGN_WIDTH[device];
    const recompute = () => {
      setPreviewScale(Math.min(1, stage.clientWidth / design));
      setFrameHeight(frame.offsetHeight);
    };
    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(stage);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [device]);

  const accent = BUILD_PLANS[plan];
  // Tokens del template con las fuentes efectivas (override del doc o default).
  const tokens = tokensWithFonts(TEMPLATES[template], doc);
  // Carga en el head las Google Fonts activas para que el preview las use.
  useGoogleFontLink(googleFontsHref([tokens.titleFont, tokens.bodyFont]));
  const activeFull = doc.pages[activePage].length >= maxWidgetsFor(activePage);

  const validateNewProject = async (): Promise<boolean> => {
    setCreateState({ step: "creating", message: "Validando nombre..." });
    const response = await fetch("/api/dashboard/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: projectName, sitePlan: plan, validateOnly: true }) });
    const data = await response.json() as { error?: string; slug?: string };
    setCreateState(response.ok ? { step: "valid", slug: data.slug, message: "Nombre disponible." } : { step: "input", message: data.error ?? "No se pudo validar." });
    return response.ok;
  };

  // Gate previo al builder: valida el nombre y, si esta disponible, revela el
  // lienzo con el nombre ya fijado (se crea/despliega recien al publicar).
  const confirmProjectName = async () => {
    if (await validateNewProject()) setNameConfirmed(true);
  };

  const createNewProject = async () => {
    setCreateState((current) => ({ ...current, step: "creating", message: "Validando y preparando…" }));
    const response = await fetch("/api/dashboard/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: projectName, sitePlan: plan, document: { version: 1, plan, template, navMode, doc, content } }) });

    // Errores tempranos (validacion/paquete/nombre) llegan como JSON con status != 2xx.
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok && !contentType.includes("ndjson")) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      setCreateState({ step: "input", message: data.error ?? "No se pudo crear." });
      return;
    }

    // Stream NDJSON: una linea JSON por fase (s3 / repo / deploy / saving / done / error).
    type StreamEvent = { phase?: string; message?: string; error?: string; project?: { slug: string }; deployment?: { status: string; url?: string; message?: string }; repository?: { status: string; url?: string } };
    const handleEvent = (event: StreamEvent) => {
      if (event.phase === "error") {
        setCreateState({ step: "input", message: event.error ?? "No se pudo crear." });
      } else if (event.phase === "done") {
        const deploymentMessage = event.deployment?.status === "deployed" ? "publicado en Netlify" : event.deployment?.status === "configuration_required" ? "pendiente de NETLIFY_AUTH_TOKEN" : event.deployment?.message ?? "deploy pendiente";
        const repositoryMessage = event.repository?.status === "created" ? "repositorio creado en GitHub" : "repositorio pendiente de GITHUB_TOKEN";
        setCreateState({ step: "done", slug: event.project?.slug, url: event.deployment?.url, repoUrl: event.repository?.url, message: `Proyecto ${deploymentMessage} y ${repositoryMessage}.` });
      } else if (event.message) {
        const message = event.message;
        setCreateState((current) => ({ ...current, step: "creating", message }));
      }
    };

    const reader = response.body?.getReader();
    if (!reader) { setCreateState({ step: "input", message: "No se pudo crear." }); return; }
    const decoder = new TextDecoder();
    let buffer = "";
    const flush = (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) { try { handleEvent(JSON.parse(line) as StreamEvent); } catch { /* linea parcial/no-JSON */ } }
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (value) flush(decoder.decode(value, { stream: true }));
      if (done) break;
    }
    const rest = buffer.trim();
    if (rest) { try { handleEvent(JSON.parse(rest) as StreamEvent); } catch { /* ignore */ } }
  };

  const commitContent = useCallback((key: string, value: string) => {
    setContent((current) => ({ ...current, [key]: value }));
  }, []);

  const selectPlan = useCallback((nextPlan: BuildPlanId) => {
    setPlan(nextPlan);
    if (nextPlan !== "premium") {
      setDoc((current) =>
        current.navbarVariant === "cta" ? { ...current, navbarVariant: "standard" } : current,
      );
    }
  }, []);

  const clearContentFor = useCallback((iid: string) => {
    setContent((current) => {
      const next: Content = {};
      for (const key of Object.keys(current)) {
        if (!key.startsWith(`${iid}:`)) next[key] = current[key];
      }
      return next;
    });
  }, []);

  /**
   * Agrega un widget al body de una pagina (respeta el maximo de 4). Se permite
   * repetir el mismo tipo de widget: cada instancia recibe un id unico.
   */
  const addWidget = useCallback((widget: WidgetDef, page: PageId, beforeIid?: string) => {
    const instance: Instance = { iid: newIid(widget.id), widgetId: widget.id };
    if (page === "contact") {
      const replacedIds = new Set(doc.pages.contact.map((item) => item.iid));
      setContent((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([key]) => ![...replacedIds].some((iid) => key.startsWith(`${iid}:`))),
        ),
      );
    }
    setDoc((prev) => {
      const list = prev.pages[page];
      if (page === "contact") {
        return { ...prev, pages: { ...prev.pages, contact: [instance] } };
      }
      if (list.length >= maxWidgetsFor(page)) return prev; // limite alcanzado
      const index = beforeIid ? list.findIndex((i) => i.iid === beforeIid) : -1;
      const next =
        index >= 0 ? [...list.slice(0, index), instance, ...list.slice(index)] : [...list, instance];
      return { ...prev, pages: { ...prev.pages, [page]: next } };
    });
  }, [doc.pages.contact]);

  const removeInstance = useCallback(
    (page: PageId, iid: string) => {
      setDoc((prev) => ({
        ...prev,
        pages: { ...prev.pages, [page]: prev.pages[page].filter((i) => i.iid !== iid) },
      }));
      clearContentFor(iid);
    },
    [clearContentFor],
  );

  const restoreDefault = useCallback(() => {
    setDoc(defaultDoc());
    setContent({});
    setActivePage("home");
  }, []);

  const clearAll = useCallback(() => {
    setDoc(emptyDoc());
    setContent({});
  }, []);

  const selectPage = useCallback(
    (page: PageId) => {
      setActivePage(page);
      if (navMode === "single") {
        window.requestAnimationFrame(() => {
          previewRef.current
            ?.querySelector(`#build-page-${page}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },
    [navMode],
  );

  /* --------------------------- Drag & drop --------------------------- */

  function onDragStart(event: DragStartEvent) {
    setActiveDrag((event.active.data.current as ActiveDrag) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as ActiveDrag;
    const overData = over.data.current as
      | { kind: "zone"; page: PageId }
      | { kind: "item"; iid: string; page: PageId }
      | undefined;
    if (!activeData || !overData) return;
    const targetPage = overData.page;

    if (activeData.kind === "new") {
      const beforeIid = overData.kind === "item" ? overData.iid : undefined;
      addWidget(activeData.widget, targetPage, beforeIid);
      return;
    }

    // Reordenar dentro de la misma pagina.
    if (activeData.page !== targetPage) return;
    if (overData.kind !== "item" || overData.iid === activeData.iid) return;
    setDoc((prev) => {
      const list = prev.pages[targetPage];
      const from = list.findIndex((i) => i.iid === activeData.iid);
      const to = list.findIndex((i) => i.iid === overData.iid);
      if (from < 0 || to < 0) return prev;
      return { ...prev, pages: { ...prev.pages, [targetPage]: arrayMove(list, from, to) } };
    });
  }

  const total = countInstances(doc);
  const selectablePlans = PLAN_ORDER.filter(
    (id) => isInternal || availableSitePackages[id] > 0,
  );
  // Indicador de la "moneda"/ticket: una burbuja INDEPENDIENTE por paquete con
  // websites disponibles (p. ej. "2 Websites Beginner", "1 Website Super").
  // Los internos (admins) no consumen tickets.
  const ticketBadge = isInternal ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[0.68rem] font-semibold text-blue-700">
      <LuTicket className="h-3.5 w-3.5" /> Interno · sitios ilimitados
    </span>
  ) : (
    <div className="flex flex-wrap items-center gap-1.5">
      {PLAN_ORDER.filter((id) => availableSitePackages[id] > 0).map((id) => (
        <span
          key={id}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#f3c49f] bg-[#fff4e8] px-2.5 py-1 text-[0.68rem] font-semibold text-[#b85f28]"
        >
          <LuTicket className="h-3.5 w-3.5 text-[#df7a3a]" />
          {availableSitePackages[id]} {availableSitePackages[id] === 1 ? "sitio" : "sitios"} {BUILD_PLANS[id].name}
        </span>
      ))}
    </div>
  );

  // Gate de nombre: se muestra antes del lienzo. El acceso a la pagina ya exige
  // un ticket; aqui solo se comprueba que el nombre este disponible.
  if (!nameConfirmed) {
    const busy = createState.step === "creating";
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <div className="mb-4">
            <p className="text-base font-semibold text-slate-800">Nombra tu nuevo sitio</p>
            <div className="mt-2">{ticketBadge}</div>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Elige qué paquete usar y el nombre del proyecto. Comprobamos que esté
            disponible; el sitio se crea y publica cuando termines de diseñarlo.
          </p>
          {selectablePlans.length > 1 ? (
            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-slate-600">Paquete para este website</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {selectablePlans.map((id) => {
                  const meta = BUILD_PLANS[id];
                  const active = id === plan;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={busy}
                      onClick={() => selectPlan(id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs font-semibold transition",
                        active ? "text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                      style={active ? { borderColor: meta.accent, backgroundColor: meta.accent } : undefined}
                    >
                      <span className="block">{meta.name}</span>
                      {!isInternal ? <span className={cn("mt-0.5 block text-[0.62rem]", active ? "text-white/80" : "text-slate-400")}>{availableSitePackages[id]} disponible{availableSitePackages[id] === 1 ? "" : "s"}</span> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <label className="mt-4 block text-xs font-medium text-slate-600">
            Nombre del proyecto
            <input
              autoFocus
              value={projectName}
              disabled={busy}
              onChange={(event) => { setProjectName(event.target.value); setCreateState({ step: "input" }); }}
              onKeyDown={(event) => { if (event.key === "Enter" && projectName.trim() && !busy) void confirmProjectName(); }}
              placeholder="Mi nuevo sitio"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
            />
          </label>
          {createState.slug ? <p className="mt-2 text-xs text-slate-400">Slug: <span className="font-medium text-slate-700">{createState.slug}</span></p> : null}
          {createState.message ? <p className={cn("mt-3 rounded-lg px-3 py-2 text-xs", createState.step === "valid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500")}>{createState.message}</p> : null}
          <button
            type="button"
            onClick={() => void confirmProjectName()}
            disabled={busy || projectName.trim().length === 0}
            className="mt-4 w-full rounded-lg bg-sky-600 py-2.5 text-xs font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {busy ? "Validando..." : "Validar y continuar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      id="appddata-build-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex h-full flex-col overflow-hidden bg-slate-50">
        {/* ---------------------------- Toolbar ---------------------------- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[0.62rem] uppercase tracking-[0.28em] text-slate-400">Plan</span>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5">
              {selectablePlans.map((id) => {
                const meta = BUILD_PLANS[id];
                const active = id === plan;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectPlan(id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.72rem] font-medium tracking-[0.06em] transition-colors",
                      active ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-800",
                    )}
                    style={active ? { backgroundColor: meta.accent } : undefined}
                  >
                    {meta.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:block">{ticketBadge}</span>
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                aria-label="Vista escritorio"
                className={cn(
                  "rounded px-2 py-1 transition-colors",
                  device === "desktop" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400",
                )}
              >
                <LuMonitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                aria-label="Vista movil"
                className={cn(
                  "rounded px-2 py-1 transition-colors",
                  device === "mobile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400",
                )}
              >
                <LuSmartphone className="h-3.5 w-3.5" />
              </button>
            </div>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#df7a3a]/70 px-2.5 text-[0.76rem] font-medium text-white transition hover:bg-[#df7a3a] "><LuTicket className="h-3.5 w-3.5" /><span className="hidden sm:inline">Crear</span></button>
            <button
              type="button"
              onClick={restoreDefault}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[0.78rem] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LuRotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Restaurar</span>
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={total === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.78rem] font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <LuTrash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vaciar</span>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* ---------------------------- Panel ---------------------------- */}
          <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r border-slate-200 bg-white px-3 py-3 md:flex">
            <PackageCard plan={accent} />

            <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {([
                [1, "Diseño"],
                [2, "Contenido"],
                [3, "Servicios"],
              ] as const).map(([step, label]) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setPanelStep(step)}
                  className={cn(
                    "rounded-lg px-1 py-2 text-[0.64rem] font-semibold transition",
                    panelStep === step ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white",
                  )}
                >
                  <span className="mr-1 opacity-60">{step}.</span>{label}
                </button>
              ))}
            </div>

            {panelStep === 1 ? (
              <>
            {/* Plantillas */}
            <section>
              <PanelHeading>Plantilla</PanelHeading>
              <div className="grid grid-cols-4 gap-1.5">
                {TEMPLATE_ORDER.map((id) => {
                  const t = TEMPLATES[id];
                  const active = id === template;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTemplate(id)}
                      title={`${t.name} — ${t.description}`}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition",
                        active
                          ? "border-slate-900 ring-1 ring-slate-900"
                          : "border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <TemplateSwatch tokens={t} />
                      <span className="max-w-full truncate text-[0.6rem] font-semibold text-slate-700">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Tipografia (Google Fonts) */}
            <section>
              <PanelHeading>Tipografia</PanelHeading>
              <div className="space-y-1.5">
                <FontField
                  label="Titulos"
                  value={tokens.titleFont}
                  isDefault={!doc.titleFont}
                  onCommit={(family) => setDoc((prev) => ({ ...prev, titleFont: family }))}
                  onReset={() => setDoc((prev) => ({ ...prev, titleFont: undefined }))}
                />
                <FontField
                  label="Cuerpo"
                  value={tokens.bodyFont}
                  isDefault={!doc.bodyFont}
                  onCommit={(family) => setDoc((prev) => ({ ...prev, bodyFont: family }))}
                  onReset={() => setDoc((prev) => ({ ...prev, bodyFont: undefined }))}
                />
              </div>
            </section>

            {/* Navegacion */}
            {/* Navbar */}
            <section>
              <PanelHeading>Barra de navegación</PanelHeading>
              <div className="grid grid-cols-2 gap-1.5">
                {NAVBAR_VARIANTS.map((variant) => (
                  <ThumbCard
                    key={variant.id}
                    active={doc.navbarVariant === variant.id}
                    onClick={() => setDoc((prev) => ({ ...prev, navbarVariant: variant.id }))}
                    name={variant.name}
                    thumb={<NavbarThumb variant={variant.id} />}
                    disabled={variant.id === "cta" && plan !== "premium"}
                    badge={variant.id === "cta" ? "Premium" : undefined}
                  />
                ))}
              </div>
            </section>

            <section>
              <PanelHeading>Pie de página</PanelHeading>
              <div className="grid grid-cols-2 gap-1.5">
                {FOOTER_VARIANTS.map((variant) => (
                  <ThumbCard
                    key={variant.id}
                    active={doc.footerVariant === variant.id}
                    onClick={() => setDoc((prev) => ({ ...prev, footerVariant: variant.id }))}
                    name={variant.name}
                    thumb={<FooterThumb variant={variant.id} />}
                  />
                ))}
              </div>
            </section>
              </>
            ) : null}

            {panelStep === 2 ? (
              <>
            <section>
              <PanelHeading>Navegacion</PanelHeading>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-1">
                <div className="grid grid-cols-2 gap-1" role="group" aria-label="Tipo de navegacion">
                  <button type="button" onClick={() => setNavMode("single")} aria-pressed={navMode === "single"} className={cn("flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.72rem] font-semibold transition", navMode === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700")}>
                    <LuPanelTop className="h-3.5 w-3.5" />Una pagina
                  </button>
                  <button type="button" onClick={() => setNavMode("multi")} aria-pressed={navMode === "multi"} className={cn("flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.72rem] font-semibold transition", navMode === "multi" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700")}>
                    <LuLayoutTemplate className="h-3.5 w-3.5" />Paginas
                  </button>
                </div>
              </div>
              <p className="mt-1.5 px-1 text-[0.62rem] leading-4 text-slate-400">{navMode === "single" ? "Todo el sitio se recorre con anclas." : "Cada seccion funciona como una pagina independiente."}</p>
            </section>

            {/* Paginas */}
            <section>
              <PanelHeading>Paginas</PanelHeading>
              <div className="space-y-1">
                {PAGES.map((page) => {
                  const active = page.id === activePage;
                  const count = doc.pages[page.id].length;
                  const full = count >= maxWidgetsFor(page.id);
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => selectPage(page.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[0.8rem] transition",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <span className="font-medium">{pageLabel(doc, page.id)}</span>
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 text-[0.62rem]",
                          active ? "bg-white/20" : full ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {count}/{maxWidgetsFor(page.id)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 px-1 text-[0.62rem] leading-4 text-slate-400">
                Inicio, Nosotros, Productos y la página especial vienen en todos los paquetes.
              </p>
            </section>

            {/* Widgets del body */}
            <section>
              <PanelHeading>
                {activePage === "contact" ? "Bloque de Contacto · 1 especial" : "Bloques · arrástralos al contenido"}
              </PanelHeading>
              {activePage === "contact" ? (
                <p className="mb-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[0.66rem] leading-4 text-slate-500">
                  Contacto admite un contenido especializado: formulario, preguntas frecuentes, blog, testimonios o promociones.
                </p>
              ) : null}
              {activeFull && activePage !== "contact" ? (
                <p className="mb-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[0.66rem] font-medium text-amber-700">
                  {pageLabel(doc, activePage)} tiene el maximo de {maxWidgetsFor(activePage)} widget
                  {maxWidgetsFor(activePage) === 1 ? "" : "s"}. Quita uno para cambiarlo.
                </p>
              ) : null}
              <div className="space-y-1">
                {widgetsForPage(activePage).map((widget) => (
                  <PaletteItem
                    key={widget.id}
                    widget={widget}
                    selected={activePage === "contact" && doc.pages.contact[0]?.widgetId === widget.id}
                    onAdd={() => addWidget(widget, activePage)}
                  />
                ))}
              </div>
            </section>
              </>
            ) : null}

            {panelStep === 3 ? (
            <section>
              <PanelHeading>Servicios necesarios</PanelHeading>
              <p className="mb-2 px-1 text-[0.68rem] leading-4 text-slate-500">
                Describe integraciones, automatizaciones, formularios especiales o cualquier servicio adicional que necesite el sitio.
              </p>
              <textarea
                value={content["build:requested-services"] ?? ""}
                onChange={(event) => commitContent("build:requested-services", event.target.value)}
                placeholder="Ej. Integrar reservaciones, pagos con Stripe, CRM, WhatsApp y correos automáticos..."
                rows={9}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-5 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <p className="mt-2 text-[0.62rem] leading-4 text-slate-400">
                Esta solicitud se guarda con el proyecto para revisarla antes del desarrollo.
              </p>
            </section>
            ) : null}
          </aside>

          {/* ---------------------------- Lienzo --------------------------- */}
          <main ref={previewRef} data-build-preview-scroll className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            <div ref={stageRef} className="w-full">
              {/* Caja de recorte al tamano ESCALADO: el frame interior va a ancho de diseno fijo. */}
              <div
                className="mx-auto overflow-hidden rounded-2xl border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
                style={{
                  width: PREVIEW_DESIGN_WIDTH[device] * previewScale,
                  height: frameHeight ? frameHeight * previewScale : undefined,
                }}
              >
                <div
                  ref={frameRef}
                  style={{
                    width: PREVIEW_DESIGN_WIDTH[device],
                    transformOrigin: "top left",
                    transform: `scale(${previewScale})`,
                  }}
                >
                  <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="ml-2 truncate rounded-md bg-white px-2 py-0.5 text-[0.62rem] text-slate-400">
                      {projectName || siteName}
                      {navMode === "multi" && activePage !== "home"
                        ? `/${PAGE_BY_ID[activePage].anchor}`
                        : ""}
                    </span>
                  </div>

                  <SitePreview
                    doc={doc}
                    plan={plan}
                    tokens={tokens}
                    navMode={navMode}
                    activePage={activePage}
                    device={device}
                    content={content}
                    dragging={activeDrag !== null}
                    onCommit={commitContent}
                    onRemove={removeInstance}
                    onNavigate={selectPage}
                  />
                </div>
              </div>
            </div>

            <p className="mx-auto mt-4 max-w-4xl text-center text-[0.7rem] text-slate-400">
              Plantilla {tokens.name} · {navMode === "single" ? "una pagina con anclas" : "paginas separadas"} ·{" "}
              {total} widget{total === 1 ? "" : "s"} · arrastra al body y da clic en textos, logo e imagenes para editar
            </p>
          </main>
        </div>
      </div>

      {createOpen ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-950/50" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl">
            <p className="text-base font-semibold">Crear proyecto</p><p className="mt-1 text-xs leading-5 text-slate-500">Primero validamos el nombre. Después generamos el código fuente, creamos su repositorio en GitHub y publicamos el sitio en Netlify.</p>
            <label className="mt-4 block text-xs font-medium text-slate-600">Nombre del proyecto<input autoFocus value={projectName} disabled={createState.step === "creating" || createState.step === "done"} onChange={(event) => { setProjectName(event.target.value); setCreateState({ step: "input" }); }} placeholder="Mi nuevo sitio" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" /></label>
            {createState.slug ? <p className="mt-2 text-xs text-slate-400">Slug: <span className="font-medium text-slate-700">{createState.slug}</span></p> : null}
            {createState.message ? <p className={cn("mt-3 rounded-lg px-3 py-2 text-xs", createState.step === "valid" || createState.step === "done" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500")}>{createState.message}</p> : null}
            {createState.url ? <a href={createState.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-medium text-sky-600 underline">{createState.url}</a> : null}
            {createState.repoUrl ? <a href={createState.repoUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-medium text-slate-700 underline">Repositorio: {createState.repoUrl}</a> : null}
            <div className="mt-4 flex gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500">Cerrar</button>{createState.step === "input" ? <button type="button" onClick={() => void validateNewProject()} className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-medium text-white">Validar nombre</button> : null}{createState.step === "valid" ? <button type="button" onClick={() => void createNewProject()} className="flex-1 rounded-lg bg-sky-600 py-2 text-xs font-medium text-white">Crear y desplegar</button> : null}{createState.step === "creating" ? <button type="button" disabled className="flex-1 rounded-lg bg-slate-200 py-2 text-xs font-medium text-slate-500">Procesando...</button> : null}</div>
          </div>
        </div>, document.body) : null}

      <DragOverlay dropAnimation={null}>
        {activeDrag?.kind === "new" ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-900 bg-white px-2.5 py-1.5 shadow-lg">
            <activeDrag.widget.icon className="h-4 w-4 text-slate-700" />
            <span className="text-[0.78rem] font-medium text-slate-800">{activeDrag.widget.name}</span>
          </div>
        ) : activeDrag?.kind === "item" ? (
          <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-1.5 text-[0.78rem] font-medium text-slate-800 shadow-lg">
            {WIDGETS_BY_ID[activeDrag.widgetId]?.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ============================ Panel helpers ============================= */

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 px-1 text-[0.62rem] uppercase tracking-[0.28em] text-slate-400">{children}</p>
  );
}

function PackageCard({ plan }: { plan: (typeof BUILD_PLANS)[BuildPlanId] }) {
  return (
    <section
      className="rounded-xl border p-3"
      style={{ borderColor: `${plan.accent}44`, backgroundColor: plan.accentSoft }}
    >
      <span className="text-sm font-semibold" style={{ color: plan.accentText }}>
        Paquete {plan.name}
      </span>
      <ul className="mt-2 space-y-1 text-[0.7rem] text-slate-600">
        <FeatureRow ok label="Inicio, Nosotros, Productos, Contacto y pie de página" />
        <FeatureRow ok={plan.imin} label={plan.iminLabel} />
        <FeatureRow ok label={plan.soporte} />
      </ul>
    </section>
  );
}

function FeatureRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      {ok ? (
        <LuCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <LuMinus className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      )}
      <span className={cn(!ok && "text-slate-400")}>{label}</span>
    </li>
  );
}

/* --------------------------- Tipografia (Google Fonts) ------------------------ */

type FontEntry = { family: string; category: string };

/** Construye el href css2 de Google Fonts para una o varias familias. */
function googleFontsHref(families: string[], weights = "wght@400;600;700"): string {
  const uniq = Array.from(new Set(families.map((f) => f.trim()).filter(Boolean)));
  if (uniq.length === 0) return "";
  // El endpoint css2 espera "+" para los espacios en el nombre de la familia.
  const fam = uniq.map((f) => `family=${f.replace(/\s+/g, "+")}:${weights}`).join("&");
  return `https://fonts.googleapis.com/css2?${fam}&display=swap`;
}

// Hrefs de fuentes ya insertados en el head (dedup por sesion).
const injectedFontHrefs = new Set<string>();

/** Inserta un <link> de Google Fonts en el head, deduplicado por href. */
function useGoogleFontLink(href: string) {
  useEffect(() => {
    if (!href || injectedFontHrefs.has(href)) return;
    injectedFontHrefs.add(href);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-gfont", "1");
    document.head.appendChild(link);
  }, [href]);
}

// Cache a nivel de modulo: el catalogo se pide una sola vez por sesion.
let fontCatalogCache: FontEntry[] | null = null;
let fontCatalogPromise: Promise<FontEntry[]> | null = null;

function loadFontCatalog(): Promise<FontEntry[]> {
  if (fontCatalogCache) return Promise.resolve(fontCatalogCache);
  if (!fontCatalogPromise) {
    fontCatalogPromise = fetch("/api/fonts")
      .then((r) => r.json())
      .then((data: { fonts?: FontEntry[] }) => {
        fontCatalogCache = data.fonts ?? [];
        return fontCatalogCache;
      })
      .catch(() => {
        fontCatalogCache = [];
        return fontCatalogCache;
      });
  }
  return fontCatalogPromise;
}

/** Fila de tipografia con selector buscable del catalogo de Google Fonts. */
function FontField({
  label,
  value,
  isDefault,
  onCommit,
  onReset,
}: {
  label: string;
  value: string;
  isDefault: boolean;
  onCommit: (family: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<FontEntry[]>(fontCatalogCache ?? []);
  const [query, setQuery] = useState("");
  useBuildModalLock(open);

  useEffect(() => {
    if (open && catalog.length === 0) loadFontCatalog().then(setCatalog);
  }, [open, catalog.length]);

  // La fuente actual se carga para mostrar su nombre en su propia tipografia.
  useGoogleFontLink(googleFontsHref([value]));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? catalog.filter((f) => f.family.toLowerCase().includes(q)) : catalog;
    return list.slice(0, 60);
  }, [catalog, query]);

  // Carga las familias visibles para previsualizar cada nombre en su fuente.
  useGoogleFontLink(googleFontsHref(results.map((f) => f.family), "wght@400"));

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="w-12 shrink-0 text-[0.62rem] font-medium text-slate-500">{label}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-left transition hover:border-slate-300"
        >
          <span className="truncate text-[0.72rem] text-slate-800" style={{ fontFamily: fontStackOf(value, "sans") }}>
            {value}
          </span>
          <LuChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
        {!isDefault ? (
          <button
            type="button"
            onClick={onReset}
            title="Volver al default del template"
            className="shrink-0 text-[0.6rem] text-slate-400 underline"
          >
            Reset
          </button>
        ) : null}
      </div>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              onWheel={(event) => event.preventDefault()}
              onTouchMove={(event) => event.preventDefault()}
            >
              <button
                type="button"
                aria-label="Cerrar"
                className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`Fuente de ${label}`}
                className="relative z-10 flex max-h-[80vh] w-full max-w-[360px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_30px_100px_rgba(15,23,42,0.45)]"
              >
                <p className="mb-2 text-[0.72rem] font-semibold text-slate-700">Fuente de {label.toLowerCase()}</p>
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar en Google Fonts..."
                  className="mb-2 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[0.75rem] text-slate-700 outline-none focus:border-sky-400"
                />
                <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
                  {results.length === 0 ? (
                    <p className="py-6 text-center text-[0.7rem] text-slate-400">
                      {catalog.length === 0 ? "Cargando catalogo..." : "Sin resultados."}
                    </p>
                  ) : (
                    results.map((f) => (
                      <button
                        key={f.family}
                        type="button"
                        onClick={() => {
                          onCommit(f.family);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition hover:bg-slate-100",
                          f.family === value ? "bg-sky-50 ring-1 ring-sky-200" : "",
                        )}
                      >
                        <span
                          className="truncate text-[0.9rem] text-slate-800"
                          style={{ fontFamily: fontStackOf(f.family, f.category === "serif" ? "serif" : "sans") }}
                        >
                          {f.family}
                        </span>
                        <span className="shrink-0 text-[0.55rem] uppercase tracking-wide text-slate-400">{f.category}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Tres circulos con la paleta del template (fondo, tono medio, texto): un
 * vistazo de "como pinta la web" antes de elegirla. */
function TemplateSwatch({ tokens }: { tokens: TemplateTokens }) {
  const palette = [tokens.surface, tokens.muted, tokens.ink];
  return (
    <div className="flex items-center justify-center gap-1">
      {palette.map((color, i) => (
        <span
          key={i}
          className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

/** Tarjeta con miniatura visual (para variantes de navbar / footer). */
function ThumbCard({
  active,
  onClick,
  name,
  thumb,
  disabled = false,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  name: string;
  thumb: React.ReactNode;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-lg border p-1.5 text-left transition",
        active ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300",
        disabled && "cursor-not-allowed opacity-55 hover:border-slate-200",
      )}
    >
      {thumb}
      <span className="mt-1 flex items-center gap-1 text-[0.7rem] font-semibold text-slate-800">
        {disabled ? <LuLock className="h-3 w-3" /> : null}
        {name}
        {badge ? <span className="ml-auto text-[0.55rem] font-medium text-sky-700">{badge}</span> : null}
      </span>
    </button>
  );
}

const Bar = ({ className }: { className?: string }) => (
  <div className={cn("rounded-full bg-slate-400", className)} />
);

/** Miniatura del navbar segun su variante. */
function NavbarThumb({ variant }: { variant: NavbarVariant }) {
  const logo = <div className="h-2 w-5 rounded-sm bg-slate-500" />;
  const links = (
    <div className="flex gap-1">
      <Bar className="h-1 w-2.5" />
      <Bar className="h-1 w-2.5" />
      <Bar className="h-1 w-2.5" />
    </div>
  );
  const pill = <div className="h-2.5 w-3.5 rounded-full bg-slate-800" />;
  const burger = (
    <div className="flex flex-col gap-0.5">
      <div className="h-0.5 w-2.5 rounded-full bg-slate-500" />
      <div className="h-0.5 w-2.5 rounded-full bg-slate-500" />
      <div className="h-0.5 w-2.5 rounded-full bg-slate-500" />
    </div>
  );
  return (
    <div className="flex h-9 w-full items-center rounded-md border border-slate-200 bg-white px-1.5">
      {variant === "centered" ? (
        <div className="mx-auto flex flex-col items-center gap-1">
          {logo}
          {links}
        </div>
      ) : (
        <>
          {logo}
          <div className="ml-auto flex items-center gap-1.5">
            {variant === "minimal" ? burger : links}
            {variant === "cta" ? pill : null}
          </div>
        </>
      )}
    </div>
  );
}

/** Miniatura del footer segun su variante. */
function FooterThumb({ variant }: { variant: FooterVariant }) {
  const dots = (
    <div className="flex gap-1">
      <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
    </div>
  );
  const column = (
    <div className="flex flex-col gap-0.5">
      <div className="h-0.5 w-3 rounded-full bg-slate-600" />
      <div className="h-0.5 w-2 rounded-full bg-slate-700" />
      <div className="h-0.5 w-2.5 rounded-full bg-slate-700" />
    </div>
  );
  const input = <div className="h-2 w-6 rounded-sm bg-slate-600" />;
  return (
    <div className="flex h-9 w-full items-center rounded-md bg-slate-800 px-1.5">
      {variant === "simple" ? (
        <>
          <div className="h-2 w-5 rounded-sm bg-slate-400" />
          <div className="ml-auto">{dots}</div>
        </>
      ) : null}
      {variant === "social" ? <div className="mx-auto">{dots}</div> : null}
      {variant === "columns" ? (
        <>
          <div className="flex gap-1.5">
            {column}
            {column}
          </div>
          <div className="ml-auto">{dots}</div>
        </>
      ) : null}
      {variant === "newsletter" ? (
        <>
          <div className="flex items-center gap-1.5">
            {column}
            {input}
          </div>
          <div className="ml-auto">{dots}</div>
        </>
      ) : null}
      {variant === "map" ? (
        <>
          <div className="grid h-6 w-8 place-items-center rounded-sm bg-slate-600">
            <LuMapPin className="h-3 w-3 text-slate-300" />
          </div>
          <div className="ml-1.5 flex gap-1.5">{column}</div>
          <div className="ml-auto">{dots}</div>
        </>
      ) : null}
    </div>
  );
}

/* --------------------------- Paleta (draggable) ------------------------ */

function PaletteItem({ widget, onAdd, selected = false }: { widget: WidgetDef; onAdd: () => void; selected?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new:${widget.id}`,
    data: { kind: "new", widget },
  });
  const Icon = widget.icon;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onAdd}
      role="button"
      tabIndex={0}
      title={`${widget.description} · arrastra al body o haz clic para agregar`}
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-left transition hover:border-slate-300 hover:bg-slate-50 active:cursor-grabbing",
        selected && "border-sky-400 bg-sky-50 ring-1 ring-sky-200",
        isDragging && "opacity-40",
      )}
    >
      <LuGripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.78rem] font-medium text-slate-800">{widget.name}</span>
        <span className="block truncate text-[0.66rem] text-slate-400">{widget.description}</span>
      </span>
    </div>
  );
}

/* ========================= Edicion inline ============================== */

type EditableTextProps = {
  value: string;
  onCommit: TextCommit;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
};

type GradientDirection = "right" | "br" | "bottom" | "bl" | "left" | "tl" | "top" | "tr";
const GRADIENT_DIRECTIONS: { id: GradientDirection; label: string; css: string }[] = [
  { id: "right", label: "→", css: "to right" }, { id: "br", label: "↘", css: "135deg" },
  { id: "bottom", label: "↓", css: "to bottom" }, { id: "bl", label: "↙", css: "225deg" },
  { id: "left", label: "←", css: "to left" }, { id: "tl", label: "↖", css: "315deg" },
  { id: "top", label: "↑", css: "to top" }, { id: "tr", label: "↗", css: "45deg" },
];
const gradientDirectionCss = (direction: GradientDirection) => GRADIENT_DIRECTIONS.find((item) => item.id === direction)?.css ?? "to right";

type TextStyle = { fill: "solid" | "gradient"; color: string; color2: string; direction: GradientDirection };
type TextCommit = ((value: string) => void) & { styleValue?: string; onStyleCommit?: (value: string) => void };
const DEFAULT_TEXT_STYLE: TextStyle = { fill: "solid", color: "", color2: "", direction: "right" };

function parseTextStyle(raw?: string): TextStyle {
  if (!raw) return DEFAULT_TEXT_STYLE;
  try { return { ...DEFAULT_TEXT_STYLE, ...(JSON.parse(raw) as Partial<TextStyle>) }; } catch { return DEFAULT_TEXT_STYLE; }
}

function textStyleCss(raw: string | undefined, allowGradient: boolean): React.CSSProperties {
  const value = parseTextStyle(raw);
  if (!value.color) return {};
  if (value.fill === "gradient" && allowGradient) {
    const direction = gradientDirectionCss(value.direction);
    return { backgroundImage: `linear-gradient(${direction}, ${value.color}, ${value.color2 || value.color})`, backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" };
  }
  return { color: value.color, backgroundImage: "none", WebkitTextFillColor: value.color };
}

function makeTextCommit(commit: (key: string, value: string) => void, key: string, styleValue?: string): TextCommit {
  const handler = ((value: string) => commit(key, value)) as TextCommit;
  handler.styleValue = styleValue;
  handler.onStyleCommit = (value) => commit(`${key}:textStyle`, value);
  return handler;
}

const EditableText = memo(function EditableText({
  value,
  onCommit,
  as: Tag = "span",
  className,
  style,
  multiline,
}: EditableTextProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [tab, setTab] = useState<"text" | "color">("text");
  const textStyle = parseTextStyle(onCommit.styleValue);
  const allowGradient = Tag === "h1" || Tag === "h2" || Tag === "h3";
  const effectiveTextStyle = allowGradient ? textStyle : { ...textStyle, fill: "solid" as const };
  const updateTextStyle = (next: TextStyle) => onCommit.onStyleCommit?.(JSON.stringify(next));
  const Wrapper = Tag === "span" ? "span" : "div";
  const modal = open ? (
    <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-950/45" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Editar texto" className="relative z-10 w-full max-w-[380px] rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl">
        <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-white"><LuPencil className="h-3.5 w-3.5" /></span><p className="text-sm font-semibold">Editar texto</p></div>
        <div className="mt-3 grid grid-cols-2 rounded-lg bg-slate-100 p-0.5"><button type="button" onClick={() => setTab("text")} className={cn("rounded-md py-1.5 text-xs font-medium", tab === "text" ? "bg-white shadow-sm" : "text-slate-400")}>Texto</button><button type="button" onClick={() => setTab("color")} className={cn("rounded-md py-1.5 text-xs font-medium", tab === "color" ? "bg-white shadow-sm" : "text-slate-400")}>Color</button></div>
        {tab === "text" ? (multiline ? <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} className="mt-3 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" /> : <input value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400" />) : (
          <div className="mt-3 space-y-3">
            {allowGradient ? <div className="grid grid-cols-2 rounded-md bg-slate-100 p-0.5">{(["solid", "gradient"] as const).map((fill) => <button key={fill} type="button" onClick={() => updateTextStyle({ ...effectiveTextStyle, fill })} className={cn("rounded px-2 py-1 text-xs", effectiveTextStyle.fill === fill ? "bg-white shadow-sm" : "text-slate-400")}>{fill === "solid" ? "Solido" : "Gradiente"}</button>)}</div> : <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-400">Este texto utiliza color solido.</p>}
            <div className="flex items-end gap-3"><label className="text-xs text-slate-500">Color<input type="color" value={effectiveTextStyle.color || "#111827"} onChange={(event) => updateTextStyle({ ...effectiveTextStyle, color: event.target.value })} className="mt-1 block h-9 w-12" /></label>{effectiveTextStyle.fill === "gradient" ? <label className="text-xs text-slate-500">Final<input type="color" value={effectiveTextStyle.color2 || effectiveTextStyle.color || "#0ea5e9"} onChange={(event) => updateTextStyle({ ...effectiveTextStyle, color2: event.target.value })} className="mt-1 block h-9 w-12" /></label> : null}{onCommit.styleValue ? <button type="button" onClick={() => onCommit.onStyleCommit?.("")} className="ml-auto pb-2 text-xs text-slate-400 underline">Plantilla</button> : null}</div>
            {effectiveTextStyle.fill === "gradient" ? <div className="grid grid-cols-4 gap-1">{GRADIENT_DIRECTIONS.map(({ id, label }) => <button key={id} type="button" onClick={() => updateTextStyle({ ...effectiveTextStyle, direction: id })} className={cn("rounded border py-1 text-sm", effectiveTextStyle.direction === id ? "border-sky-500 bg-sky-50" : "border-slate-200")}>{label}</button>)}</div> : null}
          </div>
        )}
        <div className="mt-3 flex gap-2"><button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-md border border-slate-200 py-2 text-xs font-medium text-slate-500">Cancelar</button><button type="button" onClick={() => { onCommit(draft); setOpen(false); }} className="flex-1 rounded-md bg-slate-900 py-2 text-xs font-medium text-white">Aplicar</button></div>
      </div>
    </div>
  ) : null;
  return (
    <Wrapper className={cn("group/text relative", Tag === "span" ? "inline-block" : "block")}>
    <Tag
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      title="Haz clic para editar este texto"
      onBlur={(event) => {
        const next = event.currentTarget.textContent ?? "";
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={cn(
        "cursor-text rounded-[3px] outline-1 outline-dashed outline-transparent transition-[outline-color] hover:outline-sky-400/70 focus:outline-2 focus:outline-sky-500",
        className,
      )}
      style={style}
    >
      <span style={textStyleCss(onCommit.styleValue, allowGradient)}>{value}</span>
    </Tag>
    <button type="button" onClick={(event) => { event.stopPropagation(); setDraft(value); setTab("text"); setOpen(true); }} aria-label="Editar texto" title="Editar texto" className="absolute -right-2 -top-2 z-30 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-600 opacity-0 shadow transition hover:text-sky-600 group-hover/text:opacity-100 group-focus-within/text:opacity-100"><LuPencil className="h-3 w-3" /></button>
    {modal ? createPortal(modal, document.body) : null}
    </Wrapper>
  );
});

type EditableImageProps = {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  fit?: "cover" | "contain";
  bgClass?: string;
};

function useBuildModalLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const preview = document.querySelector<HTMLElement>("[data-build-preview-scroll]");
    const previous = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
      preview: preview?.style.overflow ?? "",
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (preview) preview.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous.body;
      document.documentElement.style.overflow = previous.html;
      if (preview) preview.style.overflow = previous.preview;
    };
  }, [open]);
}

function EditableImage({ value, onCommit, className, style, fit = "cover", bgClass = "bg-slate-200" }: EditableImageProps) {
  const [open, setOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useBuildModalLock(open);

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite re-subir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 2_000_000) {
      setUploadError("La imagen pesa mas de 2 MB. Usa una mas ligera.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onCommit(reader.result);
        setOpen(false);
        setUploadError(null);
      }
    };
    reader.onerror = () => setUploadError("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div className={cn("group/img relative overflow-hidden", className)} style={style}>
        <div
          className={cn("absolute inset-0 bg-center bg-no-repeat", fit === "contain" ? "bg-contain" : "bg-cover", bgClass)}
          style={{ backgroundImage: `url("${value}")` }}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/0 opacity-0 transition group-hover/img:bg-slate-950/35 group-hover/img:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[0.68rem] font-medium text-slate-800 shadow">
            <LuImagePlus className="h-3.5 w-3.5" />
            Cambiar
          </span>
        </button>
      </div>

      {open ? createPortal(
        <div
          className="pointer-events-auto fixed inset-0 z-[10000] flex items-center justify-center overscroll-none p-4"
          onWheel={(event) => event.preventDefault()}
          onTouchMove={(event) => event.preventDefault()}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div role="dialog" aria-modal="true" aria-label="Cambiar imagen" className="relative z-10 w-full max-w-[340px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0_30px_100px_rgba(15,23,42,0.45)]">
            <p className="mb-1.5 text-[0.72rem] font-semibold text-slate-700">Cambiar imagen</p>

            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 py-1.5 text-[0.72rem] font-medium text-white transition hover:bg-slate-800"
            >
              <LuUpload className="h-3.5 w-3.5" />
              Subir desde tu equipo
            </button>
            {uploadError ? (
              <p className="mt-1 text-[0.64rem] text-rose-600">{uploadError}</p>
            ) : null}

            <p className="mb-1 mt-3 text-[0.64rem] text-slate-400">O elige una:</p>
            <div className="grid grid-cols-3 gap-1.5">
              {STOCK_IMAGES.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    onCommit(src);
                    setOpen(false);
                  }}
                  className={cn(
                    "aspect-square rounded-md border bg-cover bg-center transition hover:ring-2 hover:ring-sky-400",
                    src === value ? "border-sky-500 ring-1 ring-sky-500" : "border-slate-200",
                  )}
                  style={{ backgroundImage: `url("${src}")` }}
                />
              ))}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

/* ========================= Video editable ============================= */

/** Extrae el id de un video de YouTube desde varias formas de URL; null si no lo es. */
function parseYouTubeId(url: string): string | null {
  const match = url
    .trim()
    .match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

type EditableVideoProps = {
  value: string;
  defaultSrc: string;
  onCommit: (next: string) => void;
  className?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onPlayingChange?: (playing: boolean) => void;
};

/**
 * Video del widget bg-video: reproduce mp4 (S3 por default) o embebe YouTube.
 * Permite pegar un link de YouTube (se guarda), o subir un archivo local que se
 * ve SOLO en la vista previa (no persiste: el bucket S3 es de solo lectura).
 */
function EditableVideo({ value, defaultSrc, onCommit, className, videoRef, onPlayingChange }: EditableVideoProps) {
  const [open, setOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useBuildModalLock(open);

  // Fuente efectiva: el archivo local (efimero) tiene prioridad sobre lo guardado.
  const src = localPreview ?? value ?? defaultSrc;
  const youtubeId = parseYouTubeId(src);

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    setOpen(false);
  }

  return (
    <>
      {youtubeId ? (
        <iframe
          className={className}
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          ref={videoRef}
          className={className}
          src={src}
          controls
          playsInline
          preload="metadata"
          onPlay={() => onPlayingChange?.(true)}
          onPause={() => onPlayingChange?.(false)}
        />
      )}

      <button
        type="button"
        onClick={() => {
          setUrlDraft(parseYouTubeId(value) ? value : "");
          setOpen(true);
        }}
        className="absolute bottom-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[0.68rem] font-medium text-slate-800 shadow"
      >
        <LuVideo className="h-3.5 w-3.5" />
        Cambiar video
      </button>

      {open ? createPortal(
        <div
          className="pointer-events-auto fixed inset-0 z-[10000] flex items-center justify-center overscroll-none p-4"
          onWheel={(event) => event.preventDefault()}
          onTouchMove={(event) => event.preventDefault()}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div role="dialog" aria-modal="true" aria-label="Cambiar video" className="relative z-10 w-full max-w-[360px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0_30px_100px_rgba(15,23,42,0.45)]">
            <p className="mb-1.5 text-[0.72rem] font-semibold text-slate-700">Cambiar video</p>

            <input ref={fileRef} type="file" accept="video/*" hidden onChange={onPickFile} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 py-1.5 text-[0.72rem] font-medium text-white transition hover:bg-slate-800"
            >
              <LuUpload className="h-3.5 w-3.5" />
              Subir desde tu equipo
            </button>
            <p className="mt-1 text-[0.6rem] text-slate-400">El video subido se ve solo en la vista previa; no se publica.</p>

            <p className="mb-1 mt-3 text-[0.64rem] text-slate-400">O pega un link de YouTube:</p>
            <div className="flex gap-1.5">
              <input
                value={urlDraft}
                onChange={(event) => setUrlDraft(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[0.72rem] text-slate-700 outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => {
                  const next = urlDraft.trim();
                  if (parseYouTubeId(next)) {
                    if (localPreview) URL.revokeObjectURL(localPreview);
                    setLocalPreview(null);
                    onCommit(next);
                    setOpen(false);
                  }
                }}
                className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-[0.72rem] font-medium text-slate-700"
              >
                Usar
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (localPreview) URL.revokeObjectURL(localPreview);
                setLocalPreview(null);
                onCommit(defaultSrc);
                setOpen(false);
              }}
              className="mt-3 w-full rounded-md border border-slate-200 py-1.5 text-[0.7rem] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Usar el video por defecto
            </button>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

/**
 * Widget de video de fondo en el preview: el video (mp4/YouTube) al fondo, la
 * tela de gradiente encima (sin bloquear), y un boton central que reproduce/
 * pausa el video de verdad. El titulo sigue editable. Para YouTube se ocultan
 * los controles propios (el iframe trae los suyos).
 */
function BgVideoWidget({
  videoValue,
  onCommitVideo,
  titleValue,
  onCommitTitle,
  cloth,
  headingStyle,
}: {
  videoValue: string;
  onCommitVideo: (next: string) => void;
  titleValue: string;
  onCommitTitle: TextCommit;
  cloth?: React.CSSProperties;
  headingStyle: React.CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const isYouTube = parseYouTubeId(videoValue) !== null;

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <section className={BG_VIDEO.section} style={{ backgroundColor: "#020617", color: "#fff" }}>
      <EditableVideo
        value={videoValue}
        defaultSrc={WIDGET_DEFAULTS["bg-video"].video}
        onCommit={onCommitVideo}
        className={BG_VIDEO.media}
        videoRef={videoRef}
        onPlayingChange={setPlaying}
      />
      {cloth ? <div className={BG_VIDEO.cloth} style={cloth} /> : null}
      <div className={BG_VIDEO.overlay}>
        {!isYouTube ? (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pausar video" : "Reproducir video"}
            className="pointer-events-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:bg-white"
          >
            {playing ? <LuPause className="h-6 w-6" /> : <LuPlay className="h-6 w-6 translate-x-0.5" />}
          </button>
        ) : null}
        <EditableText
          as="h3"
          value={titleValue}
          onCommit={onCommitTitle}
          className="pointer-events-auto [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]"
          style={headingStyle}
        />
      </div>
    </section>
  );
}

/* ======================= Botones editables ============================= */

/** Convierte un hex #rrggbb a rgba con alfa. */
function hexAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** CSS del boton segun el estilo elegido (solido / gradiente / opaco). */
function buttonCss(
  bs: ButtonStyle,
  accent: (typeof BUILD_PLANS)[BuildPlanId],
  radius: number,
): React.CSSProperties {
  const c1 = bs.color || accent.accent;
  const c2 = bs.color2 || accent.accentText;
  const base: React.CSSProperties = { borderRadius: radius / 2 };
  if (bs.fill === "gradient") {
    const dir = bs.direction === "br" ? "135deg" : bs.direction === "bottom" ? "to bottom" : "to right";
    return { ...base, backgroundImage: `linear-gradient(${dir}, ${c1}, ${c2})`, color: "#fff" };
  }
  if (bs.fill === "soft") {
    return { ...base, backgroundColor: hexAlpha(c1, 0.16), color: c1 };
  }
  return { ...base, backgroundColor: c1, color: "#fff" };
}

/** Lee el estilo de un boton guardado en content (JSON) con respaldo al default. */
function parseBtnStyle(raw?: string): ButtonStyle {
  if (!raw) return DEFAULT_BUTTON_STYLE;
  try {
    const parsed = JSON.parse(raw) as Partial<ButtonStyle>;
    if (parsed && typeof parsed === "object" && "fill" in parsed) {
      return { ...DEFAULT_BUTTON_STYLE, ...parsed };
    }
  } catch {
    /* respaldo abajo */
  }
  return DEFAULT_BUTTON_STYLE;
}

/** Controles del estilo de botones (usados en el popover por componente). */
function ButtonStyleControls({
  value,
  onChange,
  accent,
}: {
  value: ButtonStyle;
  onChange: (style: ButtonStyle) => void;
  accent: (typeof BUILD_PLANS)[BuildPlanId];
}) {
  const c1 = value.color || accent.accent;
  const c2 = value.color2 || accent.accentText;
  return (
    <div className="space-y-2">
      <div className="inline-flex w-full rounded-md border border-slate-200 bg-slate-50 p-0.5">
        {BUTTON_FILLS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange({ ...value, fill: f.id })}
            className={cn(
              "flex-1 rounded px-2 py-1 text-[0.7rem] font-medium transition-colors",
              value.fill === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[0.7rem] text-slate-600">
          <span
            className="relative h-6 w-6 overflow-hidden rounded-md border border-slate-200"
            style={{ backgroundColor: c1 }}
          >
            <input
              type="color"
              value={c1}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              className="absolute -inset-1 h-8 w-8 cursor-pointer opacity-0"
              aria-label="Color del boton"
            />
          </span>
          {value.fill === "gradient" ? "Inicio" : "Color"}
        </label>
        {value.fill === "gradient" ? (
          <label className="flex items-center gap-1.5 text-[0.7rem] text-slate-600">
            <span
              className="relative h-6 w-6 overflow-hidden rounded-md border border-slate-200"
              style={{ backgroundColor: c2 }}
            >
              <input
                type="color"
                value={c2}
                onChange={(e) => onChange({ ...value, color2: e.target.value })}
                className="absolute -inset-1 h-8 w-8 cursor-pointer opacity-0"
                aria-label="Color final del gradiente"
              />
            </span>
            Fin
          </label>
        ) : null}
        {(value.color || value.color2) ? (
          <button
            type="button"
            onClick={() => onChange({ ...value, color: "", color2: "" })}
            className="ml-auto text-[0.66rem] text-slate-400 underline hover:text-slate-600"
          >
            Usar acento
          </button>
        ) : null}
      </div>

      {value.fill === "gradient" ? (
        <div className="inline-flex w-full rounded-md border border-slate-200 bg-slate-50 p-0.5">
          {(["right", "br", "bottom"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ ...value, direction: d })}
              className={cn(
                "flex-1 rounded px-2 py-1 text-[0.66rem] font-medium transition-colors",
                value.direction === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              )}
            >
              {d === "right" ? "→" : d === "br" ? "↘" : "↓"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Boton del sitio con etiqueta editable y lapiz para su estilo (fondo). */
type BtnEdit = { style: ButtonStyle; onChange: (s: ButtonStyle) => void; accent: (typeof BUILD_PLANS)[BuildPlanId] };

/** Lapiz (esquina) + modal para editar el color/relleno de UN boton. */
function ButtonStyleEditor({ edit }: { edit: BtnEdit }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Editar color del boton"
        title="Editar color y relleno de este boton"
        className="absolute -right-2 -top-2 z-20 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-600 opacity-0 shadow transition hover:text-sky-600 group-hover/btn:opacity-100"
      >
        <LuPencil className="h-3 w-3" />
      </button>
      {open ? createPortal(
        <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 cursor-default bg-slate-950/45"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
            <p className="mb-2 text-[0.72rem] font-semibold text-slate-700">Color de este boton</p>
            <ButtonStyleControls value={edit.style} onChange={edit.onChange} accent={edit.accent} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-md bg-slate-900 py-1.5 text-[0.72rem] font-medium text-white"
            >
              Listo
            </button>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

/** Boton con etiqueta editable y su propio lapiz de color (por componente). */
function SiteButton({
  value,
  onCommit,
  css,
  className,
  editable,
}: {
  value: string;
  onCommit: (v: string) => void;
  css: React.CSSProperties;
  className?: string;
  editable?: BtnEdit;
}) {
  return (
    <span className={cn("group/btn relative inline-flex items-center", className)} style={css}>
      <EditableText as="span" value={value} onCommit={onCommit} className="text-inherit" />
      {editable ? <ButtonStyleEditor edit={editable} /> : null}
    </span>
  );
}

/** Boton de etiqueta fija con su propio lapiz de color (por componente). */
function StyledButton({
  label,
  css,
  className,
  editable,
}: {
  label: string;
  css: React.CSSProperties;
  className?: string;
  editable?: BtnEdit;
}) {
  return (
    <span className={cn("group/btn relative inline-flex items-center justify-center", className)} style={css}>
      {label}
      {editable ? <ButtonStyleEditor edit={editable} /> : null}
    </span>
  );
}

/* ============================ Vista previa ============================= */

type PreviewProps = {
  doc: Doc;
  plan: BuildPlanId;
  tokens: TemplateTokens;
  navMode: NavMode;
  activePage: PageId;
  device: "desktop" | "mobile";
  content: Content;
  dragging: boolean;
  onCommit: (key: string, value: string) => void;
  onRemove: (page: PageId, iid: string) => void;
  onNavigate: (page: PageId) => void;
};

function SitePreview(props: PreviewProps) {
  const { doc, tokens, navMode, activePage } = props;
  const accent = BUILD_PLANS[props.plan];
  const visiblePages = navMode === "single" ? PAGES : PAGES.filter((p) => p.id === activePage);

  return (
    <div
      className="flex min-h-[420px] flex-col"
      style={{
        backgroundColor: tokens.surface,
        color: tokens.ink,
        fontFamily: tokens.bodyFamily,
        // Mismo token de radio que el sitio (--radius) para que las clases
        // compartidas rounded-[var(--radius)] rindan igual en el preview.
        ["--radius" as string]: `${tokens.radius}px`,
        filter: tokens.grayscale ? "grayscale(1)" : undefined,
      }}
    >
      <NavbarView {...props} accent={accent} />

      <div className="flex-1">
        {visiblePages.map((page) => {
          const list = doc.pages[page.id];
          const label = pageLabel(doc, page.id);
          return (
            <PageZone
              key={page.id}
              page={page.id}
              label={label}
              count={list.length}
              max={maxWidgetsFor(page.id)}
              items={list.map((i) => i.iid)}
              dragging={props.dragging}
              full={list.length >= maxWidgetsFor(page.id)}
              tokens={tokens}
            >
              {list.length === 0 ? (
                <div className="px-6 py-12 text-center text-xs" style={{ color: tokens.muted }}>
                  {label}: arrastra aqui {maxWidgetsFor(page.id) === 1 ? "un widget" : `hasta ${maxWidgetsFor(page.id)} widgets`}.
                </div>
              ) : (
                list.map((instance) => {
                  const isImageText = instance.widgetId === "image-text";
                  const backgroundFallback = instance.widgetId === "cta-banner"
                    ? accent.accent
                    : instance.widgetId === "bg-video"
                      ? "#020617"
                      : (["text-block", "product-tiers", "stats", "gallery", "promos", "faq"] as WidgetId[]).includes(instance.widgetId)
                        ? tokens.surfaceAlt
                        : tokens.surface;
                  const layout =
                    props.content[`${instance.iid}:layout`] ??
                    WIDGET_DEFAULTS["image-text"].layout;
                  return (
                    <SortableBlock
                      key={instance.iid}
                      iid={instance.iid}
                      widgetId={instance.widgetId}
                      page={page.id}
                      label={WIDGETS_BY_ID[instance.widgetId].name}
                      onRemove={() => props.onRemove(page.id, instance.iid)}
                      controls={
                        <>
                        {isImageText ? (
                          <button
                            type="button"
                            onClick={() =>
                              props.onCommit(
                                `${instance.iid}:layout`,
                                layout === "image-right" ? "image-left" : "image-right",
                              )
                            }
                            title="Cambiar posicion (imagen / texto)"
                            aria-label="Cambiar posicion de imagen y texto"
                            className="pointer-events-auto grid h-6 w-6 place-items-center rounded-md bg-slate-900/70 text-white"
                          >
                            <LuArrowLeftRight className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        {(() => {
                          const isMedia = instance.widgetId === "bg-image" || instance.widgetId === "bg-video";
                          return (
                            <BackgroundEditor
                              title={isMedia ? "Tela de color (50%)" : `Fondo de ${WIDGETS_BY_ID[instance.widgetId].name}`}
                              value={props.content[`${instance.iid}:background`] ?? ""}
                              onChange={(background) => props.onCommit(`${instance.iid}:background`, background)}
                              fallback={isMedia ? accent.accent : backgroundFallback}
                            />
                          );
                        })()}
                        </>
                      }
                    >
                      <PageWidget instance={instance} {...props} accent={accent} />
                    </SortableBlock>
                  );
                })
              )}
            </PageZone>
          );
        })}
      </div>

      <FooterView {...props} accent={accent} />
    </div>
  );
}

type ViewCtx = PreviewProps & { accent: (typeof BUILD_PLANS)[BuildPlanId] };

/** Zona de una pagina: riel con nombre/conteo + droppable + sortable. */
function PageZone({
  page,
  label,
  count,
  max,
  items,
  dragging,
  full,
  tokens,
  children,
}: {
  page: PageId;
  label: string;
  count: number;
  max: number;
  items: string[];
  dragging: boolean;
  full: boolean;
  tokens: TemplateTokens;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `zone:page-${page}`, data: { kind: "zone", page } });
  const overFull = isOver && full;
  return (
    <div
      ref={setNodeRef}
      id={`build-page-${page}`}
      className={cn("scroll-mt-4 transition", dragging && "outline-dashed outline-2 -outline-offset-4")}
      style={
        dragging
          ? { outlineColor: overFull ? "#f59e0b" : isOver ? "#0ea5e9" : `${tokens.muted}44` }
          : undefined
      }
    >
      {/* Riel de pagina del editor: identifica la seccion y su conteo. */}
      <div
        className="flex items-center gap-2 border-b border-dashed px-4 py-1 text-[0.6rem] font-medium uppercase tracking-[0.16em]"
        style={{ color: tokens.muted, borderColor: `${tokens.muted}33`, backgroundColor: tokens.surfaceAlt }}
      >
        <span>{label}</span>
        <span
          className={cn("ml-auto rounded-full px-1.5 tracking-normal", full && "text-amber-600")}
          style={{ backgroundColor: `${tokens.muted}1f` }}
        >
          {count}/{max} widget{max === 1 ? "" : "s"}
        </span>
      </div>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {overFull ? (
        <p className="bg-amber-50 py-1 text-center text-[0.62rem] font-medium text-amber-700">
          {max === 1 ? "Contacto lleva solo 1 bloque (reemplaza el actual)" : `Máximo ${max} bloques por página`}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------- Navbar -------------------------------- */

type ColorEdit = { value: string; onChange: (color: string) => void; fallback: string };

type BackgroundStyle = {
  fill: "solid" | "gradient";
  color: string;
  color2: string;
  direction: GradientDirection;
};

const DEFAULT_BACKGROUND_STYLE: BackgroundStyle = { fill: "solid", color: "", color2: "", direction: "right" };

function parseBackgroundStyle(raw?: string): BackgroundStyle {
  if (!raw) return DEFAULT_BACKGROUND_STYLE;
  if (raw.startsWith("#")) return { ...DEFAULT_BACKGROUND_STYLE, color: raw };
  try {
    return { ...DEFAULT_BACKGROUND_STYLE, ...(JSON.parse(raw) as Partial<BackgroundStyle>) };
  } catch {
    return DEFAULT_BACKGROUND_STYLE;
  }
}

function backgroundCss(raw: string | undefined, fallback: string): React.CSSProperties {
  const value = parseBackgroundStyle(raw);
  const first = value.color || fallback;
  if (value.fill === "gradient") {
    const second = value.color2 || first;
    const direction = gradientDirectionCss(value.direction);
    return { backgroundColor: first, backgroundImage: `linear-gradient(${direction}, ${first}, ${second})` };
  }
  return { backgroundColor: first, backgroundImage: "none" };
}

/**
 * Tela de color/gradiente que se pone DELANTE de imagen o video (opacidad tope
 * 50%) para tintarlos con el juego de colores. undefined si no hay color elegido.
 */
function clothCss(raw: string | undefined): React.CSSProperties | undefined {
  if (!raw) return undefined;
  const value = parseBackgroundStyle(raw);
  if (!value.color) return undefined;
  if (value.fill === "gradient") {
    const direction = gradientDirectionCss(value.direction);
    return { opacity: 0.5, backgroundImage: `linear-gradient(${direction}, ${value.color}, ${value.color2 || value.color})` };
  }
  return { opacity: 0.5, backgroundColor: value.color };
}

function BackgroundEditor({ value, fallback, onChange, title }: { value: string; fallback: string; onChange: (value: string) => void; title: string }) {
  const [open, setOpen] = useState(false);
  const style = parseBackgroundStyle(value);
  const first = style.color || fallback;
  const second = style.color2 || first;
  const update = (next: BackgroundStyle) => onChange(JSON.stringify(next));
  const modal = open ? (
    <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-950/45" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-[280px] rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl">
        <p className="text-[0.72rem] font-semibold">{title}</p>
        <div className="mt-2 grid grid-cols-2 rounded-md bg-slate-100 p-0.5">
          {(["solid", "gradient"] as const).map((fill) => (
            <button key={fill} type="button" onClick={() => update({ ...style, fill })} className={cn("rounded px-2 py-1 text-[0.68rem] font-medium", style.fill === fill ? "bg-white shadow-sm" : "text-slate-400")}>{fill === "solid" ? "Solido" : "Gradiente"}</button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="text-[0.65rem] text-slate-500">Inicio<input type="color" value={first} onChange={(event) => update({ ...style, color: event.target.value })} className="mt-1 block h-8 w-12 cursor-pointer rounded border border-slate-200" /></label>
          {style.fill === "gradient" ? <label className="text-[0.65rem] text-slate-500">Final<input type="color" value={second} onChange={(event) => update({ ...style, color2: event.target.value })} className="mt-1 block h-8 w-12 cursor-pointer rounded border border-slate-200" /></label> : null}
          {value ? <button type="button" onClick={() => onChange("")} className="ml-auto text-[0.65rem] text-slate-400 underline">Plantilla</button> : null}
        </div>
        {style.fill === "gradient" ? <div className="mt-3 grid grid-cols-4 gap-1">{GRADIENT_DIRECTIONS.map(({ id, label }) => <button key={id} type="button" onClick={() => update({ ...style, direction: id })} className={cn("rounded border py-1 text-xs", style.direction === id ? "border-sky-500 bg-sky-50" : "border-slate-200")}>{label}</button>)}</div> : null}
        <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded-md bg-slate-900 py-1.5 text-[0.7rem] font-medium text-white">Listo</button>
      </div>
    </div>
  ) : null;
  return <><button type="button" onClick={() => setOpen(true)} aria-label={`Editar ${title}`} className="pointer-events-auto z-30 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-600 shadow hover:text-sky-600"><LuPencil className="h-3 w-3" /></button>{modal ? createPortal(modal, document.body) : null}</>;
}

const EDITABLE_ICON_OPTIONS = {
  sparkles: { label: "Destellos", icon: LuSparkles },
  layers: { label: "Capas", icon: LuLayers },
  wrench: { label: "Herramienta", icon: LuWrench },
  calendar: { label: "Calendario", icon: LuCalendarClock },
  check: { label: "LuCheck", icon: LuCheck },
  star: { label: "Estrella", icon: LuStar },
  quote: { label: "Testimonio", icon: LuQuote },
  mail: { label: "Correo", icon: LuMailOpen },
  pin: { label: "Ubicacion", icon: LuMapPin },
  play: { label: "Reproducir", icon: LuPlay },
  image: { label: "Imagen", icon: LuImagePlus },
} as const;

type EditableIconId = keyof typeof EDITABLE_ICON_OPTIONS;

const REACT_ICON_LIBRARIES = [
  ["lu", "Lucide"], ["tb", "Tabler"], ["fi", "Feather"], ["pi", "Phosphor"],
  ["fa6", "Font Awesome 6"], ["md", "Material Design"], ["ri", "Remix"],
  ["bs", "Bootstrap"], ["bi", "BoxIcons"], ["ai", "Ant Design"], ["si", "Simple Icons"],
  ["io5", "Ionicons"], ["hi2", "Heroicons"], ["gi", "Game Icons"], ["vsc", "VS Code"],
] as const;

type RemoteIcon = { name: string; svg: string };

function EditableIcon({ value, fallback, onCommit, className }: { value: string; fallback: EditableIconId; onCommit: (value: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState("lu");
  const [query, setQuery] = useState("");
  const [remoteIcons, setRemoteIcons] = useState<RemoteIcon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedSvg, setSelectedSvg] = useState("");
  const iconId = (value in EDITABLE_ICON_OPTIONS ? value : fallback) as EditableIconId;
  const SelectedIcon = EDITABLE_ICON_OPTIONS[iconId].icon;
  const selectedRef = /^([a-z0-9]+):([A-Z][A-Za-z0-9]*)$/.exec(value);

  useEffect(() => {
    const ref = /^([a-z0-9]+):([A-Z][A-Za-z0-9]*)$/.exec(value);
    if (!ref) return;
    let cancelled = false;
    const params = new URLSearchParams({ lib: ref[1], q: ref[2] });
    fetch(`/api/imin/icons?${params.toString()}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("icon")))
      .then((data: { icons: RemoteIcon[] }) => {
        if (!cancelled) setSelectedSvg(data.icons.find((icon) => icon.name === ref[2])?.svg ?? "");
      })
      .catch(() => { if (!cancelled) setSelectedSvg(""); });
    return () => { cancelled = true; };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ lib: library, q: query.trim() });
      fetch(`/api/imin/icons?${params.toString()}`)
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("icons")))
        .then((data: { icons: RemoteIcon[]; total: number }) => { if (!cancelled) { setRemoteIcons(data.icons); setTotal(data.total); } })
        .catch(() => { if (!cancelled) { setRemoteIcons([]); setTotal(0); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [library, open, query]);

  const modal = open ? (
    <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-950/45" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Cambiar icono" className="relative z-10 flex max-h-[85vh] w-full max-w-[620px] flex-col rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl">
        <p className="text-sm font-semibold">Catalogo de React Icons</p>
        <p className="mt-0.5 text-xs text-slate-400">Busca entre las librerias disponibles; la eleccion se guarda solo en este componente.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr]">
          <select value={library} onChange={(event) => setLibrary(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-sky-400">{REACT_ICON_LIBRARIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar icono por nombre..." className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-400" />
        </div>
        <p className="mt-2 text-[0.62rem] text-slate-400">{loading ? "Buscando..." : `${total.toLocaleString()} resultados · mostrando ${remoteIcons.length}`}</p>
        <div className="mt-2 grid grid-cols-5 gap-2 border-b border-slate-100 pb-3 sm:grid-cols-8">
          {(Object.entries(EDITABLE_ICON_OPTIONS) as [EditableIconId, (typeof EDITABLE_ICON_OPTIONS)[EditableIconId]][]).map(([id, option]) => {
            const OptionIcon = option.icon;
            return <button key={id} type="button" title={option.label} onClick={() => { onCommit(id); setOpen(false); }} className={cn("flex h-12 flex-col items-center justify-center gap-1 rounded-lg border text-slate-500 transition hover:border-sky-400 hover:text-sky-600", id === iconId && !selectedRef ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200")}><OptionIcon className="h-4 w-4" /><span className="max-w-full truncate px-1 text-[0.48rem]">{option.label}</span></button>;
          })}
        </div>
        <div className="mt-3 grid min-h-0 flex-1 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">{remoteIcons.map((icon) => <button key={icon.name} type="button" title={icon.name} onClick={() => { setSelectedSvg(icon.svg); onCommit(`${library}:${icon.name}`); setOpen(false); }} className={cn("flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-slate-500 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700", value === `${library}:${icon.name}` ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200")}><span className="text-lg" dangerouslySetInnerHTML={{ __html: icon.svg }} /><span className="w-full truncate px-1 text-[0.48rem]">{icon.name}</span></button>)}</div>
      </div>
    </div>
  ) : null;
  return <><button type="button" onClick={() => setOpen(true)} title="Cambiar icono" aria-label="Cambiar icono" className="pointer-events-auto inline-grid place-items-center rounded transition hover:scale-110 hover:ring-2 hover:ring-sky-400/60">{selectedRef && selectedSvg ? <span className={className} dangerouslySetInnerHTML={{ __html: selectedSvg }} /> : <SelectedIcon className={className} />}</button>{modal ? createPortal(modal, document.body) : null}</>;
}

/** Lapiz (esquina) + modal para editar el color de UN componente. */
function ColorEditor({ edit, title = "Color del componente", compact = false }: { edit: ColorEdit; title?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = edit.value || edit.fallback;
  const modal = open ? (
    <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 cursor-default bg-slate-950/45" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative z-10 w-full max-w-[240px] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
        <p className="mb-2 text-[0.72rem] font-semibold text-slate-700">{title}</p>
        <div className="flex items-center gap-2">
          <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border border-slate-200" style={{ backgroundColor: current }}>
            <input type="color" value={current} onChange={(e) => edit.onChange(e.target.value)} className="absolute -inset-1 h-9 w-9 cursor-pointer opacity-0" aria-label="Color" />
          </label>
          <span className="text-[0.72rem] text-slate-500">{current}</span>
          {edit.value ? (
            <button type="button" onClick={() => edit.onChange("")} className="ml-auto text-[0.66rem] text-slate-400 underline hover:text-slate-600">
              Plantilla
            </button>
          ) : null}
        </div>
        <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded-md bg-slate-900 py-1.5 text-[0.72rem] font-medium text-white">
          Listo
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Editar color"
        title="Editar color de este componente"
        className={cn(
          "z-30 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-600 shadow transition hover:text-sky-600",
          compact ? "pointer-events-auto" : "absolute -right-2 -top-2 opacity-0 group-hover/btn:opacity-100",
        )}
      >
        <LuPencil className="h-3 w-3" />
      </button>
      {modal ? createPortal(modal, document.body) : null}
    </>
  );
}

/** LuMenu hamburguesa funcional: al dar clic despliega los enlaces; trae su pluma. */
function NavMenuButton({
  color,
  colorEdit,
  tokens,
  navMode,
  activePage,
  doc,
  onNavigate,
}: {
  color: string;
  colorEdit: ColorEdit;
  tokens: TemplateTokens;
  navMode: NavMode;
  activePage: PageId;
  doc: Doc;
  onNavigate: (page: PageId) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <span className="group/btn relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Abrir menu"
          aria-expanded={open}
          className="grid h-7 w-7 place-items-center rounded-md transition hover:opacity-70"
          style={{ color }}
        >
          <LuMenu className="h-5 w-5" />
        </button>
        <ColorEditor edit={colorEdit} title="Color del menu" />
      </span>
      {open ? (
        <div
          className="absolute right-0 top-9 z-40 w-40 rounded-lg border p-1 shadow-lg"
          style={{ backgroundColor: tokens.navBg, borderColor: `${tokens.muted}33` }}
        >
          {PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => {
                onNavigate(page.id);
                setOpen(false);
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left text-[0.74rem] transition hover:opacity-70"
              style={{
                color,
                textTransform: tokens.navUppercase ? "uppercase" : "none",
                letterSpacing: tokens.navLetter,
                fontWeight: navMode === "multi" && page.id === activePage ? 700 : 400,
              }}
            >
              {pageLabel(doc, page.id)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavbarView({ doc, tokens, navMode, activePage, device, content, onCommit, onNavigate, accent }: ViewCtx) {
  const variant = doc.navbarVariant;
  const get = (key: string) => content[key] ?? NAV_CONTENT_DEFAULTS[key] ?? "";
  const isMobile = device === "mobile";
  const centered = variant === "centered";
  const navInk = content["chrome:navbar:ink"] || tokens.navInk;
  const inkEdit: ColorEdit = {
    value: content["chrome:navbar:ink"] ?? "",
    onChange: (c) => onCommit("chrome:navbar:ink", c),
    fallback: tokens.navInk,
  };

  const logoMode = (content[NAV_CONTENT.logoMode] ?? NAV_CONTENT_DEFAULTS[NAV_CONTENT.logoMode]) === "image" ? "image" : "text";
  const logo = (
    <span className="group/logo relative inline-flex shrink-0 items-center gap-1">
      {logoMode === "image" ? (
        <EditableImage
          value={resolvePublicAssetUrl(get(NAV_CONTENT.logo))}
          onCommit={(v) => onCommit(NAV_CONTENT.logo, v)}
          className="h-7 w-24 shrink-0"
          fit="contain"
          bgClass="bg-transparent"
        />
      ) : (
        <EditableText
          as="span"
          value={get(NAV_CONTENT.brand)}
          onCommit={makeTextCommit(onCommit, NAV_CONTENT.brand, content[`${NAV_CONTENT.brand}:textStyle`])}
          className="text-base font-bold"
          style={{ color: navInk }}
        />
      )}
      <button
        type="button"
        onClick={() => onCommit(NAV_CONTENT.logoMode, logoMode === "image" ? "text" : "image")}
        title={logoMode === "image" ? "Cambiar el logo a texto" : "Cambiar el logo a imagen"}
        aria-label="Cambiar el logo entre imagen y texto"
        className="rounded-md border border-slate-300 bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition hover:text-slate-800 group-hover/logo:opacity-100"
      >
        <LuArrowLeftRight className="h-3 w-3" />
      </button>
    </span>
  );

  const links =
    variant === "minimal" || isMobile ? (
      <NavMenuButton color={navInk} colorEdit={inkEdit} tokens={tokens} navMode={navMode} activePage={activePage} doc={doc} onNavigate={onNavigate} />
    ) : (
      <span className="group/btn relative inline-flex">
        <div className="flex items-center gap-4 text-[0.72rem]" style={{ color: navInk }}>
          {PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => onNavigate(page.id)}
              className="transition hover:opacity-70"
              style={{
                textTransform: tokens.navUppercase ? "uppercase" : "none",
                letterSpacing: tokens.navLetter,
                fontWeight: navMode === "multi" && page.id === activePage ? 700 : 400,
                opacity: navMode === "multi" && page.id === activePage ? 1 : 0.85,
              }}
            >
              {pageLabel(doc, page.id)}
            </button>
          ))}
        </div>
        <ColorEditor edit={inkEdit} title="Color de los enlaces" />
      </span>
    );

  const ctaStyleKey = `${NAV_CONTENT.cta}:style`;
  const ctaStyle = parseBtnStyle(content[ctaStyleKey]);
  const cta =
    variant === "cta" ? (
      <SiteButton
        value={get(NAV_CONTENT.cta)}
        onCommit={(v) => onCommit(NAV_CONTENT.cta, v)}
        css={buttonCss(ctaStyle, accent, tokens.radius)}
        className="px-3 py-1 text-[0.72rem] font-medium"
        editable={{ style: ctaStyle, onChange: (s) => onCommit(ctaStyleKey, JSON.stringify(s)), accent }}
      />
    ) : null;

  return (
    <nav
      className={cn(
        "sticky top-0 z-20 border-b px-5 py-3",
        centered ? "flex flex-col items-center gap-2" : "flex items-center gap-4",
      )}
      style={{ backgroundColor: tokens.navBg, color: navInk, borderColor: `${tokens.muted}22` }}
    >
      {centered ? (
        <>
          {logo}
          {links}
        </>
      ) : (
        <>
          {logo}
          <div className="ml-auto flex items-center gap-4">
            {links}
            {cta}
          </div>
        </>
      )}
    </nav>
  );
}

/* ------------------------------- Footer -------------------------------- */

const SOCIAL_ICON_OPTIONS = {
  instagram: { label: "Instagram", icon: FaInstagram },
  facebook: { label: "Facebook", icon: FaFacebookF },
  youtube: { label: "YouTube", icon: FaYoutube },
  linkedin: { label: "LinkedIn", icon: FaLinkedinIn },
} as const;

type SocialIconId = keyof typeof SOCIAL_ICON_OPTIONS;

function FooterSocialIcon({ index, content, onCommit, accent, usedIcons }: { index: number; content: Content; onCommit: (key: string, value: string) => void; accent: string; usedIcons: SocialIconId[] }) {
  const [open, setOpen] = useState(false);
  const iconKey = `chrome:footer:social:${index}:icon`;
  const urlKey = `chrome:footer:social:${index}:url`;
  const iconId = (content[iconKey] ?? NAV_CONTENT_DEFAULTS[iconKey] ?? "instagram") as SocialIconId;
  const selected = SOCIAL_ICON_OPTIONS[iconId] ?? SOCIAL_ICON_OPTIONS.instagram;
  const Icon = selected.icon;
  const url = content[urlKey] ?? NAV_CONTENT_DEFAULTS[urlKey] ?? "#";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Editar ${selected.label}`}
        title={`${selected.label} · editar icono y enlace`}
        className="grid h-7 w-7 place-items-center rounded-full transition hover:scale-110"
        style={{ backgroundColor: "rgba(255,255,255,0.1)", color: accent }}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
      {open ? createPortal(
        <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-slate-950/45" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[300px] rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl">
            <p className="text-[0.72rem] font-semibold">Icono y enlace social</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {(Object.entries(SOCIAL_ICON_OPTIONS) as [SocialIconId, (typeof SOCIAL_ICON_OPTIONS)[SocialIconId]][]).map(([id, option]) => {
                const OptionIcon = option.icon;
                return (
                  <button key={id} type="button" disabled={usedIcons.includes(id) && id !== iconId} onClick={() => onCommit(iconKey, id)} title={option.label} className={cn("grid h-10 place-items-center rounded-md border", id === iconId ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500", usedIcons.includes(id) && id !== iconId && "cursor-not-allowed opacity-25")}>
                    <OptionIcon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            <label className="mt-3 block text-[0.64rem] text-slate-500">
              URL del perfil
              <input value={url} onChange={(event) => onCommit(urlKey, event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[0.72rem] outline-none focus:border-sky-400" />
            </label>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { onCommit(`chrome:footer:social:${index}:enabled`, "false"); setOpen(false); }} className="grid h-8 w-8 place-items-center rounded-md border border-rose-200 text-rose-500" aria-label={`Quitar ${selected.label}`}><LuMinus className="h-3.5 w-3.5" /></button>
              <a href={url} target="_blank" rel="noreferrer" className="flex-1 rounded-md border border-slate-200 py-1.5 text-center text-[0.7rem] font-medium">Probar enlace</a>
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-md bg-slate-900 py-1.5 text-[0.7rem] font-medium text-white">Listo</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function FooterView({ doc, tokens, device, content, onCommit, onNavigate, accent }: ViewCtx) {
  const variant = doc.footerVariant;
  const get = (key: string) => content[key] ?? NAV_CONTENT_DEFAULTS[key] ?? "";
  const isMobile = device === "mobile";
  const sendStyleKey = `${NAV_CONTENT.newsletter}:send:style`;
  const sendStyle = parseBtnStyle(content[sendStyleKey]);
  const footerBg = content[NAV_CONTENT.footerBg] || tokens.footerBg;
  const socialSlots = [0, 1, 2, 3].filter((index) => content[`chrome:footer:social:${index}:enabled`] !== "false");
  const uniqueSocialSlots = socialSlots.filter((index, position, slots) => {
    const icon = content[`chrome:footer:social:${index}:icon`] ?? NAV_CONTENT_DEFAULTS[`chrome:footer:social:${index}:icon`];
    return slots.findIndex((other) => (content[`chrome:footer:social:${other}:icon`] ?? NAV_CONTENT_DEFAULTS[`chrome:footer:social:${other}:icon`]) === icon) === position;
  });
  const usedSocialIcons = uniqueSocialSlots.map((index) => (content[`chrome:footer:social:${index}:icon`] ?? NAV_CONTENT_DEFAULTS[`chrome:footer:social:${index}:icon`]) as SocialIconId);

  const addSocial = () => {
    const index = [0, 1, 2, 3].find((slot) => !uniqueSocialSlots.includes(slot));
    const icon = (Object.keys(SOCIAL_ICON_OPTIONS) as SocialIconId[]).find((id) => !usedSocialIcons.includes(id));
    if (index === undefined || !icon) return;
    onCommit(`chrome:footer:social:${index}:icon`, icon);
    onCommit(`chrome:footer:social:${index}:enabled`, "true");
  };

  const social = (
    <div className={cn("flex items-center gap-2", variant === "social" && "justify-center")}>
      {uniqueSocialSlots.map((i) => <FooterSocialIcon key={i} index={i} content={content} onCommit={onCommit} accent={accent.accent} usedIcons={usedSocialIcons} />)}
      {uniqueSocialSlots.length < 4 ? <button type="button" onClick={addSocial} className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-current opacity-50 transition hover:opacity-100" aria-label="Agregar red social"><LuPlus className="h-3.5 w-3.5" /></button> : null}
    </div>
  );

  const columns = (
    <div className={cn("gap-8", isMobile ? "flex flex-col" : "flex flex-wrap")}>
      {([NAV_CONTENT.c1, NAV_CONTENT.c2, NAV_CONTENT.c3] as const).map((col, columnIndex) => (
        <div key={col} className="space-y-1">
          <EditableText
            as="p"
            value={get(col)}
            onCommit={(v) => onCommit(col, v)}
            className="text-[0.72rem] font-semibold"
          />
          {([
            [PAGES[0], PAGES[2]],
            [PAGES[1], PAGES[3]],
            [PAGES[0], PAGES[3]],
          ][columnIndex]).map((page) => (
            <button key={page.id} type="button" onClick={() => onNavigate(page.id)} className="block text-[0.62rem] opacity-60 transition hover:opacity-100">
              {pageLabel(doc, page.id)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  const newsletter = (
    <div className="min-w-[180px] space-y-2">
      <EditableText
        as="p"
        value={get(NAV_CONTENT.newsletter)}
        onCommit={(v) => onCommit(NAV_CONTENT.newsletter, v)}
        className="text-[0.72rem] font-semibold"
      />
      <div className="flex gap-1.5">
        <span className="flex-1 rounded-md bg-white/10 px-2 py-1 text-[0.62rem] opacity-70">tu@correo.com</span>
        <StyledButton
          label="Enviar"
          css={buttonCss(sendStyle, accent, tokens.radius)}
          className="px-2 py-1 text-[0.62rem] font-medium"
          editable={{ style: sendStyle, onChange: (s) => onCommit(sendStyleKey, JSON.stringify(s)), accent }}
        />
      </div>
    </div>
  );

  const map = (
    <FooterMap
      query={get(NAV_CONTENT.mapQuery)}
      onCommit={(v) => onCommit(NAV_CONTENT.mapQuery, v)}
      radius={tokens.radius}
    />
  );

  const brand = (
    <EditableText
      as="span"
      value={get(NAV_CONTENT.brand)}
      onCommit={(v) => onCommit(NAV_CONTENT.brand, v)}
      className="text-sm font-semibold"
      style={{ color: accent.accent }}
    />
  );

  return (
    <footer className="group/footer relative px-6 py-6" style={{ backgroundColor: footerBg, color: tokens.footerInk }}>
      <div className="absolute right-3 top-3 z-20 opacity-0 transition group-hover/footer:opacity-100">
        <ColorEditor compact title="Fondo del footer" edit={{ value: content[NAV_CONTENT.footerBg] ?? "", onChange: (color) => onCommit(NAV_CONTENT.footerBg, color), fallback: tokens.footerBg }} />
      </div>
      {variant === "simple" ? (
        <div className={cn("items-center gap-4", isMobile ? "flex flex-col" : "flex")}>
          {brand}
          <div className={isMobile ? "" : "ml-auto"}>{social}</div>
        </div>
      ) : null}

      {variant === "social" ? <div className="flex flex-col items-center gap-3">{social}</div> : null}

      {variant === "columns" ? (
        <div className={cn("gap-8", isMobile ? "flex flex-col" : "flex")}>
          {columns}
          <div className={isMobile ? "" : "ml-auto"}>{social}</div>
        </div>
      ) : null}

      {variant === "newsletter" ? (
        <div className={cn("gap-8", isMobile ? "flex flex-col" : "flex flex-wrap")}>
          {columns}
          {newsletter}
          <div className={isMobile ? "" : "ml-auto"}>{social}</div>
        </div>
      ) : null}

      {variant === "map" ? (
        <div className={cn("gap-6", isMobile ? "flex flex-col" : "flex")}>
          <div className={isMobile ? "" : "w-1/2"}>{map}</div>
          <div className="flex-1 space-y-3">
            {columns}
            {social}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-[0.6rem] opacity-50">© 2026 · Hecho con el Constructor Appddata</p>
    </footer>
  );
}

/** Mapa de Google embebido en el footer con popup para elegir la ubicacion. */
function FooterMap({
  query,
  onCommit,
  radius,
}: {
  query: string;
  onCommit: (value: string) => void;
  radius: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => setSearchQuery(draft.trim()), 450);
    return () => window.clearTimeout(timeout);
  }, [draft, open]);

  const srcFor = (value: string) =>
    `https://maps.google.com/maps?q=${encodeURIComponent(value || "Mexico")}&z=14&output=embed`;
  const src = srcFor(query);
  const previewSrc = srcFor(searchQuery);

  return (
    <>
      <div className="relative overflow-hidden" style={{ borderRadius: radius }}>
        <iframe
          key={src}
          title="Ubicacion"
          src={src}
          className="h-40 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <button
          type="button"
          onClick={() => {
            setDraft(query);
            setSearchQuery(query);
            setOpen(true);
          }}
          className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[0.68rem] font-medium text-slate-800 shadow"
        >
          <LuMapPin className="h-3.5 w-3.5" />
          Ubicacion
        </button>
      </div>

      {open ? createPortal(
        <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 cursor-default bg-slate-950/45" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[320px] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-2xl">
            <p className="mb-1.5 text-[0.72rem] font-semibold text-slate-700">Elige tu ubicacion</p>
            <p className="mb-2 text-[0.64rem] text-slate-400">
              Escribe una direccion, ciudad o coordenadas (lat, lng).
            </p>
            <div className="flex gap-1.5">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Av. Reforma 100, CDMX"
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[0.72rem] text-slate-700 outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => {
                  const next = draft.trim();
                  if (next) onCommit(next);
                  setOpen(false);
                }}
                disabled={!draft.trim()}
                className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-[0.72rem] font-medium text-white"
              >
                Usar
              </button>
            </div>
            <p className="mt-2 text-[0.62rem] text-slate-400" aria-live="polite">
              {draft.trim() !== searchQuery ? "Buscando coincidencia..." : `Resultado para: ${searchQuery || "Mexico"}`}
            </p>
            <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
              <iframe
                key={`${previewSrc}-preview`}
                title="Vista previa de ubicacion"
                src={previewSrc}
                className="h-32 w-full border-0"
                loading="lazy"
              />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

/* ---------------------- Bloque de pagina (sortable) -------------------- */

function SortableBlock({
  iid,
  widgetId,
  page,
  label,
  children,
  onRemove,
  controls,
}: {
  iid: string;
  widgetId: WidgetId;
  page: PageId;
  label: string;
  children: React.ReactNode;
  onRemove: () => void;
  controls?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: iid,
    data: { kind: "item", iid, widgetId, page },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group/block relative", isDragging && "z-30 opacity-60")}
    >
      {/* Etiqueta del tipo de widget: siempre visible para identificarlo. */}
      <div className="pointer-events-none absolute left-2 top-2 z-20 flex items-center gap-1 opacity-70 transition group-hover/block:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Mover ${label}`}
          className="pointer-events-auto grid h-6 w-6 cursor-grab place-items-center rounded-md bg-slate-900/70 text-white active:cursor-grabbing"
        >
          <LuGripVertical className="h-3.5 w-3.5" />
        </button>
        <span className="rounded bg-slate-900/75 px-1.5 py-0.5 text-[0.55rem] font-medium uppercase tracking-[0.12em] text-white">
          {label}
        </span>
        {controls}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${label}`}
        className="absolute right-2 top-2 z-20 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-slate-500 opacity-0 shadow transition hover:text-rose-600 group-hover/block:opacity-100"
      >
        <LuX className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}

/* --------------------------- Widgets del body -------------------------- */

function PageWidget({ instance, tokens, content, onCommit, accent }: ViewCtx & { instance: Instance }) {
  const { widgetId, iid } = instance;
  const radius = tokens.radius;
  const get = (field: string) => content[`${iid}:${field}`] ?? WIDGET_DEFAULTS[widgetId][field] ?? "";
  const set = (field: string) => makeTextCommit(onCommit, `${iid}:${field}`, content[`${iid}:${field}:textStyle`]);
  const background = (fallback: string) => backgroundCss(content[`${iid}:background`], fallback);
  const titleStyle: React.CSSProperties = { fontFamily: tokens.titleFamily, fontWeight: tokens.titleWeight };
  // Igual que la capa base del sitio generado (h1-h3: fuente titulo + peso + lh 1.12).
  const headingStyle: React.CSSProperties = { ...titleStyle, lineHeight: 1.12 };
  // Igual que las tarjetas del sitio (border-muted/20 + bg-surface-alt/90).
  const cardStyle: React.CSSProperties = {
    borderColor: hexAlpha(tokens.muted, CARD_BORDER_ALPHA),
    backgroundColor: hexAlpha(tokens.surfaceAlt, CARD_BG_ALPHA),
  };
  // Cada boton guarda su propio estilo (color / relleno) en content, por componente.
  const btnStyleOf = (field: string) => parseBtnStyle(content[`${iid}:${field}:style`]);
  const btnCssOf = (field: string) => buttonCss(btnStyleOf(field), accent, radius);
  const btnEditOf = (field: string): BtnEdit => ({
    style: btnStyleOf(field),
    onChange: (s) => onCommit(`${iid}:${field}:style`, JSON.stringify(s)),
    accent,
  });

  if (widgetId === "hero") {
    const left = tokens.heroAlign === "left";
    // Mismo contrato de clases que el sitio generado (HERO): el preview deja de
    // ser un mock a escala y se ve identico a lo que se publica.
    return (
      <section className={cn(HERO.section, HERO.alignText(left))} style={background(tokens.surface)}>
        <div className={HERO.container}>
          <EditableText as="p" value={get("eyebrow")} onCommit={set("eyebrow")} className={HERO.eyebrow} style={{ color: accent.accent }} />
          <EditableText as="h1" value={get("title")} onCommit={set("title")} className={HERO.title} style={titleStyle} />
          <EditableText as="p" multiline value={get("subtitle")} onCommit={set("subtitle")} className={cn(HERO.subtitleLead(left), HERO.subtitle)} style={{ color: tokens.muted }} />
          <SiteButton value={get("cta")} onCommit={set("cta")} css={btnCssOf("cta")} className={HERO.cta} editable={btnEditOf("cta")} />
        </div>
      </section>
    );
  }

  if (widgetId === "features") {
    const feats = [
      { t: "f1t", d: "f1d" },
      { t: "f2t", d: "f2d" },
      { t: "f3t", d: "f3d" },
    ];
    return (
      <section className={SECTION.outer} style={background(tokens.surface)}>
        <div className={SECTION.container}>
          <div className={FEATURES.grid}>
            {feats.map((feat, i) => {
              const fallbackIcons: EditableIconId[] = ["sparkles", "layers", "wrench"];
              return (
                <div
                  key={feat.t}
                  className={FEATURES.card}
                  style={{ borderColor: hexAlpha(tokens.muted, CARD_BORDER_ALPHA), backgroundColor: hexAlpha(tokens.surfaceAlt, CARD_BG_ALPHA) }}
                >
                  <span className={FEATURES.icon} style={{ color: accent.accent }}>
                    <EditableIcon value={get(`icon${i + 1}`)} fallback={fallbackIcons[i] ?? "sparkles"} onCommit={set(`icon${i + 1}`)} className="h-6 w-6" />
                  </span>
                  <EditableText as="h3" value={get(feat.t)} onCommit={set(feat.t)} style={headingStyle} />
                  <EditableText as="p" multiline value={get(feat.d)} onCommit={set(feat.d)} className={FEATURES.desc} style={{ color: tokens.muted }} />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "image-text") {
    const reverse = get("layout") === "image-right";
    return (
      <section className={SECTION.outer} style={background(tokens.surface)}>
        <div className={SECTION.container}>
          <div className={IMAGE_TEXT.grid}>
            <EditableImage value={get("image")} onCommit={set("image")} className={cn(IMAGE_TEXT.image, reverse && "@2xl:order-2")} />
            <div>
              <EditableText as="h2" value={get("title")} onCommit={set("title")} className={IMAGE_TEXT.title} style={headingStyle} />
              <EditableText as="p" multiline value={get("body")} onCommit={set("body")} className={cn(IMAGE_TEXT.body)} style={{ color: tokens.muted }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "text-block") {
    return (
      <section className={cn(SECTION.outer, "text-center")} style={background(tokens.surfaceAlt)}>
        <div className={SECTION.container}>
          <EditableText as="h2" value={get("title")} onCommit={set("title")} className={TEXT_BLOCK.title} style={headingStyle} />
          <EditableText as="p" multiline value={get("body")} onCommit={set("body")} className={TEXT_BLOCK.body} style={{ color: tokens.muted }} />
        </div>
      </section>
    );
  }

  if (widgetId === "product-tiers") {
    const tiers = [
      { name: "t1name", price: "t1price" },
      { name: "t2name", price: "t2price" },
      { name: "t3name", price: "t3price" },
    ];
    return (
      <section className={SECTION.outer} style={background(tokens.surfaceAlt)}>
        <div className={SECTION.container}>
          <EditableText as="h2" value={get("title")} onCommit={set("title")} className={PRODUCT_TIERS.title} style={headingStyle} />
          <div className={PRODUCT_TIERS.grid}>
            {tiers.map((tier) => (
              <div key={tier.name} className={PRODUCT_TIERS.card} style={cardStyle}>
                <EditableText as="h3" value={get(tier.name)} onCommit={set(tier.name)} style={headingStyle} />
                <EditableText as="p" value={get(tier.price)} onCommit={set(tier.price)} className={PRODUCT_TIERS.price} style={{ color: accent.accent }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "services") {
    const svcs = [
      { n: "s1name", d: "s1desc" },
      { n: "s2name", d: "s2desc" },
      { n: "s3name", d: "s3desc" },
    ];
    return (
      <section className={SECTION.outer} style={background(tokens.surface)}>
        <div className={SECTION.container}>
          <EditableText as="h2" value={get("title")} onCommit={set("title")} className={SERVICES.title} style={headingStyle} />
          <div className={SERVICES.grid}>
            {svcs.map((svc, index) => (
              <div key={svc.n} className={SERVICES.card} style={cardStyle}>
                <span className={SERVICES.icon} style={{ color: accent.accent }}>
                  <EditableIcon value={get(`serviceIcon${index + 1}`)} fallback="check" onCommit={set(`serviceIcon${index + 1}`)} className="h-6 w-6" />
                </span>
                <EditableText as="h3" value={get(svc.n)} onCommit={set(svc.n)} style={headingStyle} />
                <EditableText as="p" multiline value={get(svc.d)} onCommit={set(svc.d)} className={SERVICES.desc} style={{ color: tokens.muted }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "stats") {
    const cells = [
      { n: "n1", l: "l1" },
      { n: "n2", l: "l2" },
      { n: "n3", l: "l3" },
    ];
    return (
      <section className={SECTION.outer} style={background(tokens.surfaceAlt)}>
        <div className={SECTION.container}>
          <div className={STATS.grid}>
            {cells.map((cell) => (
              <div key={cell.n} className={STATS.cell}>
                <EditableText as="p" value={get(cell.n)} onCommit={set(cell.n)} className={STATS.number} style={{ ...headingStyle, color: accent.accent }} />
                <EditableText as="p" value={get(cell.l)} onCommit={set(cell.l)} className={STATS.label} style={{ color: tokens.muted }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "cta-banner") {
    // Sobre la franja de acento, el boton por defecto es blanco; si el usuario
    // elige un color/relleno propio, se respeta.
    const st = btnStyleOf("cta");
    const bannerBtn: React.CSSProperties =
      st.fill === "solid" && !st.color
        ? { backgroundColor: "#fff", color: accent.accentText, borderRadius: radius / 2 }
        : btnCssOf("cta");
    return (
      <section className={SECTION.outer} style={background(accent.accent)}>
        <div className={SECTION.container}>
          <div className={cn(CTA_BANNER.row, "text-white")}>
            <EditableText as="h2" value={get("title")} onCommit={set("title")} className={CTA_BANNER.title} style={headingStyle} />
            <SiteButton value={get("cta")} onCommit={set("cta")} css={bannerBtn} className={cn(BUTTON_BASE, CTA_BANNER.cta)} editable={btnEditOf("cta")} />
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "carousel") {
    return <CarouselWidget iid={iid} content={content} tokens={tokens} accent={accent} onCommit={onCommit} background={background(tokens.surface)} />;
  }

  if (widgetId === "gallery") {
    const fields = ["g1", "g2", "g3", "g4", "g5", "g6"] as const;
    return (
      <section className={SECTION.outer} style={background(tokens.surfaceAlt)}>
        <div className={SECTION.container}>
          <div className={GALLERY.grid}>
            {fields.map((field) => (
              <EditableImage key={field} value={get(field)} onCommit={set(field)} className={GALLERY.image} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "bg-image") {
    const cloth = clothCss(content[`${iid}:background`]);
    return (
      <section className={BG_IMAGE.section}>
        <EditableImage value={get("image")} onCommit={set("image")} className={BG_IMAGE.image} />
        {cloth ? <div className={BG_IMAGE.cloth} style={cloth} /> : null}
        <div className={BG_IMAGE.overlay}>
          <EditableText as="p" value={get("caption")} onCommit={set("caption")} className={BG_IMAGE.caption} />
        </div>
      </section>
    );
  }

  if (widgetId === "bg-video") {
    return (
      <BgVideoWidget
        videoValue={get("video")}
        onCommitVideo={(next) => onCommit(`${iid}:video`, next)}
        titleValue={get("title")}
        onCommitTitle={set("title")}
        cloth={clothCss(content[`${iid}:background`])}
        headingStyle={headingStyle}
      />
    );
  }

  if (widgetId === "blog") {
    const posts = [
      { t: "p1t", e: "p1e", img: "p1img" },
      { t: "p2t", e: "p2e", img: "p2img" },
      { t: "p3t", e: "p3e", img: "p3img" },
    ];
    return (
      <section className={SECTION.outer} style={background(tokens.surface)}>
        <div className={SECTION.container}>
          <EditableText as="h2" value={get("title")} onCommit={set("title")} className={BLOG.title} style={headingStyle} />
          <div className={BLOG.grid}>
            {posts.map((post) => (
              <div key={post.t} className={BLOG.card} style={cardStyle}>
                <EditableImage value={get(post.img)} onCommit={set(post.img)} className={BLOG.image} />
                <div className={BLOG.body}>
                  <EditableText as="h3" value={get(post.t)} onCommit={set(post.t)} style={headingStyle} />
                  <EditableText as="p" multiline value={get(post.e)} onCommit={set(post.e)} className={BLOG.excerpt} style={{ color: tokens.muted }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "promos") {
    const offers = [
      { tag: "o1tag", t: "o1t", d: "o1d" },
      { tag: "o2tag", t: "o2t", d: "o2d" },
      { tag: "o3tag", t: "o3t", d: "o3d" },
    ];
    return (
      <section className={SECTION.outer} style={background(tokens.surfaceAlt)}>
        <div className={SECTION.container}>
          <EditableText as="h2" value={get("title")} onCommit={set("title")} className={PROMOS.title} style={headingStyle} />
          <div className={PROMOS.grid}>
            {offers.map((offer) => (
              <div key={offer.t} className={PROMOS.card} style={cardStyle}>
                <EditableText as="span" value={get(offer.tag)} onCommit={set(offer.tag)} className={PROMOS.tag} style={{ backgroundColor: accent.accent }} />
                <EditableText as="h3" value={get(offer.t)} onCommit={set(offer.t)} style={headingStyle} />
                <EditableText as="p" multiline value={get(offer.d)} onCommit={set(offer.d)} className={PROMOS.desc} style={{ color: tokens.muted }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "testimonials") {
    const quotes = [
      { q: "q1", a: "a1" },
      { q: "q2", a: "a2" },
      { q: "q3", a: "a3" },
    ];
    return (
      <section className={SECTION.outer} style={background(tokens.surface)}>
        <div className={SECTION.container}>
          <EditableText as="h2" value={get("title")} onCommit={set("title")} className={TESTIMONIALS.title} style={headingStyle} />
          <div className={TESTIMONIALS.grid}>
            {quotes.map((item, index) => (
              <div key={item.q} className={TESTIMONIALS.card} style={cardStyle}>
                <span className="mb-3 inline-block h-6 w-6" style={{ color: accent.accent }}>
                  <EditableIcon value={get(`quoteIcon${index + 1}`)} fallback="quote" onCommit={set(`quoteIcon${index + 1}`)} className="h-6 w-6" />
                </span>
                <EditableText as="p" multiline value={get(item.q)} onCommit={set(item.q)} style={{ color: tokens.muted }} />
                <EditableText as="p" value={get(item.a)} onCommit={set(item.a)} className={TESTIMONIALS.author} style={{ color: accent.accent }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "faq") {
    const items = [
      { q: "q1", a: "a1" },
      { q: "q2", a: "a2" },
      { q: "q3", a: "a3" },
    ];
    return (
      <section className={SECTION.outer} style={background(tokens.surfaceAlt)}>
        <div className={SECTION.container}>
          <EditableText as="h2" value={get("title")} onCommit={set("title")} className={FAQ.title} style={headingStyle} />
          <div className={FAQ.list}>
            {items.map((item) => (
              <div key={item.q} className={FAQ.item} style={{ borderColor: hexAlpha(tokens.muted, CARD_BORDER_ALPHA), backgroundColor: tokens.surface }}>
                <EditableText as="p" value={get(item.q)} onCommit={set(item.q)} className={FAQ.summary} />
                <EditableText as="p" multiline value={get(item.a)} onCommit={set(item.a)} className={FAQ.answer} style={{ color: tokens.muted }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (widgetId === "contact") {
    const contactInputStyle: React.CSSProperties = {
      borderColor: hexAlpha(tokens.muted, 0.35),
      backgroundColor: tokens.surface,
      color: tokens.ink,
    };
    return (
      <section className={SECTION.outer} style={background(tokens.surface)}>
        <div className={SECTION.container}>
          <div className={CONTACT.grid}>
            <div>
              <EditableText as="h2" value={get("title")} onCommit={set("title")} className={CONTACT.title} style={headingStyle} />
              <EditableText as="p" multiline value={get("subtitle")} onCommit={set("subtitle")} className={CONTACT.subtitle} style={{ color: tokens.muted }} />
              <address className={CONTACT.address} style={{ color: tokens.muted }}>
                <EditableText as="p" value={get("email")} onCommit={set("email")} />
                <EditableText as="p" value={get("phone")} onCommit={set("phone")} />
                <EditableText as="p" value={get("address")} onCommit={set("address")} />
              </address>
            </div>
            <form className="grid gap-3" onSubmit={(event) => event.preventDefault()}>
              <input disabled placeholder="Nombre" className={CONTACT.input} style={contactInputStyle} />
              <input disabled placeholder="Correo" className={CONTACT.input} style={contactInputStyle} />
              <textarea disabled placeholder="Mensaje" className={cn(CONTACT.input, "min-h-[130px]")} style={contactInputStyle} />
              <StyledButton label="Enviar" css={btnCssOf("send")} className={cn(BUTTON_BASE, "text-center")} editable={btnEditOf("send")} />
            </form>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

/** Carrusel con navegacion funcional: los botones cambian el slide visible. */
function CarouselWidget({
  iid,
  content,
  tokens,
  accent,
  onCommit,
  background,
}: {
  iid: string;
  content: Content;
  tokens: TemplateTokens;
  accent: (typeof BUILD_PLANS)[BuildPlanId];
  onCommit: (key: string, value: string) => void;
  background: React.CSSProperties;
}) {
  const fields = ["image1", "image2", "image3"] as const;
  const [index, setIndex] = useState(0);
  const field = fields[index];
  const value = content[`${iid}:${field}`] ?? WIDGET_DEFAULTS.carousel[field] ?? "";
  const go = (delta: number) => setIndex((i) => (i + delta + fields.length) % fields.length);

  return (
    <section className={SECTION.outer} style={background}>
      <div className={SECTION.container}>
        <div className={CAROUSEL.frame}>
          <EditableImage
            key={field}
            value={value}
            onCommit={(v) => onCommit(`${iid}:${field}`, v)}
            className={CAROUSEL.slide}
          />
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Slide anterior"
            className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-2xl text-slate-900"
          >
            <LuChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Slide siguiente"
            className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-2xl text-slate-900"
          >
            <LuChevronRight className="h-5 w-5" />
          </button>
        </div>
        {/* Puntos: ayuda de edicion del builder (el sitio real navega con los botones). */}
        <div className="mt-3 flex justify-center gap-1.5">
          {fields.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir al slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === index ? 18 : 6, backgroundColor: i === index ? accent.accent : hexAlpha(tokens.muted, 0.33) }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
