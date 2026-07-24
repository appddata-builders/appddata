import { NextResponse } from "next/server";

import { requirePanelSession } from "@/lib/require-panel-session";
import { IMIN_TIERS, isIminTier, stripeRequest } from "@/lib/stripe";

/**
 * Checkout de la suscripcion IMIN. Un pago por periodo (mensual / 6 meses /
 * anual): al confirmarse otorga acceso IMIN a nivel de cuenta hasta `now + days`
 * (ver /api/stripe/imin-confirm). No es recurrente: al vencer, IMIN se remueve.
 */
async function openCheckout(request: Request, tier: unknown) {
  const session = await requirePanelSession();
  if (!isIminTier(tier)) return NextResponse.redirect(new URL("/dashboard/imin?imin=tier-invalido", request.url), 303);
  if (!session) {
    const login = new URL("/account/login", request.url);
    login.searchParams.set("motivo", "suscribir-imin");
    login.searchParams.set("siguiente", `/api/stripe/imin-checkout?tier=${encodeURIComponent(tier)}`);
    return NextResponse.redirect(login, 303);
  }

  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const selected = IMIN_TIERS[tier];
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/api/stripe/imin-confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard/imin?imin=cancelado`,
    client_reference_id: session.user.id,
    customer_email: session.user.email,
    "branding_settings[display_name]": "Appddata",
    "metadata[user_id]": session.user.id,
    "metadata[imin_tier]": tier,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "mxn",
    "line_items[0][price_data][unit_amount]": String(selected.amount),
    "line_items[0][price_data][product_data][name]": selected.name,
  });

  const response = await stripeRequest("/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = await response.json() as { url?: string; error?: { message?: string } };
  if (!response.ok || !result.url) {
    console.error("Stripe IMIN checkout:", result.error?.message ?? response.statusText);
    return NextResponse.redirect(new URL("/dashboard/imin?imin=error", request.url), 303);
  }
  return NextResponse.redirect(result.url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  return openCheckout(request, form.get("tier"));
}

/** Continuacion tras el login: conserva el tier elegido. */
export async function GET(request: Request) {
  return openCheckout(request, new URL(request.url).searchParams.get("tier"));
}
