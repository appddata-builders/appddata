"use client";

import { motion } from "framer-motion";

import { useT } from "@/lib/text/text-provider";

/**
 * Los sitios de muestra solo declaran su degradado; nombre, giro, descripcion,
 * logo y enlace salen de `hydrate` bajo "es.products.showcase.<n>.*", para que
 * agregar o cambiar un caso no requiera tocar el componente.
 */
const prototypeSites = [
  { key: "es.products.showcase.1", accent: "from-[#589bf9]/24 via-transparent to-cyan-300/12" },
  { key: "es.products.showcase.2", accent: "from-cyan-300/18 via-transparent to-[#589bf9]/16" },
  { key: "es.products.showcase.3", accent: "from-fuchsia-300/16 via-transparent to-[#589bf9]/18" },
];

export default function ProductExperience() {
  const t = useT();

  return (
    <section className="w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pb-24">
      <div className="mb-8 max-w-3xl">
        <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#0C6CC6] font-bold">
          {t("es.products.showcase.eyebrow")}
        </p>
        <h2 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
          {t("es.products.showcase.title")}
        </h2>
        <p className="mt-5 text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
          {t("es.products.showcase.description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prototypeSites.map((site, index) => (
          <motion.article
            key={site.key}
            initial={{ opacity: 0, y: 28, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ amount: 0.35 }}
            transition={{
              duration: 0.65,
              delay: index * 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)]"
          >
            <div className={`h-52 bg-linear-to-br ${site.accent} p-4`}>
              <div className="h-full rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,1))] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff7f96]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffd76a]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#76ffb0]/80" />
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-24 rounded-full bg-slate-300" />
                  <div className="h-8 rounded-[0.8rem] bg-slate-100" />
                  <div className="grid grid-cols-[1.2fr_0.8fr] gap-3">
                    <div className="relative overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(66,111,235,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))]">
                      <div className="absolute inset-0 bg-white/72" />
                      <div className="absolute inset-x-3 top-3 h-4 rounded-full bg-slate-100" />
                      <div className="absolute left-3 top-10 h-8 w-[58%] rounded-[0.9rem] border border-slate-200 bg-slate-100" />
                      <div className="absolute bottom-3 left-3 h-7 w-12 rounded-[0.9rem] bg-slate-100" />
                      <div className="absolute bottom-3 right-3 h-7 w-16 rounded-[0.9rem] bg-slate-100" />
                      <a
                        href={t(`${site.key}.href`)}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center z-50"
                        aria-label={t("es.products.showcase.open", { name: t(`${site.key}.name`) })}
                      >
                        <motion.img
                          src={t(`${site.key}.logoSrc`)}
                          alt={t(`${site.key}.logoAlt`)}
                          className="h-16 w-auto max-w-[72%] object-contain drop-shadow-[0_18px_40px_rgba(255,255,255,0.1)] sm:h-[4.5rem]"
                          loading="eager"
                          decoding="async"
                          draggable={false}
                          animate={{
                            y: [0, -4, 0, 3, 0],
                            scale: [1, 1.025, 1, 1.012, 1],
                            opacity: [0.92, 1, 0.96, 1, 0.94],
                          }}
                          transition={{
                            duration: 4.2,
                            delay: index * 0.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      </a>
                    </div>
                    <div className="grid gap-3">
                      <div className="h-10 rounded-[0.9rem] bg-slate-100" />
                      <div className="h-10 rounded-[0.9rem] bg-slate-100" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-[0.62rem] uppercase tracking-[0.36em] text-[#eaa24a]">
                {t(`${site.key}.type`)}
              </p>
              <h3 className="mt-4 text-2xl font-light tracking-[0.08em] text-[#111827]">
                {t(`${site.key}.name`)}
              </h3>
              <p className="mt-4 text-sm leading-7 tracking-[0.04em] text-slate-700">
                {t(`${site.key}.description`)}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
