/**
 * Paquetes contratados por proyecto: tipos y etiquetas.
 *
 * Este modulo lo importan tambien los client components (el chrome del panel),
 * asi que no puede tocar la base de datos. Las consultas viven en
 * lib/plans-server.ts.
 */

import type { SitePlan } from "@/lib/site-packages";

export type ProjectPlan = "free" | "beginner" | "super" | "premium" | "imin";

export const PLAN_LABELS: Record<ProjectPlan, string> = {
  free: "Free",
  beginner: "Beginner",
  super: "Super",
  premium: "Premium",
  imin: "IMIN",
};

export type PanelPlan = {
  projectSlug: string | null;
  projectName: string | null;
  plan: ProjectPlan;
  /** Paquete del sitio; IMIN se maneja como complemento independiente. */
  sitePlan: SitePlan;
  /** Si es false, /dashboard/imin muestra la pantalla de venta en vez del editor. */
  hasImin: boolean;
  /** Compra pagada que todavía no ha sido consumida por un proyecto. */
  hasUnassignedSitePackage: boolean;
  isInternal: boolean;
};

export function normalizePlan(raw: string | null | undefined): ProjectPlan {
  return raw === "imin" || raw === "beginner" || raw === "super" || raw === "premium"
    ? raw
    : "free";
}

export function sitePlanFromProjectPlan(plan: ProjectPlan): SitePlan {
  // Compatibilidad con cuentas anteriores: `imin` representaba todo el plan.
  return plan === "imin" ? "premium" : plan;
}
