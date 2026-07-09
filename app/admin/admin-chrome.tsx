"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AdminChromeProps = {
  email: string;
  name: string | null;
  children: React.ReactNode;
};

const navSections: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Principal",
    items: [
      { href: "/admin", label: "Resumen" },
      { href: "/admin/usuarios", label: "Usuarios" },
    ],
  },
  {
    title: "Proyectos",
    items: [
      { href: "/admin/proyectos/lake-sport-club", label: "Lake Sport Club" },
      { href: "/admin/proyectos/pilates-studio", label: "Pilates Studio" },
      { href: "/admin/proyectos/pulsety", label: "Pulsety" },
      { href: "/admin/proyectos/refautomex", label: "Refautomex" },
    ],
  },
  {
    title: "Operacion",
    items: [
      { href: "/admin/analiticas", label: "Analiticas" },
      { href: "/admin/dominios", label: "Dominios" },
      { href: "/admin/integraciones", label: "Integraciones" },
      { href: "/admin/seguridad", label: "Seguridad" },
      { href: "/admin/agentes", label: "Agentes" },
      { href: "/admin/automatizaciones", label: "Automatizaciones" },
      { href: "/admin/registros", label: "Registros" },
      { href: "/admin/api", label: "API" },
    ],
  },
  {
    title: "Configuracion",
    items: [
      { href: "/admin/configuracion/plantilla", label: "Plantilla" },
      { href: "/admin/configuracion/autenticacion", label: "Autenticacion" },
      { href: "/admin/configuracion/app", label: "Aplicacion" },
    ],
  },
];

export function AdminChrome({ email, name, children }: AdminChromeProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function onSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess() {
          window.location.href = "/account";
        },
      },
    });
  }

  return (
    <div className="flex min-h-screen w-full bg-white text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-white px-4 py-6 transition-transform lg:static lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.34em] text-primary/80">appdda</p>
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-foreground/80">Panel interno</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-border px-3 py-2 text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            Cerrar
          </button>
        </div>

        <div className="mt-8 space-y-8 overflow-y-auto pb-10" style={{ maxHeight: "calc(100vh - 7rem)" }}>
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
                {section.title}
              </p>
              <div className="mt-3 grid gap-2">
                {section.items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-sm uppercase tracking-[0.18em] transition",
                        active
                          ? "border-primary/35 bg-primary/12 text-[#0C6CC6]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-white/95 p-4">
          <p className="text-xs tracking-[0.06em] text-muted-foreground">{name ?? email}</p>
          <p className="text-[0.72rem] tracking-[0.04em] text-slate-600">{email}</p>
          <Button type="button" variant="outline" className="mt-3 w-full text-xs" onClick={onSignOut}>
            Cerrar sesion
          </Button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Cerrar menu"
          className="fixed inset-0 z-30 bg-slate-500 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-border px-3 py-2 text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              Menu
            </button>
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">Back office</p>
          </div>
          <Link
            href="/"
            className="text-[0.65rem] uppercase tracking-[0.26em] text-slate-600 transition hover:text-slate-700"
          >
            Ir al sitio
          </Link>
        </header>
        <div className="flex-1 px-4 py-8 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
