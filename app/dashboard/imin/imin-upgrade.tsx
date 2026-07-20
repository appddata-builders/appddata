import { Check, Lock } from "lucide-react";
import Link from "next/link";

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
export function IminUpgrade({ projectName }: { projectName: string | null }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-start gap-4 border-b border-slate-100 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Lock className="h-5 w-5 text-slate-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900">IMIN no esta incluido en tu plan</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {projectName
                ? `El proyecto ${projectName} esta en plan Free.`
                : "Tu cuenta esta en plan Free."}{" "}
              Contrata el paquete IMIN para administrar el contenido de tu sitio desde aqui.
            </p>
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
            href="/imin"
            className="inline-flex h-9 items-center rounded-md bg-[#0C6CC6] px-4 text-sm font-medium text-white transition hover:bg-[#0a5aa6]"
          >
            Contratar IMIN
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
