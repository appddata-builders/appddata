"use client";

import { LuCheck, LuLock } from "react-icons/lu";
import Link from "next/link";

import IminMark from "@/app/components/imin/imin-mark";

const FEATURES = [
  "Editor de textos del sitio, sin tocar codigo ni esperar despliegues",
  "Tutorial interactivo IMIN configurable desde el panel",
  "Iconos y bloques de contenido administrables",
  "Cambios publicados al instante en tu sitio",
];

const IMIN_TIERS: {
  id: string;
  name: string;
  price: string;
  suffix: string;
  description: string;
  saving?: string;
  featured?: boolean;
}[] = [
  { id: "trial", name: "Prueba gratis", price: "$0", suffix: "3 días", description: "Conoce todas las herramientas de IMIN sin costo." },
  { id: "monthly", name: "Mensual", price: "$149", suffix: "MXN", description: "Flexibilidad mes a mes." },
  { id: "six-months", name: "6 meses", price: "$845", suffix: "MXN", description: "Un pago por seis meses.", saving: "Ahorras $49 MXN", featured: true },
  { id: "annual", name: "Anual", price: "$1,599", suffix: "MXN", description: "Un año completo de IMIN.", saving: "Ahorras $189 MXN" },
];

/**
 * Pantalla que sustituye al editor cuando el proyecto no tiene el paquete.
 * El bloqueo real esta en el server component que la renderiza: esto es solo
 * la parte de venta.
 */
export function IminUpgrade({ isFree, hasUsedTrial }: { isFree: boolean; hasUsedTrial: boolean }) {
  const availableTiers = hasUsedTrial ? IMIN_TIERS.filter((tier) => tier.id !== "trial") : IMIN_TIERS;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-5 border-b border-slate-100 p-6 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <LuLock className="h-5 w-5 text-slate-500" />
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
              <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-slate-100 bg-slate-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">¡Suscríbete para desbloquear IMIN!</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Elige IMIN</h2>
          <p className="mt-1 text-sm text-slate-500">Cancela cuando quieras y edita tu sitio sin precupaciones.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {availableTiers.map((tier) => (
              <article key={tier.id} className={`relative flex flex-col rounded-xl border bg-white p-4 ${tier.featured ? "border-amber-400 shadow-[0_12px_35px_rgba(245,158,11,0.12)]" : "border-slate-200"}`}>
                {tier.featured ? <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-amber-800">Recomendado</span> : null}
                <IminMark className="h-5 w-5" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{tier.name}</h3>
                <p className="mt-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-950">{tier.price}</span>{" "}
                  <span className="text-xs text-slate-500">{tier.suffix}</span>
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{tier.description}</p>
                {tier.saving ? <p className="mt-1 text-xs font-semibold text-emerald-600 py-3">{tier.saving}</p> : null}
                <form
                  action={tier.id === "trial" ? "/api/dashboard/imin/trial" : "/api/stripe/imin-checkout"}
                  method="post"
                  className="mt-auto"
                >
                  {tier.id === "trial" ? null : <input type="hidden" name="tier" value={tier.id} />}
                  <button type="submit" className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800">
                    {tier.id === "trial" ? "Probar gratis" : "Suscribirme"}
                  </button>
                </form>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={isFree ? "/dashboard" : "/imin"} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm text-slate-700 transition hover:bg-slate-100">
              {isFree ? "Volver a Planes" : "Ver demostración IMIN"}
            </Link>
            <p className="text-xs text-slate-500">Disfruta de los beneficios de Appddata.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
