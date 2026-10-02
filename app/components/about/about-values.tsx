"use client";

import { motion } from "framer-motion";

import { useT } from "@/lib/text/text-provider";

const valueCardKeys = [
  "es.about.values.1",
  "es.about.values.2",
  "es.about.values.3",
];

export default function AboutValues() {
  const t = useT();

  return (
    <section className="w-full max-w-6xl px-4 py-10 sm:px-0 sm:py-16">
      <div className="mb-8 max-w-3xl">
        <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#7aa4ee]">
          {t("es.about.values.eyebrow")}
        </p>
        <h2 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
          {t("es.about.values.title")}
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {valueCardKeys.map((cardKey, index) => (
          <motion.article
            key={cardKey}
            initial={{ opacity: 0, y: 28, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ amount: 0.35 }}
            transition={{
              duration: 0.7,
              delay: index * 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="rounded-[2rem] border border-slate-200 bg-white px-5 py-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]"
          >
            <p className="text-[0.68rem] uppercase tracking-[0.38em] text-[#071E9C]">
              {t(`${cardKey}.label`)}
            </p>
            <h3 className="mt-4 text-2xl font-light tracking-[0.08em] text-[#111827]">
              {t(`${cardKey}.title`)}
            </h3>
            <p className="mt-5 text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
              {t(`${cardKey}.description`)}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
