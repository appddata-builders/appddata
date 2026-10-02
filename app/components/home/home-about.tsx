"use client";

import { motion } from "framer-motion";

import { useT } from "@/lib/text/text-provider";

const aboutPointKeys = [
  "es.home.about.points.1",
  "es.home.about.points.2",
  "es.home.about.points.3",
];

const aboutHighlightKeys = [
  "es.home.about.highlights.1",
  "es.home.about.highlights.2",
  "es.home.about.highlights.3",
];

export default function HomeAbout() {
  const t = useT();

  return (
    <motion.section
      id="about"
      initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ amount: 0.2 }}
      transition={{
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="w-full max-w-6xl px-4 py-16 sm:px-6"
    >
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
        <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#0C6CC6] font-extrabold">
              {t("es.home.about.eyebrow")}
            </p>
            <h2 className="mt-4 max-w-[12ch] text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
              {t("es.home.about.title")}
            </h2>
            <p className="mt-6 max-w-2xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
              {t("es.home.about.description")}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {aboutHighlightKeys.map((highlightKey, index) => (
                <div
                  key={highlightKey}
                  className={`rounded-[1.6rem] border bg-[#589bf9]/6 px-4 py-4 ${
                    index === 0 ? "border-[#589bf9]/16" : "border-slate-200/14"
                  }`}
                >
                  <p className="text-[0.62rem] uppercase tracking-[0.38em] text-[#0E7EE6]">
                    {t(`${highlightKey}.label`)}
                  </p>
                  <p className="mt-3 text-lg font-light tracking-[0.08em] text-[#111827]">
                    {t(`${highlightKey}.value`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {aboutPointKeys.map((pointKey, index) => (
              <motion.article
                key={pointKey}
                initial={{ opacity: 0, x: 24, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ amount: 0.45 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-5 backdrop-blur-sm"
              >
                <p className="text-[0.62rem] uppercase tracking-[0.38em] text-blue-600">
                  {index + 1}
                </p>
                <h3 className="mt-3 text-xl font-light tracking-[0.08em] text-[#111827]">
                  {t(`${pointKey}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-7 tracking-[0.04em] text-slate-700">
                  {t(`${pointKey}.description`)}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
