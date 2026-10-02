"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { useT } from "@/lib/text/text-provider";

const testimonialKeys = [
  "es.products.testimonials.1",
  "es.products.testimonials.2",
  "es.products.testimonials.3",
];

export default function ProductTestimonial() {
  const t = useT();

  return (
    <motion.section
      id="testimonial"
      initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ amount: 0.18 }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="w-full max-w-6xl px-4 pb-20 pt-10 sm:px-0"
    >
      <div className="rounded-[2.5rem] border border-slate-200 bg-white px-5 py-8 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
        <div className="max-w-3xl">
          <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#071E9C]">
            {t("es.products.testimonials.eyebrow")}
          </p>
          <h2 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
            {t("es.products.testimonials.title")}
          </h2>
          <p className="mt-5 text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
            {t("es.products.testimonials.description")}
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {testimonialKeys.map((testimonialKey, index) => (
            <motion.article
              key={testimonialKey}
              initial={{ opacity: 0, y: 32, filter: "blur(12px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ amount: 0.35 }}
              transition={{
                duration: 0.65,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex min-h-68 flex-col justify-between rounded-[1.85rem] border border-slate-200 bg-slate-50 px-5 py-5 backdrop-blur-sm"
            >
              <div>
                <div
                  aria-hidden="true"
                  className="text-[1.9rem] font-light leading-none text-[#071E9C]"
                >
                  {t("es.products.testimonials.badge")}
                </div>
                <p className="mt-4 text-sm leading-7 tracking-[0.04em] text-slate-800 sm:text-base">
                  {t(`${testimonialKey}.quote`)}
                </p>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] ring-1 ring-black/6">
                    <Image
                      src={t(`${testimonialKey}.avatar`)}
                      alt={t(`${testimonialKey}.author`)}
                      fill
                      sizes="48px"
                      className="object-cover object-center scale-[1.08]"
                    />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-800">
                      {t(`${testimonialKey}.author`)}
                    </p>
                    <p className="mt-2 text-[0.72rem] uppercase tracking-[0.3em] text-[#0C6CC6] font-bold">
                      {t(`${testimonialKey}.role`)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
