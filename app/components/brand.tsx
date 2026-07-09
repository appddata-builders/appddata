"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

type BrandSize = "sm" | "md" | "lg";

type BrandProps = {
  className?: string;
  planeClassName?: string;
  textClassName?: string;
  textContent?: ReactNode;
  size?: BrandSize;
};

const sizeStyles: Record<BrandSize, { wrapper: string; plane: string; text: string }> = {
  sm: {
    wrapper: "gap-1",
    plane: "h-[34px] w-[42px] sm:h-[42px] sm:w-[52px]",
    text: "text-[1.05rem] tracking-[0.12em] sm:text-[1.35rem]",
  },
  md: {
    wrapper: "gap-1.5",
    plane: "h-[64px] w-[80px] sm:h-[84px] sm:w-[104px]",
    text: "text-[1.8rem] tracking-[0.12em] sm:text-[2.75rem]",
  },
  lg: {
    wrapper: "gap-1.5 sm:gap-2.5",
    plane: "h-[96px] w-[120px] sm:h-[140px] sm:w-[176px]",
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
  const styles = sizeStyles[size];

  return (
    <div className={`flex items-center ${styles.wrapper} ${className}`.trim()}>
      <div className={`relative shrink-0 ${styles.plane} ${planeClassName}`.trim()}>
        <motion.img
          src="/brand-plane.png"
          alt="appdda"
          className="h-full w-full object-contain backface-hidden transform-[translateZ(0)]"
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </div>

      <div
        className={`flex overflow-hidden font-(family-name:--font-diphylleia) ${styles.text} ${textClassName}`.trim()}
      >
        {textContent ?? (
          <>
            <span className="inline-block text-[#589bf9]">A</span>
            <span className="inline-block text-[#589bf9]">p</span>
            <span className="inline-block text-[#589bf9]">p</span>
            <span className="inline-block text-[#8a8b8c]">d</span>
            <span className="inline-block text-[#8a8b8c]">d</span>
            <span className="inline-block text-[#8a8b8c]">a</span>
          </>
        )}
      </div>
    </div>
  );
}
