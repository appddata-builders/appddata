import Brand from "./brand";

const footerLinks = [
  { label: "PRODUCTS", href: "/products" },
  { label: "IMIN", href: "/imin" },
  { label: "ABOUT", href: "/about" },
  { label: "TESTIMONIAL", href: "/products#testimonial" },
  { label: "AVISO DE PRIVACIDAD", href: "/privacy-policy" },
];

export default function SiteFooter() {
  return (
    <footer className="w-full border-t border-slate-200 bg-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <Brand size="sm" />
            <p className="max-w-md text-sm leading-7 tracking-[0.04em] text-slate-300">
              - Innovating digital presence anywhere, anytime.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap sm:justify-end">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[0.72rem] uppercase tracking-[0.34em] text-[#6ca5db] transition-opacity hover:opacity-75"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 text-[0.68rem] uppercase tracking-[0.28em] text-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p>Precencia Digital.</p>
          <p>Consulta nuestro aviso de privacidad para obtener más información sobre cómo recopilamos y utilizamos tu información personal.</p>
        </div>
      </div>
    </footer>
  );
}
