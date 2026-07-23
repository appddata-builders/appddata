import { NextResponse } from "next/server";

import { requirePanelSession } from "@/lib/require-panel-session";
import { isPaidSitePlan, STRIPE_PACKAGES, stripeRequest } from "@/lib/stripe";

async function openCheckout(request: Request, plan: unknown) {
  const session = await requirePanelSession();
  if (!isPaidSitePlan(plan)) return NextResponse.redirect(new URL("/dashboard?checkout=plan-invalido", request.url), 303);
  if (!session) {
    const login = new URL("/account/login", request.url);
    login.searchParams.set("motivo", "comprar-paquete");
    login.searchParams.set("siguiente", `/api/stripe/checkout?plan=${encodeURIComponent(plan)}`);
    return NextResponse.redirect(login, 303);
  }

  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const selected = STRIPE_PACKAGES[plan];
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/api/stripe/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?checkout=cancelado`,
    client_reference_id: session.user.id,
    customer_email: session.user.email,
    "branding_settings[display_name]": "Appddata",
    "metadata[user_id]": session.user.id,
    "metadata[plan]": plan,
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
    console.error("Stripe checkout:", result.error?.message ?? response.statusText);
    return NextResponse.redirect(new URL("/dashboard?checkout=error", request.url), 303);
  }
  return NextResponse.redirect(result.url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  return openCheckout(request, form.get("plan"));
}

/** Continuación después del login: conserva el paquete elegido en el home. */
export async function GET(request: Request) {
  return openCheckout(request, new URL(request.url).searchParams.get("plan"));
}
