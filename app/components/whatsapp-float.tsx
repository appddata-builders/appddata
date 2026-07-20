"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IoClose } from "react-icons/io5";

const WHATSAPP_PHONE = "5512879683";
const WHATSAPP_MESSAGE = "Buenas tardes, appddata, quisiera conocer mas sobre sus productos.";
const WHATSAPP_URL = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
const HOME_LOADER_DURATION_MS = 4400;

export default function WhatsAppFloat() {
  const [showLabel, setShowLabel] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/dashboard")) {
      return;
    }

    if (pathname !== "/") {
      const timeoutId = window.setTimeout(() => {
        setIsVisible(true);
      }, 0);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    let cancelled = false;
    const resetId = window.setTimeout(() => {
      if (!cancelled) {
        setIsVisible(false);
      }
    }, 0);
    const showId = window.setTimeout(() => {
      if (!cancelled) {
        setIsVisible(true);
      }
    }, HOME_LOADER_DURATION_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(resetId);
      window.clearTimeout(showId);
    };
  }, [pathname]);

  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {showLabel ? (
        <div className="flex justify-center items-center max-w-[16rem] gap-1 rounded-[1.25rem] border border-[#589bf9]/18 bg-blue-300/4 p-2 text-right shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl animate-bounce">
          <p className="text-xs uppercase tracking-[0.18em] text-[#0C6CC6] pl-2 pt-0.5">
          Contáctanos.
          </p>
          <button
            type="button"
            aria-label="Cerrar letrero de WhatsApp"
            onClick={() => setShowLabel(false)}
            className="mt-0.5 shrink-0 text-[0.65rem] uppercase tracking-[0.24em] text-slate-600 transition hover:text-slate-700 rounded-full p-0.5 border border-red-200 cursor-pointer"
          >
            <IoClose className="text-red-200" size={12} />
          </button>
        </div>
      ) : null}

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/24 bg-green-500/15 text-emerald-600 shadow-[0_16px_40px_rgba(16,185,129,0.16)] backdrop-blur-xl transition hover:border-emerald-500/40 hover:bg-emerald-50 md:h-20 md:w-20"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-7 w-7 md:h-9 md:w-9"
          fill="currentColor"
        >
          <path d="M19.11 4.89A9.93 9.93 0 0 0 12.03 2C6.5 2 2 6.5 2 12.03c0 1.77.46 3.49 1.33 5.01L2 22l5.09-1.31a10 10 0 0 0 4.94 1.27h.01c5.53 0 10.03-4.5 10.03-10.03a9.96 9.96 0 0 0-2.96-7.04Zm-7.08 15.38h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.02.78.81-2.94-.2-.31A8.28 8.28 0 0 1 3.73 12c0-4.57 3.72-8.29 8.3-8.29 2.21 0 4.29.86 5.85 2.43A8.22 8.22 0 0 1 20.3 12c0 4.57-3.71 8.28-8.27 8.28Zm4.54-6.18c-.25-.12-1.49-.73-1.72-.81-.23-.09-.4-.12-.57.12-.17.25-.65.81-.79.98-.15.17-.3.19-.55.06-.25-.12-1.07-.39-2.03-1.25-.75-.67-1.25-1.49-1.4-1.74-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.57-1.36-.78-1.86-.21-.5-.42-.43-.57-.44h-.49c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.43 1.02 2.6c.13.17 1.78 2.72 4.31 3.81.6.26 1.08.41 1.45.52.61.19 1.16.16 1.59.1.49-.07 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.1-.23-.16-.48-.28Z" />
        </svg>
      </a>
    </div>
  );
}
