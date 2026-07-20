"use client";

import { useEffect, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { useProjectTextsAdminStore } from "@/lib/project-texts-admin-store";

type ProjectTextsClientProps = {
  slug: string;
};

export function ProjectTextsClient({ slug }: ProjectTextsClientProps) {
  const setSlug = useProjectTextsAdminStore((s) => s.setSlug);
  const drafts = useProjectTextsAdminStore((s) => s.drafts);
  const setDrafts = useProjectTextsAdminStore((s) => s.setDrafts);
  const patchDraft = useProjectTextsAdminStore((s) => s.patchDraft);
  const addEmptyRow = useProjectTextsAdminStore((s) => s.addEmptyRow);
  const removeKey = useProjectTextsAdminStore((s) => s.removeKey);
  const [projectName, setProjectName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setSlug(slug);
  }, [slug, setSlug]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/projects/${encodeURIComponent(slug)}/texts`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("no se pudieron cargar los textos");
        }
        return res.json() as Promise<{ project: { name: string }; texts: Record<string, string> }>;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setProjectName(data.project.name);
        setDrafts(data.texts ?? {});
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Error al cargar");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, setDrafts]);

  // Las ediciones del workspace IMIN viven en la misma tabla pero son un JSON
  // de ordenes para el bridge, no texto editable a mano.
  const rows = Object.keys(drafts)
    .filter((key) => !key.startsWith("imin.editor."))
    .map((key) => ({ key, value: drafts[key] ?? "" }));

  async function onSave() {
    setSaveState("saving");
    const res = await fetch(`/api/dashboard/projects/${encodeURIComponent(slug)}/texts`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: drafts }),
    });
    if (!res.ok) {
      setSaveState("error");
      return;
    }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white px-5 py-8 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
        <p className="text-[0.7rem] uppercase tracking-[0.42em] text-[#071E9C]">Proyecto</p>
        <h1 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-4xl">{projectName || slug}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
          Textos en SQLite central; cada sitio los pide por API con Bearer desde su propio backend.
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-600">Pares clave / texto</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="text-xs" onClick={() => addEmptyRow()}>
              Agregar clave
            </Button>
            <Button type="button" className="text-xs" onClick={() => void onSave()} disabled={saveState === "saving"}>
              {saveState === "saving" ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
        {saveState === "saved" ? (
          <p className="mt-3 text-xs tracking-[0.08em] text-emerald-700">Cambios guardados</p>
        ) : null}
        {saveState === "error" ? (
          <p className="mt-3 text-xs tracking-[0.08em] text-red-600">No se pudo guardar</p>
        ) : null}

        <div className="mt-6 space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">Todavia no hay claves. Agrega una para empezar.</p>
          ) : null}
          {rows.map((row) => (
            <div key={row.key} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-start">
              <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-slate-600">
                Clave
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#111827]"
                  value={row.key}
                  onChange={(e) => {
                    const nextKey = e.target.value;
                    const prevVal = drafts[row.key] ?? "";
                    removeKey(row.key);
                    patchDraft(nextKey, prevVal);
                  }}
                />
              </label>
              <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-slate-600">
                Texto
                <textarea
                  className="mt-2 min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#111827]"
                  value={row.value}
                  onChange={(e) => patchDraft(row.key, e.target.value)}
                />
              </label>
              <div className="flex items-end sm:justify-end">
                <Button type="button" variant="ghost" className="text-xs text-slate-600" onClick={() => removeKey(row.key)}>
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
