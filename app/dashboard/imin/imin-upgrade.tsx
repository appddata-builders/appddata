import { Check, Lock } from "lucide-react";
import Link from "next/link";

import IminMark from "@/app/components/imin/imin-mark";

const FEATURES = [
  "Editor de textos del sitio, sin tocar codigo ni esperar despliegues",
  "Tutorial interactivo IMIN configurable desde el panel",
  "Iconos y bloques de contenido administrables",
  "Cambios publicados al instante en tu sitio",
];

/**
 * Pantalla que sustituye al editor cuando el proyecto no tiene el paquete.
 * El bloqueo real esta en el server component que la renderiza: esto es solo
 * la parte de venta.
 */
export function IminUpgrade({ isFree }: { isFree: boolean }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-5 border-b border-slate-100 p-6 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-900">IMIN no esta incluido en tu plan</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Contrata el paquete IMIN para administrar el contenido de tu sitio desde aqui.
              </p>
            </div>
          </div>
          <div className="relative mx-auto flex h-32 w-full max-w-40 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white sm:h-36">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(66,111,235,0.18),transparent_58%)]" />
            <IminMark
              className="relative h-20 w-20 sm:h-24 sm:w-24"
              imageClassName="drop-shadow-[0_12px_24px_rgba(66,111,235,0.2)]"
            />
          </div>
        </div>

        <ul className="grid gap-3 p-6">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50 p-6">
          <Link
            href={isFree ? "/dashboard" : "/imin"}
            className="inline-flex h-9 items-center rounded-md bg-amber-400 px-4 text-sm font-medium text-amber-950 transition hover:bg-amber-300"
          >
            {isFree ? "Ver Planes" : "Contratar IMIN"}
          </Link>
          <Link
            href="/imin"
            className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Ver que incluye
          </Link>
          <p className="text-xs text-slate-500">
            Ya lo contrataste? Escribenos y activamos el paquete en tu proyecto.
          </p>
        </div>
      </div>
    </div>
  );
}
