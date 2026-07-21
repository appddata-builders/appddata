"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FaBolt, FaBoxOpen, FaGem, FaSeedling } from "react-icons/fa6";

import type { SitePlan } from "@/lib/site-packages";
import { cn } from "@/lib/utils";

export function SitePackageIcon({ plan, className }: { plan: SitePlan; className?: string }) {
  const iconClassName = cn(
    "h-4 w-4",
    plan === "premium"
      ? "text-[#589bf9]"
      : plan === "super"
        ? "text-amber-400"
        : plan === "beginner"
          ? "text-[#4f9b7a]"
          : "text-[#0C6CC6]",
    className,
  );
  if (plan === "premium") return <FaGem className={iconClassName} aria-hidden="true" />;
  if (plan === "super") return <FaBolt className={iconClassName} aria-hidden="true" />;
  if (plan === "beginner") return <FaSeedling className={iconClassName} aria-hidden="true" />;
  return <FaBoxOpen className={iconClassName} aria-hidden="true" />;
}

export function SitePackageName({
  plan,
  children,
  className,
}: {
  plan: SitePlan;
  children: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion() ?? false;

  if (plan !== "premium") {
    return (
      <span
        className={cn(
          plan === "super"
            ? "text-amber-400"
            : plan === "beginner"
              ? "text-[#4f9b7a]"
              : "text-[#0C6CC6]",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap filter-[drop-shadow(0_0_10px_rgba(88,155,249,0.24))]",
        className,
      )}
    >
      {Array.from(children).map((letter, index) => (
        <motion.span
          key={`${letter}-${index}`}
          className="inline-block bg-[linear-gradient(120deg,#5d9ff2_0%,#b7d5ef_20%,#78afe8_36%,#a8c8e5_52%,#bdd4e9_70%,#397fd4_100%)] bg-[length:220%_220%] bg-clip-text text-transparent"
          animate={
            reduceMotion
              ? undefined
              : { opacity: [0.94, 1, 0.96, 1, 0.94], backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
          }
          transition={{ duration: 3.8, delay: index * 0.08, repeat: Infinity, ease: "easeInOut" }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </span>
  );
}
