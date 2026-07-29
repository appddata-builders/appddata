"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { startTransition, useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiCloud,
  FiCode,
  FiDatabase,
  FiEdit3,
  FiLayout,
  FiShield,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import HomeAbout from "./components/home/home-about";
import HomeDevelop from "./components/home/home-develop";
import HomeLifecircle from "./components/home/home-lifecircle";
import HomeText from "./components/home/home-text";
import Loader from "./components/loader";
import SiteFooter from "./components/site-footer";

const LOADER_DURATION_MS = 4400;

const bottomCards = [
  {
    label: "Crea Tu Entorno",
    value: "Muestra tus ideas en tu sito web, sin necesidad de instalaciones extra.",
    icon: FiLayout,
  },
  {
    label: "Escala tu proyecto",
    value: "Puedes escalar tu proyecto y actualizarlo cuando quieras con nosotros.",
    icon: FiTrendingUp,
  },
  {
    label: "Modifica tu proyecto",
    value: "con IMIN puedes modificar y actualizar tu proyecto, en cualquier momento.",
    icon: FiEdit3,
  },
];

const services: { title: string; description: string; icon: IconType }[] = [
  {
    title: "Apps internas",
    description: "Paneles, flujos y herramientas para operar sin hojas sueltas.",
    icon: FiLayout,
  },
  {
    title: "Automatizaciones",
    description: "Procesos conectados para reducir captura manual y seguimiento disperso.",
    icon: FiZap,
  },
  {
    title: "CRM operativo",
    description: "Contactos, embudo de ventas, servicios y reservaciones en un sistema claro.",
    icon: FiDatabase,
  },
  {
    title: "Web apps",
    description: "Interfaces rápidas, responsivas y pensadas para trabajo diario.",
    icon: FiCode,
  },
  {
    title: "Integraciones",
    description: "Conectamos APIs, formularios, pagos, datos y herramientas existentes.",
    icon: FiCloud,
  },
  {
    title: "Soporte técnico",
    description: "Mantenimiento, mejoras y estabilidad para que el sistema siga vivo.",
    icon: FiShield,
  },
];

function ServicesCarousel({ reduceMotion }: { reduceMotion: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (reduceMotion || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % services.length);
    }, 3600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPaused, reduceMotion]);

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + services.length) % services.length);
  };

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % services.length);
  };

  const getOffset = (index: number) => {
    let offset = index - activeIndex;

    if (offset > services.length / 2) {
      offset -= services.length;
    }

    if (offset < -services.length / 2) {
      offset += services.length;
    }

    return offset;
  };

  return (
    <div
      className="mt-8 overflow-hidden rounded-4xl border border-[#bfdef8] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] px-4 py-5 shadow-[0_18px_60px_rgba(12,108,198,0.06)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mb-4 flex items-center justify-between gap-1">
        <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.36em] text-[#0C6CC6]">
          Servicios
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Servicio anterior"
            onClick={goToPrevious}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#bfdef8] bg-white text-[#0C6CC6] transition hover:bg-[#eaf5ff]"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Servicio siguiente"
            onClick={goToNext}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#bfdef8] bg-white text-[#0C6CC6] transition hover:bg-[#eaf5ff]"
          >
            →
          </button>
        </div>
      </div>

      <motion.div
        className="relative h-62 cursor-grab overflow-hidden active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragStart={() => setIsPaused(true)}
        onDragEnd={(_, info) => {
          setIsPaused(false);

          if (info.offset.x < -48) {
            goToNext();
          }

          if (info.offset.x > 48) {
            goToPrevious();
          }
        }}
      >
        {services.map((service, index) => {
          const offset = getOffset(index);
          const isVisible = Math.abs(offset) <= 2;
          const isActive = offset === 0;

          return (
            <motion.article
              key={service.title}
              className="absolute left-1/2 top-3 flex h-52 w-68 cursor-pointer items-start gap-4 rounded-3xl border border-[#d3e8fb] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(12,108,198,0.08)] sm:w-[20rem]"
              initial={false}
              animate={{
                x: `calc(-50% + ${offset * 17.5}rem)`,
                scale: isActive ? 1 : 0.9,
                opacity: isVisible ? (isActive ? 1 : 0.48) : 0,
                filter: isActive ? "blur(0px)" : "blur(2px)",
                zIndex: 10 - Math.abs(offset),
              }}
              transition={{
                duration: reduceMotion ? 0.15 : 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d8edff] text-[#0C6CC6]">
                <service.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0C6CC6]">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-6 tracking-[0.03em] text-slate-700">
                  {service.description}
                </p>
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      <div className="mt-3 flex justify-center gap-2">
        {services.map((service, index) => (
          <button
            key={service.title}
            type="button"
            aria-label={`Ver ${service.title}`}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === activeIndex ? "w-8 bg-[#0C6CC6]" : "w-2 bg-[#bfdef8] hover:bg-[#8fc7f4]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [showLoader, setShowLoader] = useState(true);
  const shouldReduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setShowLoader(false);
      });
    }, LOADER_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="app-min-h-screen relative overflow-hidden bg-white text-[#111827]">
      <AnimatePresence>{showLoader ? <Loader key="loader" /> : null}</AnimatePresence>

      {!showLoader ? (
        <div className="relative z-10 flex w-full flex-col items-center ">
          <section
            id="products"
            className="scroll-mt-28 w-full max-w-5xl px-4 pb-5 pt-28 sm:scroll-mt-32 sm:px-5 sm:pt-32"
          >
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.42em] text-[#0C6CC6]">
                Imagina, Nosotros lo hacemos realidad.
              </p>
              <h1 className="mt-4 text-3xl font-light leading-tight tracking-[0.06em] text-[#111827] sm:text-5xl">
                ¿Tu software necesita rediseñarse?
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
                Gestiona todo tu proyecto con nosotros, desde el diseño hasta el desarrollo, y actualízalo cuando quieras. Con IMIN, tu software siempre estará a la vanguardia.
              </p>
            </div>

            <div className="grid w-full gap-4 md:grid-cols-3">
              {bottomCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{
                    opacity: 0,
                    y: shouldReduceMotion ? 0 : 20,
                    scale: shouldReduceMotion ? 1 : 0.985,
                    filter: shouldReduceMotion ? "blur(0px)" : "blur(8px)",
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                  }}
                  viewport={{ amount: 0.35, once: true }}
                  transition={{
                    duration: shouldReduceMotion ? 0.2 : 0.5,
                    delay: shouldReduceMotion ? 0 : index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="cursor-pointer rounded-[1.75rem] border border-[#bfdef8] bg-[#f0f8ff]/10 px-5 py-5 text-left shadow-[0_18px_60px_rgba(12,108,198,0.08)] backdrop-blur-sm transition ease-in-out hover:bg-[#eaf5ff]/10 hover:shadow hover:shadow-blue-300/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#d8edff] text-[#0C6CC6] shadow-[0_10px_28px_rgba(12,108,198,0.14)]">
                      <card.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[0.62rem] font-extrabold uppercase tracking-[0.36em] text-[#0C6CC6]">
                        {card.label}
                      </div>
                      <div className="mt-3 text-base font-light leading-7 tracking-[0.06em] text-[#222325] sm:text-lg">
                        {card.value}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
          <HomeDevelop />
          <section className="w-full max-w-5xl px-4 pb-12 sm:-px-5">
            <ServicesCarousel reduceMotion={shouldReduceMotion} />
          </section>
          <HomeAbout />
          <HomeLifecircle />
          <motion.section
            id="imin"
            initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ amount: 0.18 }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full sm:px-0"
          >
            <HomeText className="w-screen rounded-none border-x-0" />
          </motion.section>
          <SiteFooter />
        </div>
      ) : null}
    </div>
  );
}
