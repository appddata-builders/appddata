"use client";

import {
  ChartColumn,
  CreditCard,
  Globe,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
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
import {
  SitePackageIcon,
  SitePackageName,
} from "@/app/components/packages/site-package-identity";
import { authClient } from "@/lib/auth-client";
import type { PanelPlan } from "@/lib/plans";
import { PLAN_LABELS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/user-initials";

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
  /** Seccion bloqueada hasta que el proyecto tenga IMIN. */
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Planes", icon: LayoutDashboard },
  { href: "/dashboard/build", label: "Appddata Build", icon: LayoutTemplate },
  { href: "/dashboard/imin", label: "IMIN", icon: Sparkles, requiresImin: true },
  { href: "/dashboard/analiticas", label: "Analiticas", icon: ChartColumn, disabled: true },
  { href: "/dashboard/dominios", label: "Dominios", icon: Globe, disabled: true },
  { href: "/dashboard/integraciones", label: "Integraciones", icon: Plug, disabled: true },
  { href: "/dashboard/seguridad", label: "Seguridad", icon: ShieldCheck, disabled: true },
  { href: "/dashboard/automatizaciones", label: "Automatizaciones", icon: Workflow },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: Users },
];

const configItems: NavItem[] = [
  { href: "/dashboard/configuracion/pagos", label: "Pagos", icon: CreditCard },
  { href: "/dashboard/configuracion/autenticacion", label: "Autenticacion", icon: KeyRound },
  { href: "/dashboard/configuracion/app", label: "Aplicacion", icon: SlidersHorizontal },
];

const SIDEBAR_STORAGE_KEY = "appddata:dashboard-sidebar-collapsed";

export function DashboardChrome({ email, name, plan, children }: DashboardChromeProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const canUpgradeToImin = plan.sitePlan !== "free" && !plan.hasImin;

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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved !== null) setSidebarCollapsed(saved === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

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
    const isPackageLink = item.href === "/dashboard/automatizaciones";
    const displayLabel =
      isPackageLink
        ? PLAN_LABELS[plan.sitePlan]
        : item.label;
    const active =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const sectionDisabled = item.disabled === true && !plan.hasImin;
    const locked = sectionDisabled || (item.requiresImin === true && !plan.hasImin);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={sidebarCollapsed ? displayLabel : undefined}
        aria-label={sidebarCollapsed ? displayLabel : undefined}
        aria-disabled={sectionDisabled || undefined}
        onClick={(event) => {
          if (sectionDisabled) {
            event.preventDefault();
            return;
          }
          setMenuOpen(false);
        }}
        className={cn(
          "relative flex h-9 items-center gap-1 rounded-md px-1.5 text-[0.8125rem] transition-colors",
          sidebarCollapsed && "lg:justify-center lg:px-0",
          sectionDisabled && "cursor-not-allowed opacity-55",
          active
            ? item.href === "/dashboard/imin"
              ? "bg-[#eaf4ff] font-medium text-[#0C6CC6]"
              : "bg-slate-100 font-medium text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )}
      >
        {isPackageLink ? (
          <SitePackageIcon plan={plan.sitePlan} className="h-4 w-4 shrink-0" />
        ) : (
          <Icon className="h-4 w-4 shrink-0" />
        )}
        <span className={cn("truncate", sidebarCollapsed && "lg:hidden")}>
          {isPackageLink ? (
            <SitePackageName plan={plan.sitePlan}>{displayLabel}</SitePackageName>
          ) : (
            displayLabel
          )}
        </span>
        {locked ? (
          <Lock
            className={cn(
              "ml-auto h-3.5 w-3.5 shrink-0 text-slate-400",
              sidebarCollapsed && "lg:absolute lg:right-0.5 lg:top-0.5 lg:h-2.5 lg:w-2.5",
            )}
          />
        ) : null}
      </Link>
    );
  }

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
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium sm:inline-flex",
            plan.sitePlan === "beginner"
              ? "border-emerald-200 bg-emerald-50"
              : "border-[#589bf9]/25 bg-[#589bf9]/10",
          )}
        >
          <SitePackageIcon plan={plan.sitePlan} className="h-3.5 w-3.5" />
          <SitePackageName plan={plan.sitePlan}>
            {PLAN_LABELS[plan.sitePlan]}
          </SitePackageName>
        </span>
        {plan.hasImin ? (
          <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-700 sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            IMIN
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {!plan.hasImin ? (
            <Link
              href="/dashboard/imin"
              className={cn(
                "hidden h-8 items-center rounded-md px-3 text-[0.8125rem] font-medium transition sm:inline-flex",
                canUpgradeToImin
                  ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                  : "bg-[#0C6CC6] text-white hover:bg-[#0a5aa6]",
              )}
            >
              {canUpgradeToImin ? "Obtener IMIN" : "Contratar"}
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
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[0.625rem] font-semibold leading-none tracking-[0.08em] text-white"
            >
              <span className="translate-y-[0.06em] leading-none">
                {getUserInitials(name, email)}
              </span>
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
            "fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-3 transition-[transform,width] duration-200 ease-out lg:sticky lg:top-14 lg:z-0 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0",
            sidebarCollapsed ? "lg:w-16" : "lg:w-56",
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

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Extender barra lateral" : "Colapsar barra lateral"}
            title={sidebarCollapsed ? "Extender barra lateral" : "Colapsar barra lateral"}
            className={cn(
              "mb-2 hidden h-9 items-center rounded-md text-[#589bf9] transition hover:bg-blue-50 hover:text-[#8a8b8c] lg:flex",
              sidebarCollapsed ? "justify-center" : "gap-2.5 px-2",
            )}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
            <span className={cn("text-xs", sidebarCollapsed && "hidden")}>Colapsar</span>
          </button>

          <nav className="grid gap-0.5 overflow-y-auto">{navItems.map(renderNavLink)}</nav>
          <nav className="mt-2 grid gap-0.5 border-t border-slate-200 pt-2">
            {configItems.map(renderNavLink)}
          </nav>

          {!plan.hasImin ? (
            <div
              className={cn(
                "mt-auto rounded-lg border p-2.5",
                canUpgradeToImin
                  ? "border-amber-200 bg-amber-50"
                  : "border-[#589bf9]/18 bg-[#589bf9]/6",
                sidebarCollapsed && "lg:hidden",
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold",
                  canUpgradeToImin ? "text-amber-800" : "text-[#0C6CC6]",
                )}
              >
                {canUpgradeToImin ? (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <SitePackageIcon plan="free" className="h-3.5 w-3.5" />
                )}
                {canUpgradeToImin ? (
                  "Obtener IMIN"
                ) : (
                  <SitePackageName plan="free">{PLAN_LABELS.free}</SitePackageName>
                )}
              </p>
              <p className="mt-1 text-[0.68rem] leading-4 text-slate-600">
                {canUpgradeToImin
                  ? "Personaliza y actualiza tu sitio cuando quieras con IMIN."
                  : "Contrata un paquete con nosotros y da el salto a una nueva plataforma."}
              </p>
              <Link
                href="/dashboard/imin"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "mt-2 flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-medium transition",
                  canUpgradeToImin
                    ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                    : "bg-[#0C6CC6] text-white hover:bg-[#0a5aa6]",
                )}
              >
                {canUpgradeToImin ? "Obtener IMIN" : "Contratar"}
              </Link>
            </div>
          ) : null}

          {!plan.hasImin && sidebarCollapsed ? (
            <Link
              href="/dashboard/imin"
              title={canUpgradeToImin ? "Obtener IMIN" : "Contratar"}
              aria-label={canUpgradeToImin ? "Obtener IMIN" : "Contratar"}
              className={cn(
                "mt-auto hidden h-9 items-center justify-center rounded-md transition lg:flex",
                canUpgradeToImin
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-[#eaf4ff] text-[#0C6CC6] hover:bg-[#dceeff]",
              )}
            >
              {canUpgradeToImin ? (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              ) : (
                <SitePackageIcon plan="free" className="h-4 w-4" />
              )}
            </Link>
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
