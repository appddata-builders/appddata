"use client";

import { motion } from "framer-motion";

const valueCards = [
  {
    label: "Mision",
    title: "Brindarte una presencia digital que refleje tu marca.",
    description:
      "Desarrollamos experiencias digitales con identidad, orden visual y una narrativa que ayuda a explicar mejor lo que una marca hace.",
  },
  {
    label: "Vision",
    title: "Crear experiencias digitales que marquen la diferencia.",
    description:
      "No buscamos sitios decorativos. Queremos productos digitales claros, vivos y listos para crecer junto con el negocio.",
  },
  {
    label: "Valores",
    title: "Criterio, sobriedad y evolucion constante.",
    description:
      "Diseñamos con claridad, desarrollamos con rigor y dejamos bases que permitan iterar sin romper la identidad de la marca.",
  },
];

export default function AboutValues() {
  return (
    <section className="w-full max-w-6xl px-4 py-10 sm:px-0 sm:py-16">
      <div className="mb-8 max-w-3xl">
        <p className="text-[0.7rem] uppercase tracking-[0.45em] text-[#7aa4ee]">
          Nos define
        </p>
        <h2 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
          Mision, Vision y Valores
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {valueCards.map((card, index) => (
          <motion.article
            key={card.label}
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
              {card.label}
            </p>
            <h3 className="mt-4 text-2xl font-light tracking-[0.08em] text-[#111827]">
              {card.title}
            </h3>
            <p className="mt-5 text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
              {card.description}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
