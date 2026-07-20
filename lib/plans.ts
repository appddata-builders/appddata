/**
 * Paquetes contratados por proyecto: tipos y etiquetas.
 *
 * Este modulo lo importan tambien los client components (el chrome del panel),
 * asi que no puede tocar la base de datos. Las consultas viven en
 * lib/plans-server.ts.
 */

export type ProjectPlan = "free" | "imin";

export const PLAN_LABELS: Record<ProjectPlan, string> = {
  free: "Free",
  imin: "IMIN",
};

export type PanelPlan = {
  projectSlug: string | null;
  projectName: string | null;
  plan: ProjectPlan;
  /** Si es false, /dashboard/imin muestra la pantalla de venta en vez del editor. */
  hasImin: boolean;
  isInternal: boolean;
};

export function normalizePlan(raw: string | null | undefined): ProjectPlan {
  return raw === "imin" ? "imin" : "free";
}
