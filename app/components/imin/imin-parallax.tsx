"use client";

import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { BRAND_PLANE_URL, IMIN_LOGO_URL } from "@/lib/public-assets";

const imageCards = [
  {
    label: "Ajusta Imágenes",
    title: "Una imagen siempre vigente.",
    description:
      "Cambia imágenes para reflejar promociones, temporadas y nuevas etapas de tu negocio.",
    imageSrc: IMIN_LOGO_URL,
    imageAlt: "Vista base del sitio appddata",
    altImageSrc: BRAND_PLANE_URL,
    altImageAlt: "Vista editable del branding appddata",
    accent: "from-[#589bf9]/28 via-transparent to-cyan-300/10",
  },
  {
    label: "Ajusta Textos e Iconos",
    title: "Una web que evoluciona contigo.",
    descriptionPrefix: "Cambia textos, ",
    descriptionAnimated: "colores e iconos",
    descriptionSuffix: " para adaptar el sitio web.",
    imageSrc: IMIN_LOGO_URL,
    imageAlt: "Vista editable de IMIN para personalizar un sitio",
    accent: "from-cyan-300/22 via-transparent to-[#589bf9]/18",
  },
] as const;

type ParallaxCardProps = {
  card: (typeof imageCards)[number];
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  className?: string;
};

function SwappingPhoto({
  primarySrc,
  primaryAlt,
  secondarySrc,
  secondaryAlt,
}: {
  primarySrc: string;
  primaryAlt: string;
  secondarySrc: string;
  secondaryAlt: string;
}) {
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setShowSecondary((current) => !current);
    }, 2600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => setShowSecondary((current) => !current)}
      className="relative h-24 w-24 cursor-pointer sm:h-28 sm:w-28"
      aria-label="Alternar vista principal"
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={showSecondary ? secondarySrc : primarySrc}
          src={showSecondary ? secondarySrc : primarySrc}
          alt={showSecondary ? secondaryAlt : primaryAlt}
          className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(128,82,221,0.18)]"
          loading="eager"
          decoding="async"
          draggable={false}
          initial={{ opacity: 0, scale: 0.88, rotate: -4, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.08, rotate: 4, filter: "blur(8px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
    </button>
  );
}

function TypingDescription({
  prefix,
  animated,
  suffix,
}: {
  prefix: string;
  animated: string;
  suffix: string;
}) {
  const [visibleCount, setVisibleCount] = useState(animated.length);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const shouldPause = (!isDeleting && visibleCount === animated.length) || (isDeleting && visibleCount === 0);
    const timeoutMs = shouldPause ? 1350 : isDeleting ? 55 : 150;

    const timeoutId = window.setTimeout(() => {
      if (!isDeleting && visibleCount === animated.length) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && visibleCount === 0) {
        setIsDeleting(false);
        return;
      }

      setVisibleCount((current) => current + (isDeleting ? -1 : 1));
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [animated.length, isDeleting, visibleCount]);

  return (
    <p className="mt-3 text-sm leading-6 tracking-[0.03em] text-slate-700 h-[5.5em]">
      {prefix}
      <span className="text-[#0E7EE6]">{animated.slice(0, visibleCount)}</span>
      <motion.span
        className="ml-px inline-block h-[1em] w-px bg-[#BCDCFB] align-[-0.12em]"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {suffix}
    </p>
  );
}

function ParallaxCard({ card, y, rotate, className = "" }: ParallaxCardProps) {
  const hasAltImage = "altImageSrc" in card;
  const hasTyping = "descriptionAnimated" in card;

  return (
    <motion.article
      style={{ y, rotate }}
      className={`relative overflow-hidden rounded-4xl border border-slate-200 bg-white p-4 shadow-[0_24px_90px_rgba(15,23,42,0.1)] backdrop-blur-xl ${className}`.trim()}
    >
      <div className={`pointer-events-none absolute inset-0 bg-linear-to-br ${card.accent}`} />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.36em] text-[#0C6CC6] font-extrabold pl-1">
              {card.label}
            </p>
            <h3 className="mt-3 text-xl font-light tracking-[0.08em] text-[#111827] sm:text-2xl">
              {card.title}
            </h3>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-slate-200 bg-white/92 p-3">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff7f96]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffd76a]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#76ffb0]/80" />
          </div>

          <div className="grid gap-3 rounded-[1.3rem] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-2.5 w-24 rounded-full bg-slate-300" />
                <div className="h-2.5 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="rounded-full border border-[#589bf9]/18 bg-[#589bf9]/10 px-3 py-1 text-[0.56rem] uppercase tracking-[0.26em] text-[#0C6CC6]">
                Edita con IMIN
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="relative min-h-60 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(66,111,235,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,1))]">
                <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/6 to-transparent" />
                <div className="absolute left-4 top-4 h-14 w-32 rounded-2xl border border-slate-200 bg-slate-100" />
                <div className="absolute bottom-4 left-4 right-4 h-20 rounded-2xl border border-slate-200 bg-slate-50" />
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  {hasAltImage ? (
                    <SwappingPhoto
                      primarySrc={card.imageSrc}
                      primaryAlt={card.imageAlt}
                      secondarySrc={card.altImageSrc}
                      secondaryAlt={card.altImageAlt}
                    />
                  ) : (
                    <motion.img
                      src={card.imageSrc}
                      alt={card.imageAlt}
                      className="h-24 w-24 object-contain drop-shadow-[0_18px_30px_rgba(128,82,221,0.18)] sm:h-28 sm:w-28"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      animate={{ y: [0, -4, 0, 3, 0], rotate: [0, -2, 0, 1, 0] }}
                      transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[0.56rem] uppercase tracking-[0.28em] text-slate-600">
                    Cambio
                  </div>
                  {hasTyping ? (
                    <TypingDescription
                      prefix={card.descriptionPrefix}
                      animated={card.descriptionAnimated}
                      suffix={card.descriptionSuffix}
                    />
                  ) : (
                    <p className="mt-3 text-sm leading-6 tracking-[0.03em] text-slate-700 h-18">
                      {card.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[0.56rem] uppercase tracking-[0.28em] text-slate-600">
                      Texto
                    </div>
                    <div className="mt-3 h-2.5 w-full rounded-full bg-slate-300" />
                    <div className="mt-2 h-2.5 w-3/4 rounded-full bg-slate-100" />
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[0.56rem] uppercase tracking-[0.28em] text-slate-600">
                      Imagen
                    </div>
                    <div className="mt-3 h-12 rounded-[0.9rem] bg-linear-to-br from-[#589bf9]/24 to-cyan-300/12" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function IminParallax() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const firstCardY = useTransform(scrollYProgress, [0, 1], [72, -54]);
  const secondCardY = useTransform(scrollYProgress, [0, 1], [-40, 84]);
  const firstCardRotate = useTransform(scrollYProgress, [0, 1], [-4, 3]);
  const secondCardRotate = useTransform(scrollYProgress, [0, 1], [3, -4]);

  return (
    <section ref={sectionRef} className="relative w-full max-w-6xl px-4 py-16 sm:px-6 mb-12">
      <div className="max-w-3xl">
        <p className="text-[0.68rem] uppercase tracking-[0.42em] text-[#0E7EE6] font-bold">
          CAMBIOS REALES, SIN CÓDIGO
        </p>
        <h2 className="mt-4 text-3xl font-light tracking-[0.08em] text-[#111827] sm:text-5xl">
          Mantén tu sitio actualizado sin depender de un desarrollador
        </h2>
        <p className="mt-6 max-w-2xl text-sm leading-7 tracking-[0.04em] text-slate-700 sm:text-base">
          Con IMIN puedes actualizar contenido y presentación sin rehacer el sitio.
          Selecciona lo que quieres cambiar, guarda y continúa operando con una
          página vigente durante todo tu periodo de acceso.
        </p>
      </div>

      <div className="relative mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <ParallaxCard
          card={imageCards[0]}
          y={firstCardY}
          rotate={firstCardRotate}
        />
        <ParallaxCard
          card={imageCards[1]}
          y={secondCardY}
          rotate={secondCardRotate}
          className="lg:mt-20"
        />
      </div>
    </section>
  );
}
