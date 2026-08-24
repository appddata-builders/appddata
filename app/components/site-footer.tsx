"use client";

import { useT } from "@/lib/text/text-provider";

import Brand from "./brand";

const footerLinks = [
  { key: "es.footer.links.products", href: "/products" },
  { key: "es.footer.links.imin", href: "/imin" },
  { key: "es.footer.links.about", href: "/about" },
  { key: "es.footer.links.testimonial", href: "/products#testimonial" },
  { key: "es.footer.links.privacy", href: "/privacy-policy" },
];

export default function SiteFooter() {
  const t = useT();

  return (
    <footer className="w-full border-t border-slate-200 bg-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <Brand size="sm" />
            <p className="max-w-md text-sm leading-7 tracking-[0.04em] text-slate-300">
              {t("es.footer.tagline")}
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap sm:justify-end">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[0.72rem] uppercase tracking-[0.34em] text-[#6ca5db] transition-opacity hover:opacity-75"
              >
                {t(link.key)}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 text-[0.68rem] uppercase tracking-[0.28em] text-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("es.footer.legend")}</p>
          <p>{t("es.footer.privacyNotice")}</p>
        </div>
      </div>
    </footer>
  );
}
