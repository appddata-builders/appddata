"use client";

import { motion } from "framer-motion";

import { IMIN_LOGO_URL } from "@/lib/public-assets";

type IminMarkProps = {
  className?: string;
  imageClassName?: string;
};

export default function IminMark({
  className = "",
  imageClassName = "",
}: IminMarkProps) {
  return (
    <div className={`relative ${className}`.trim()}>
      <motion.img
        src={IMIN_LOGO_URL}
        alt="IMIN logo"
        className={`h-full w-full object-contain backface-hidden transform-[translateZ(0)] ${imageClassName}`.trim()}
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
