"use client";

import { ImagePlay, Monitor, MousePointer2, Type } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { FaCircle } from "react-icons/fa";

import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/lib/utils";

const LIVE_SITE_URL = "https://refautomex.com";
// Origen exacto del sitio incrustado. Se usa para validar y dirigir los postMessage.
const TARGET_ORIGIN = "https://refautomex.com";

type EditorMode = "navigate" | "text" | "media";
// El bridge distingue imagen de primer plano, fondo y video.
type MediaKind = "image" | "background" | "video";

type BridgeMessage =
  | { source: "refautomex-bridge"; type: "ready" }
  | { source: "refautomex-bridge"; type: "text-selected"; selector: string; value: string }
  | { source: "refautomex-bridge"; type: "text-changed"; selector: string; value: string }
  | { source: "refautomex-bridge"; type: "media-selected"; selector: string; kind: MediaKind };

const modeOptions: { id: EditorMode; label: string; icon: typeof Type }[] = [
  { id: "navigate", label: "Navegar", icon: MousePointer2 },
  { id: "text", label: "Editar textos", icon: Type },
  { id: "media", label: "Editar medios", icon: ImagePlay },
];

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

export default function IminTutorialWorkspace() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingMediaRef = useRef<{ selector: string; kind: MediaKind } | null>(null);
  const [mode, setMode] = useState<EditorMode>("navigate");
  const [bridgeReady, setBridgeReady] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Modo destino a la espera de confirmar guardar/descartar (null = sin dialogo).
  const [pendingMode, setPendingMode] = useState<EditorMode | null>(null);

  const post = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: "imin-editor", ...message },
      TARGET_ORIGIN,
    );
  }, []);

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
    setMode(next);
  };

  // TODO backend: cuando exista el endpoint, re-habilitar los botones "Guardar
  // cambios" y enviar aqui los cambios acumulados antes de hacer
  // setHasChanges(false) / setMode(pendingMode) / setPendingMode(null).

  const handleDiscard = () => {
    // Revierte los cambios recargando el sitio incrustado.
    if (iframeRef.current) {
      iframeRef.current.src = LIVE_SITE_URL;
    }
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
      if (event.origin !== TARGET_ORIGIN) {
        return;
      }

      const data = event.data as BridgeMessage;

      if (!data || data.source !== "refautomex-bridge") {
        return;
      }

      if (data.type === "ready") {
        setBridgeReady(true);
        return;
      }

      if (data.type === "text-changed") {
        setHasChanges(true);
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
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleMediaFileChange}
      />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const active = mode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => requestMode(option.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] transition",
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
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled
              title="Disponible al conectar el backend"
              className="cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-400"
            >
              Guardar cambios
            </button>
            <Badge variant="outline" className="bg-slate-100 text-blue-400">
              <button
                type="button"
                onClick={() => window.open("https://refautomex.com", "_blank")}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-500 cursor-pointer"
              >
                <Monitor className="mr-2 h-3.5 w-3.5" />
                refautomex.com
              </button>
            </Badge>
            <Badge
              variant="outline"
              className="bg-amber-50 font-bold tracking-[0.18em] text-yellow-600"
            >
              <FaCircle className="mr-2 h-2 w-2 animate-pulse text-yellow-600" />
              IMIN
            </Badge>
          </div>
        </div>

        {mode !== "navigate" ? (
          <p className="my-3 text-center text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">
            {mode === "text"
              ? "Modo edición de textos: la navegación esta pausada. Haz clic sobre un texto existente para editarlo."
              : "Modo edición de medios: la navegación esta pausada. Haz clic en una imagen o video para reemplazarlo (los videos solo aceptan mp4)."}
          </p>
        ) : (
          <p className="my-3 text-center text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">
            Navegación activa: haz clic en cualquier parte del sitio para interactuar con el.
          </p>
        )}
        <div className="mx-auto max-w-336 overflow-hidden rounded-2xl shadow-[0_30px_120px_rgba(0,0,0,0.3)]">
          <iframe
            ref={iframeRef}
            src={LIVE_SITE_URL}
            title="refautomex.com"
            className="block h-[95vh] w-full border-0 bg-white"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setBridgeReady(false)}
          />
        </div>

      </div>

      {pendingMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
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
                disabled
                title="Disponible al conectar el backend"
                className="w-full cursor-not-allowed rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
              >
                Guardar cambios
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
    </div>
  );
}
