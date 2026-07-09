"use client";

import { ImageIcon, Monitor, MousePointer2, Type } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/lib/utils";

const LIVE_SITE_URL = "https://refautomex.com";
// Origen exacto del sitio incrustado. Se usa para validar y dirigir los postMessage.
const TARGET_ORIGIN = "https://refautomex.com";

type EditorMode = "navigate" | "text" | "image";

type BridgeMessage =
  | { source: "refautomex-bridge"; type: "ready" }
  | { source: "refautomex-bridge"; type: "text-selected"; selector: string; value: string }
  | { source: "refautomex-bridge"; type: "text-changed"; selector: string; value: string }
  | { source: "refautomex-bridge"; type: "image-selected"; selector: string };

const modeOptions: { id: EditorMode; label: string; icon: typeof Type }[] = [
  { id: "navigate", label: "Navegar", icon: MousePointer2 },
  { id: "text", label: "Editar textos", icon: Type },
  { id: "image", label: "Editar imagenes", icon: ImageIcon },
];

export default function IminTutorialWorkspace() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageSelectorRef = useRef<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("navigate");
  const [bridgeReady, setBridgeReady] = useState(false);
  const [changeCount, setChangeCount] = useState(0);

  const post = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: "imin-editor", ...message },
      TARGET_ORIGIN,
    );
  }, []);

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
        setChangeCount((count) => count + 1);
        return;
      }

      if (data.type === "image-selected") {
        pendingImageSelectorRef.current = data.selector;
        fileInputRef.current?.click();
        return;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const selector = pendingImageSelectorRef.current;

    if (!file || !selector) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        post({ type: "set-image", selector, src: reader.result });
        setChangeCount((count) => count + 1);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
    pendingImageSelectorRef.current = null;
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <div className="rounded-4xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const active = mode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] transition",
                    active
                      ? "bg-[#0C6CC6] text-white"
                      : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-slate-200 text-slate-600">
              <Monitor className="mr-2 h-3.5 w-3.5" />
              refautomex.com
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "border-slate-200",
                bridgeReady ? "text-emerald-600" : "text-slate-400",
              )}
            >
              {bridgeReady ? "Editor conectado" : "Conectando..."}
            </Badge>
            {changeCount > 0 ? (
              <Badge variant="outline" className="border-slate-200 text-slate-600">
                {changeCount} cambio{changeCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="mx-auto max-w-336 overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_30px_120px_rgba(0,0,0,0.3)]">
          <iframe
            ref={iframeRef}
            src={LIVE_SITE_URL}
            title="refautomex.com"
            className="block h-[80vh] w-full border-0 bg-white"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setBridgeReady(false)}
          />
        </div>

        {mode !== "navigate" ? (
          <p className="mt-3 text-center text-[0.68rem] uppercase tracking-[0.2em] text-slate-400">
            {mode === "text"
              ? "Modo edicion de textos: la navegacion esta pausada. Haz clic en un texto para editarlo."
              : "Modo edicion de imagenes: la navegacion esta pausada. Haz clic en una imagen para reemplazarla."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
