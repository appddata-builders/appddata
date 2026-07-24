import { NextResponse } from "next/server";

import {
  getAccountSubscriptions,
  type AccountSubscriptionKind,
} from "@/lib/account-subscriptions-server";
import { getPanelPlan } from "@/lib/plans-server";
import { requirePanelSession } from "@/lib/require-panel-session";
import { stripeRequest } from "@/lib/stripe";

function isKind(value: unknown): value is AccountSubscriptionKind {
  return value === "cloud-server" || value === "technical-support";
}

function priceId(kind: AccountSubscriptionKind): string | undefined {
  return kind === "cloud-server"
    ? process.env.STRIPE_CLOUD_SERVER_MONTHLY_PRICE_ID
    : process.env.STRIPE_TECNICAL_SUPPORT_PRICE_ID;
}

async function openCheckout(request: Request, kind: unknown) {
  const session = await requirePanelSession();
  if (!session) {
    const login = new URL("/account/login", request.url);
    login.searchParams.set("siguiente", "/dashboard");
    return NextResponse.redirect(login, 303);
  }
  if (!isKind(kind)) return NextResponse.redirect(new URL("/dashboard?subscription=tipo-invalido", request.url), 303);

  const plan = await getPanelPlan(session);
  if (plan.sitePlan === "free") {
    return NextResponse.redirect(new URL("/dashboard?subscription=requiere-plan", request.url), 303);
  }

  const current = await getAccountSubscriptions(session.user.id);
  if (current.some((item) => item.kind === kind && ["active", "trialing", "past_due"].includes(item.status))) {
    return NextResponse.redirect(new URL("/dashboard?subscription=ya-activa", request.url), 303);
  }

  const price = priceId(kind);
  if (!price?.startsWith("price_")) {
    console.error(`Stripe price no configurado para ${kind}`);
    return NextResponse.redirect(new URL("/dashboard?subscription=configuracion", request.url), 303);
  }

  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const body = new URLSearchParams({
    mode: kind === "cloud-server" ? "subscription" : "payment",
    success_url: `${origin}/dashboard?subscription=activada`,
    cancel_url: `${origin}/dashboard?subscription=cancelada`,
    client_reference_id: session.user.id,
    customer_email: session.user.email,
    "branding_settings[display_name]": "Appddata",
    "metadata[user_id]": session.user.id,
    "metadata[subscription_kind]": kind,
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
  });
  if (kind === "cloud-server") {
    body.set("subscription_data[metadata][user_id]", session.user.id);
    body.set("subscription_data[metadata][subscription_kind]", kind);
  }
  const response = await stripeRequest("/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = await response.json() as { url?: string; error?: { message?: string } };
  if (!response.ok || !result.url) {
    console.error("Stripe account checkout:", result.error?.message ?? response.statusText);
    return NextResponse.redirect(new URL("/dashboard?subscription=error", request.url), 303);
  }
  return NextResponse.redirect(result.url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  return openCheckout(request, form.get("kind"));
}
