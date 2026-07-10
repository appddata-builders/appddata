"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { CiLogin } from "react-icons/ci";
import { FaUserCircle, FaRegEdit } from "react-icons/fa";
import { AiFillProduct } from "react-icons/ai";
import { TfiWrite } from "react-icons/tfi";

import Brand from "./brand";

const navItems = [
  { label: "IMIN", href: "/imin", icon: FaRegEdit },
  { label: "ABOUT", href: "/about", icon: TfiWrite },
  { label: "PRODUCTS", href: "/products", icon: AiFillProduct },
];

type NavbarContentProps = {
  pathname: string;
};

function NavbarContent({ pathname }: NavbarContentProps) {
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const isOpen = openPathname === pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        pointerEvents: "auto",
      }}
      transition={{
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`fixed left-0 top-0 z-40 w-full rounded-b-3xl border border-slate-200 bg-stone-50/80 backdrop-blur-sm overflow-hidden transition-shadow duration-300 ${scrolled ? "shadow-[0_8px_32px_rgba(15,23,42,0.10)]" : ""}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
        <Link
          href="/?from=logo"
          className="flex min-w-0 flex-none items-center justify-center"
        >
          <Brand size="sm" />
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            onClick={() => setOpenPathname((current) => (current === pathname ? null : pathname))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-800 transition-colors hover:bg-slate-100 sm:h-11 sm:w-11"
          >
            <span className="relative flex h-4 w-5 flex-col items-center justify-center">
              <span
                className={`absolute block h-px w-4 bg-current transition-transform duration-300 sm:w-5 ${
                  isOpen ? "rotate-45" : "-translate-y-1.5"
                }`}
              />
              <span
                className={`absolute block h-px w-4 bg-current transition-opacity duration-200 sm:w-5 ${
                  isOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute block h-px w-4 bg-current transition-transform duration-300 sm:w-5 ${
                  isOpen ? "-rotate-45" : "translate-y-1.5"
                }`}
              />
            </span>
          </button>

          <Link
            href="/account"
            aria-label="Crear cuenta o iniciar sesion"
            className="flex h-9 items-center gap-2 rounded-full border border-[#589bf9]/20 bg-[#589bf9]/8 px-3 text-[#0C6CC6] transition hover:border-[#589bf9]/38 hover:bg-[#589bf9]/16 sm:h-11 sm:px-4"
          >
            <FaUserCircle className="h-4 w-4 shrink-0 sm:h-[1.05rem] sm:w-[1.05rem]" />
            <span className="hidden text-[0.68rem] uppercase tracking-[0.24em] sm:inline-block">
              Cuenta
            </span>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.nav
            initial={{ opacity: 0, y: -12, scale: 0.98, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(10px)" }}
            transition={{
              duration: 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-3 rounded-[1.75rem] border border-slate-200 bg-white/96 p-3 backdrop-blur-sm"
          >
            <div className="grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenPathname(null)}
                  className="flex min-h-11 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm uppercase tracking-[0.24em] text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <span>{item.label}</span>
                  <span className="text-slate-600">
                    <item.icon className="h-4 w-4" />
                  </span>
                </Link>
              ))}

              <Link
                href="/account"
                onClick={() => setOpenPathname(null)}
                className="flex min-h-11 items-center justify-between rounded-2xl border border-[#589bf9]/18 bg-[#589bf9]/10 px-4 py-3 text-left text-sm uppercase tracking-[0.24em] text-[#0C6CC6] transition-colors hover:bg-[#589bf9]/16"
              >
                <span className="flex items-center gap-3">
                  <FaUserCircle className="h-[1.05rem] w-[1.05rem] shrink-0" />
                  <span>Cuenta</span>
                </span>
                <span className="text-violet-700">
                  <CiLogin className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return <NavbarContent pathname={pathname} />;
}
