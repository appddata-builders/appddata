/**
 * Paquetes contratados por proyecto: tipos y etiquetas.
 *
 * Este modulo lo importan tambien los client components (el chrome del panel),
 * asi que no puede tocar la base de datos. Las consultas viven en
 * lib/plans-server.ts.
 */

import type { SitePlan } from "@/lib/site-packages";

export type ProjectPlan = "free" | "beginner" | "super" | "premium" | "imin";
export type PurchasableSitePlan = Exclude<SitePlan, "free">;
export type AvailableSitePackages = Record<PurchasableSitePlan, number>;

export const PLAN_LABELS: Record<ProjectPlan, string> = {
  free: "Gratis",
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
  /** Cuántos sitios puede crear ahora mismo (tickets/monedas sin consumir). */
  availableSites: number;
  /** Inventario de tickets sin consumir, separado por paquete contratado. */
  availableSitePackages: AvailableSitePackages;
  /**
   * Plan del ticket que se consumira al crear el proximo sitio. El builder debe
   * abrir con las especificaciones de ESTE plan (el contratado para el sitio
   * nuevo), no las del plan mas grande al que apunte la cuenta. `null` si no hay
   * ticket pendiente.
   */
  pendingSitePlan: SitePlan | null;
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

/**
 * Fuente unica de verdad de "este plan incluye el editor IMIN". La habilitacion
 * del panel (getPanelPlan.hasImin) y los guards de las rutas del editor deben
 * usar esto para no divergir: `premium` tambien contrata IMIN.
 */
export function planHasImin(plan: ProjectPlan): boolean {
  return plan === "imin" || plan === "premium";
}
