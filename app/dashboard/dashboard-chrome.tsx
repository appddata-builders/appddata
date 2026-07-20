"use client";

import {
  Bot,
  ChartColumn,
  Code,
  Globe,
  KeyRound,
  LayoutDashboard,
  Lock,
  Palette,
  Plug,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Brand from "@/app/components/brand";
import { authClient } from "@/lib/auth-client";
import type { PanelPlan } from "@/lib/plans";
import { PLAN_LABELS } from "@/lib/plans";
import { cn } from "@/lib/utils";

type DashboardChromeProps = {
  email: string;
  name: string | null;
  plan: PanelPlan;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Requiere el paquete IMIN; sin el se muestra con candado. */
  requiresImin?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/imin", label: "IMIN", icon: Sparkles, requiresImin: true },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users },
  { href: "/dashboard/analiticas", label: "Analiticas", icon: ChartColumn },
  { href: "/dashboard/dominios", label: "Dominios", icon: Globe },
  { href: "/dashboard/integraciones", label: "Integraciones", icon: Plug },
  { href: "/dashboard/seguridad", label: "Seguridad", icon: ShieldCheck },
  { href: "/dashboard/agentes", label: "Agentes", icon: Bot },
  { href: "/dashboard/automatizaciones", label: "Automatizaciones", icon: Workflow },
  { href: "/dashboard/registros", label: "Registros", icon: ScrollText },
  { href: "/dashboard/api", label: "API", icon: Code },
];

const configItems: NavItem[] = [
  { href: "/dashboard/configuracion/plantilla", label: "Plantilla", icon: Palette },
  { href: "/dashboard/configuracion/autenticacion", label: "Autenticacion", icon: KeyRound },
  { href: "/dashboard/configuracion/app", label: "Aplicacion", icon: SlidersHorizontal },
];

function initialsOf(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export function DashboardChrome({ email, name, plan, children }: DashboardChromeProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menu de usuario al hacer clic fuera, como cualquier popover.
  useEffect(() => {
    if (!userMenuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (userMenuRef.current?.contains(event.target as Node)) return;
      setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [userMenuOpen]);

  async function onSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess() {
          // El flag evita que el login vea la sesion recien caducada en cache
          // y rebote de vuelta al panel.
          window.location.href = "/account/login?sesionCerrada=1";
        },
      },
    });
  }

  function renderNavLink(item: NavItem) {
    const active =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const locked = item.requiresImin === true && !plan.hasImin;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMenuOpen(false)}
        className={cn(
          "flex h-8 items-center gap-2.5 rounded-md px-2 text-[0.8125rem] transition-colors",
          active
            ? "bg-slate-100 font-medium text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {locked ? <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" /> : null}
      </Link>
    );
  }

  // Solo se muestra el separador cuando hay algo que separar: un admin interno
  // o un cliente todavia sin proyecto ven unicamente la marca.
  const scopeLabel = plan.isInternal ? null : plan.projectName;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button
          type="button"
          className="-ml-1 rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <span className="block h-px w-4 bg-current shadow-[0_4px_0_currentColor,0_-4px_0_currentColor]" />
        </button>

        <Link href="/dashboard" aria-label="Ir al resumen">
          <Brand size="sm" textClassName="text-[1.05rem] tracking-[0.1em] sm:text-[1.05rem]" />
        </Link>
        {scopeLabel ? (
          <>
            <span className="text-slate-300">/</span>
            <span className="truncate text-sm text-slate-600">{scopeLabel}</span>
          </>
        ) : null}
        <span
          className={cn(
            "hidden rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium sm:inline",
            plan.hasImin
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
          )}
        >
          {plan.isInternal ? "Interno" : PLAN_LABELS[plan.plan]}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {!plan.hasImin ? (
            <Link
              href="/dashboard/imin"
              className="hidden h-8 items-center rounded-md bg-[#0C6CC6] px-3 text-[0.8125rem] font-medium text-white transition hover:bg-[#0a5aa6] sm:inline-flex"
            >
              Mejorar plan
            </Link>
          ) : null}
          <Link
            href="/"
            className="hidden h-8 items-center rounded-md px-2.5 text-[0.8125rem] text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
          >
            Ir al sitio
          </Link>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[0.6875rem] font-semibold text-white"
            >
              {initialsOf(name, email)}
            </button>
            {userMenuOpen ? (
              <div className="absolute right-0 top-10 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-medium text-slate-900">{name ?? email}</p>
                  <p className="truncate text-xs text-slate-500">{email}</p>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="mt-1 w-full rounded-md px-3 py-2 text-left text-[0.8125rem] text-slate-700 transition hover:bg-slate-50"
                >
                  Cerrar sesion
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white px-3 py-3 transition-transform lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-2 pb-2 lg:hidden">
            <span className="text-sm font-semibold">Menu</span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              onClick={() => setMenuOpen(false)}
            >
              Cerrar
            </button>
          </div>

          <nav className="grid gap-0.5 overflow-y-auto">{navItems.map(renderNavLink)}</nav>
          <nav className="mt-2 grid gap-0.5 border-t border-slate-200 pt-2">
            {configItems.map(renderNavLink)}
          </nav>

          {!plan.hasImin ? (
            <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[0.8125rem] font-medium text-slate-900">
                Plan {PLAN_LABELS[plan.plan]}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Contrata IMIN para editar los textos y el tutorial de tu sitio.
              </p>
              <Link
                href="/dashboard/imin"
                onClick={() => setMenuOpen(false)}
                className="mt-3 flex h-8 items-center justify-center rounded-md bg-[#0C6CC6] px-3 text-[0.8125rem] font-medium text-white transition hover:bg-[#0a5aa6]"
              >
                Mejorar plan
              </Link>
            </div>
          ) : null}
        </aside>

        {menuOpen ? (
          <button
            type="button"
            aria-label="Cerrar menu"
            className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
