import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { iminEntitlement } from "@/db/schema";
import { ensureIminEntitlementSchema } from "@/lib/imin-entitlements-server";
import { requirePanelSession } from "@/lib/require-panel-session";
import { IMIN_TIERS, isIminTier, stripeRequest } from "@/lib/stripe";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const session = await requirePanelSession();
  const back = new URL("/dashboard/imin", request.url);
  if (!session) {
    back.pathname = "/account/login";
    back.searchParams.set("siguiente", "/dashboard/imin");
    return NextResponse.redirect(back);
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) {
    back.searchParams.set("imin", "sesion-invalida");
    return NextResponse.redirect(back);
  }

  const response = await stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const checkout = await response.json() as {
    id?: string;
    payment_status?: string;
    client_reference_id?: string;
    metadata?: { user_id?: string; imin_tier?: string };
  };
  const tier = checkout.metadata?.imin_tier;
  if (
    !response.ok ||
    checkout.payment_status !== "paid" ||
    checkout.client_reference_id !== session.user.id ||
    checkout.metadata?.user_id !== session.user.id ||
    !isIminTier(tier)
  ) {
    back.searchParams.set("imin", "no-confirmado");
    return NextResponse.redirect(back);
  }

  // Acceso desde ahora + la vigencia del tier. Si ya tenia uno vigente, esta es
  // una compra nueva que corre en paralelo; getPanelPlan toma la mas lejana.
  const expiresAt = new Date(Date.now() + IMIN_TIERS[tier].days * DAY_MS);
  await ensureIminEntitlementSchema();
  await getDb().insert(iminEntitlement).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    tier,
    stripeSessionId: checkout.id ?? sessionId,
    expiresAt,
  }).onConflictDoNothing();

  return NextResponse.redirect(new URL("/dashboard/imin?imin=activado", request.url));
}
