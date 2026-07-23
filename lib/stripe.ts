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
