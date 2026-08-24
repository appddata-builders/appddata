"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { BRAND_PLANE_URL } from "@/lib/public-assets";
import { useT } from "@/lib/text/text-provider";

type BrandSize = "sm" | "md" | "lg";

type BrandProps = {
  className?: string;
  planeClassName?: string;
  textClassName?: string;
  textContent?: ReactNode;
  size?: BrandSize;
};

const sizeStyles: Record<BrandSize, { plane: string; text: string }> = {
  sm: {
    plane: "h-[22px] w-[45px] sm:h-[25px] sm:w-[52px]",
    text: "text-[1.05rem] tracking-[0.12em] sm:text-[1.35rem]",
  },
  md: {
    plane: "h-[45px] w-[80px] sm:h-[50px] sm:w-[104px]",
    text: "text-[1.8rem] tracking-[0.12em] sm:text-[2.75rem]",
  },
  lg: {
    plane: "h-[90px] w-[120px] sm:h-[95px] sm:w-[176px]",
    text: "text-[2.4rem] tracking-[0.12em] sm:text-[4.5rem]",
  },
};

export default function Brand({
  className = "",
  planeClassName = "",
  textClassName = "",
  textContent,
  size = "md",
}: BrandProps) {
  const t = useT();
  const styles = sizeStyles[size];
  // La marca se pinta letra por letra para poder animarla, pero el nombre sale
  // de `hydrate`: se parte en las dos mitades que llevan color propio.
  const brandLead = [...t("es.brand.lead")];
  const brandTail = [...t("es.brand.tail")];

  return (
    <div className={`flex items-center ${className}`.trim()}>
      <div className={`relative shrink-0 ${styles.plane} ${planeClassName}`.trim()}>
        <motion.img
          src={BRAND_PLANE_URL}
          alt={t("es.brand.alt")}
          className="h-full w-full object-contain backface-hidden transform-[translateZ(0)]"
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </div>

      <div
        className={`flex overflow-hidden font-semibold ${styles.text} ${textClassName}`.trim()}
      >
        {textContent ?? (
          <>
            {brandLead.map((letter, index) => (
              <span key={`lead-${index}`} className="inline-block text-[#589bf9]">
                {letter}
              </span>
            ))}
            {brandTail.map((letter, index) => (
              <span key={`tail-${index}`} className="inline-block text-[#8a8b8c]">
                {letter}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
