"use client";

import { motion } from "framer-motion";

const milestones = [
  {
    year: "01",
    label: "Lectura",
    title: "Diagnostico visual",
    description:
      "Leemos la marca, el contexto y el momento del producto para definir una presencia digital con criterio real.",
  },
  {
    year: "02",
    label: "Narrativa",
    title: "Narrativa y estructura",
    description:
      "Traducimos la propuesta a secciones claras, ritmos de lectura y jerarquias que convierten mejor.",
  },
  {
    year: "03",
    label: "Construccion",
    title: "Diseno y desarrollo",
    description:
      "Construimos una experiencia sobria, con movimiento intencional y una identidad coherente en cada pantalla.",
  },
  {
    year: "04",
    label: "Escala",
    title: "Entrega escalable",
    description:
      "La pagina queda lista para crecer, conectarse a nuevas piezas y ser administrada despues del lanzamiento.",
  },
];

export default function AboutTimeline() {
  return (
    <section className="w-full max-w-6xl px-4 py-16 sm:px-0">
      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
        <div className="lg:sticky lg:top-32 lg:h-fit">
          <div className="overflow-hidden rounded-[2.4rem] border border-slate-200 bg-white px-5 py-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:px-7 sm:py-8">
            <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#071E9C]">
              Construccion
            </p>
            <h2 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
              Flujo de trabajo
            </h2>
            <p className="mt-6 text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
              La tecnología avanza rápidamente y por eso nos enfocamos en brindarte las mejores soluciones cuidando de cada detalle para estar a la banguardia. Nuestro proceso de trabajo se basa en cuatro pasos fundamentales que nos permiten crear experiencias digitales excepcionales para nuestros clientes.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-[1.4rem] border border-[#589bf9]/16 bg-[#589bf9]/6 px-4 py-4">
                <p className="text-[0.58rem] uppercase tracking-[0.32em] text-[#cebfff]">
                  Detalle
                </p>
                <p className="mt-3 text-lg font-light tracking-[0.08em] text-[#111827]">
                  Los detalles visuales son importantes para crear la mejor experiencia.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-cyan-300/14 bg-cyan-300/5 px-4 py-4">
                <p className="text-[0.58rem] uppercase tracking-[0.32em] text-cyan-700">
                  Contenido
                </p>
                <p className="mt-3 text-lg font-light tracking-[0.08em] text-[#111827]">
                  Contigo podemos potenciar la propuesta de valor con la que cuenta tu marca.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative pl-12 sm:pl-16">
          <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-[#589bf9]/75 via-cyan-300/30 to-transparent sm:left-6" />

          <div className="grid gap-5">
            {milestones.map((milestone, index) => (
              <motion.article
                key={milestone.year}
                initial={{ opacity: 0, y: 28, x: 18, filter: "blur(14px)" }}
                whileInView={{ opacity: 1, y: 0, x: 0, filter: "blur(0px)" }}
                viewport={{ amount: 0.3 }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_70px_rgba(15,23,42,0.08)] sm:px-6 sm:py-6"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(66,111,235,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,81,245,0.10),transparent_28%)]" />

                <div className="absolute left-[-2.35rem] top-7 flex h-8 w-8 items-center justify-center rounded-full border border-[#589bf9]/24 bg-[#589bf9]/10 text-[0.6rem] uppercase tracking-[0.16em] text-[#0C6CC6] shadow-[0_10px_30px_rgba(66,111,235,0.14)] sm:left-[-2.8rem] sm:h-10 sm:w-10">
                  {milestone.year}
                </div>

                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[0.62rem] uppercase tracking-[0.34em] text-[#071E9C]">
                      {milestone.label}
                    </p>
                    <h3 className="mt-3 text-2xl font-light tracking-[0.08em] text-[#111827]">
                      {milestone.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
                      {milestone.description}
                    </p>
                  </div>

                  <div className="grid min-w-[10rem] gap-3 sm:justify-items-end">
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.58rem] uppercase tracking-[0.28em] text-slate-600">
                      Presence step
                    </div>
                    <div className="w-full max-w-[10rem] rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
                      <div className="h-2.5 w-16 rounded-full bg-slate-300" />
                      <div className="mt-3 h-8 rounded-[0.8rem] bg-[#589bf9]/18" />
                      <div className="mt-3 h-14 rounded-[0.9rem] bg-[radial-gradient(circle_at_top_left,rgba(66,111,235,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))]" />
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
