import type { SitePlan } from "@/lib/site-packages";

const STRIPE_API = "https://api.stripe.com/v1";

export const STRIPE_PACKAGES: Record<Exclude<SitePlan, "free">, { name: string; amount: number }> = {
  beginner: { name: "Appddata Beginner", amount: 1_000_000 },
  super: { name: "Appddata Super", amount: 2_800_000 },
  premium: { name: "Appddata Premium", amount: 3_500_000 },
};

export function isPaidSitePlan(value: unknown): value is keyof typeof STRIPE_PACKAGES {
  return typeof value === "string" && value in STRIPE_PACKAGES;
}

/**
 * Periodos de acceso a IMIN. `amount` en centavos MXN; `days` es la vigencia que
 * se otorga al pagar (el acceso caduca en `now + days`). El id coincide con el
 * de los tiers mostrados en la pantalla de venta (imin-upgrade).
 */
export const IMIN_TIERS: Record<string, { name: string; amount: number; days: number }> = {
  monthly: { name: "IMIN · Mensual", amount: 14_900, days: 30 },
  "six-months": { name: "IMIN · 6 meses", amount: 84_500, days: 182 },
  annual: { name: "IMIN · Anual", amount: 159_900, days: 365 },
};

export function isIminTier(value: unknown): value is keyof typeof IMIN_TIERS {
  return typeof value === "string" && value in IMIN_TIERS;
}

export async function stripeRequest(path: string, init?: RequestInit) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY no está configurada.");
  return fetch(`${STRIPE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Stripe-Version": "2025-09-30.clover",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}
