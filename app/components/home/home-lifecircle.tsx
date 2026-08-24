"use client";

import { motion } from "framer-motion";

import { useT } from "@/lib/text/text-provider";

const processStepKeys = [
  "es.home.lifecircle.steps.1",
  "es.home.lifecircle.steps.2",
  "es.home.lifecircle.steps.3",
  "es.home.lifecircle.steps.4",
];

export default function HomeLifecircle() {
  const t = useT();

  return (
    <motion.section
      initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ amount: 0.18 }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6"
    >
      <div className="max-w-3xl">
        <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#071E9C]">
          {t("es.home.lifecircle.eyebrow")}
        </p>
        <h2 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
          {t("es.home.lifecircle.title")}
        </h2>
        <p className="mt-5 text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
          {t("es.home.lifecircle.description")}
        </p>
      </div>

      <div className="relative mt-10">
        <div className="absolute left-5 top-0 h-full w-px bg-linear-to-b from-[#0E7EE6]/70 via-stone-300 to-transparent sm:left-1/2 sm:-translate-x-1/2" />

        <div className="grid gap-6">
          {processStepKeys.map((stepKey, index) => {
            const isRight = index % 2 === 1;

            return (
              <motion.article
                key={stepKey}
                initial={{
                  opacity: 0,
                  y: 28,
                  x: isRight ? 28 : -28,
                  filter: "blur(12px)",
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  x: 0,
                  filter: "blur(0px)",
                }}
                viewport={{ amount: 0.35 }}
                transition={{
                  duration: 0.65,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`relative grid gap-4 sm:grid-cols-2 ${isRight ? "sm:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="hidden sm:block" />

                <div
                  className={`relative ml-14 rounded-[1.9rem] border border-slate-200 bg-slate-50/20 px-5 py-5 backdrop-blur-sm sm:ml-0 sm:max-w-120 ${
                    isRight ? "sm:mr-auto" : "sm:ml-auto"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 min-h-8 min-w-8 shrink-0 aspect-square items-center justify-center rounded-full border border-[#589bf9]/22 bg-blue-50/10 text-[0.62rem] uppercase tracking-[0.16em] text-[#0C6CC6] shadow-slate-300 sm:left-auto sm:right-[-2.85rem] sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10 pt-1">
                      {t(`${stepKey}.step`)}
                    </div>
                    <h6 className="text-2xl font-light tracking-[0.08em] text-[#111827]">
                      {t(`${stepKey}.title`)}
                    </h6>
                  </div>

                  <p className="mt-4 text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
                    {t(`${stepKey}.description`)}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
