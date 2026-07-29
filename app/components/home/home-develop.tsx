"use client";

import { LuArrowRight, LuCheck, LuSparkles } from "react-icons/lu";

import { SitePackageIcon, SitePackageName } from "@/app/components/packages/site-package-identity";
import { SITE_PACKAGES } from "@/lib/site-packages";

const PREMIUM_QUOTE_URL = `https://api.whatsapp.com/send?phone=5512879683&text=${encodeURIComponent(
  "Hola, quisiera cotizar el paquete Premium de Appddata.",
)}`;

const tierStyles = {
  beginner: {
    eyebrow: "Presencia digital",
    border: "border-emerald-200",
    top: "bg-emerald-400",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
    button: "bg-emerald-700 hover:bg-emerald-800",
  },
  super: {
    eyebrow: "Vende o automatiza",
    border: "border-amber-200",
    top: "bg-amber-400",
    soft: "bg-amber-50",
    text: "text-amber-700",
    button: "bg-amber-500 hover:bg-amber-600",
  },
  premium: {
    eyebrow: "Plataforma a medida",
    border: "border-blue-200",
    top: "bg-[#589bf9]",
    soft: "bg-blue-50",
    text: "text-[#0C6CC6]",
    button: "bg-[#0C6CC6] hover:bg-[#095aa7]",
  },
} as const;

export default function HomeDevelop({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "w-full py-4" : "w-full px-4 py-16 sm:px-6"}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-4 max-w-3xl text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#071E9C]">
            Paquetes Appddata
          </p>
          <h2 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
            Escala cuando lo necesites.
          </h2>
        </div>

        <div className="mx-auto mb-7 max-w-3xl rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Consideraciones
          </p>
          <ul className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
            <li>
              Algunas funcionalidades pueden requerir servidor y base de datos con un pago mensual.
            </li>
            <li>
              El dominio no está incluido en los paquetes; se cotiza y cobra por separado, sujeto
              a disponibilidad.
            </li>
            <li>
              El alcance, las integraciones avanzadas, licencias, comisiones de pago y servicios
              externos se revisan y cotizan por separado.
            </li>
          </ul>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {SITE_PACKAGES.map((tier) => {
            const styles = tierStyles[tier.id];
            const isSuper = tier.id === "super";
            const isPremium = tier.id === "premium";

            return (
              <article
                key={tier.id}
                className={`group relative flex h-full flex-col overflow-hidden rounded-4xl border bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.13)] ${styles.border}`}
              >
                <div className={`h-1.5 w-full ${styles.top}`} />

                {isSuper ? (
                  <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-amber-800">
                    <LuSparkles className="h-3 w-3" />
                    Más elegido
                  </span>
                ) : null}

                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div>
                    <p className={`text-[0.65rem] font-bold uppercase tracking-[0.28em] ${styles.text}`}>
                      {styles.eyebrow}
                    </p>
                    <h3 className="mt-4 flex items-center gap-2 text-2xl font-bold tracking-[0.06em] text-slate-950">
                      <SitePackageIcon plan={tier.id} className="h-5 w-5 shrink-0" />
                      <SitePackageName plan={tier.id}>{tier.name}</SitePackageName>
                    </h3>
                  </div>
                  <div className="mt-5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Ideal para
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
                      {tier.idealFor}
                    </p>
                  </div>
                  <div className={`mt-1 rounded-2xl border ${styles.border} ${styles.soft} p-4`}>
                    <p className={`text-lg font-bold ${styles.text}`}>{tier.capacity}</p>
                  </div>
                  <div className="mt-5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Ejemplo
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tier.examples.map((example) => (
                        <span
                          key={example}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Características del paquete
                    </p>
                    <ul className="mt-3 grid gap-2.5">
                      {tier.extras.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
                          <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${styles.soft} ${styles.text}`}>
                            <LuCheck className="h-3 w-3" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isPremium ? (
                    <p className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs leading-5 text-blue-800">
                      El precio final depende de la complejidad y las integraciones elegidas.
                    </p>
                  ) : null}

                  <div className="mt-auto pt-7">
                    {!isPremium ? (
                      <>
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Inversión
                        </p>
                        <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                          {tier.price}
                        </p>
                      </>
                    ) : null}

                    {isPremium ? (
                      <a
                        href={PREMIUM_QUOTE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition ${styles.button}`}
                      >
                        Cotizar paquete Premium
                        <LuArrowRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <form action="/api/stripe/checkout" method="post" className="mt-4">
                        <input type="hidden" name="plan" value={tier.id} />
                        <button
                          type="submit"
                          className={`inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition ${styles.button}`}
                        >
                          Comprar paquete {tier.name}
                          <LuArrowRight className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}
