import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { siteEntitlement } from "@/db/schema";
import { requirePanelSession } from "@/lib/require-panel-session";
import { ensureSiteEntitlementSchema } from "@/lib/site-entitlements-server";
import { isPaidSitePlan, stripeRequest } from "@/lib/stripe";

export async function GET(request: Request) {
  const session = await requirePanelSession();
  const dashboard = new URL("/dashboard", request.url);
  if (!session) {
    dashboard.pathname = "/account/login";
    dashboard.searchParams.set("siguiente", "/dashboard");
    return NextResponse.redirect(dashboard);
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) {
    dashboard.searchParams.set("checkout", "sesion-invalida");
    return NextResponse.redirect(dashboard);
  }

  const response = await stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const checkout = await response.json() as {
    id?: string;
    payment_status?: string;
    client_reference_id?: string;
    metadata?: { user_id?: string; plan?: string };
  };
  const plan = checkout.metadata?.plan;
  if (
    !response.ok ||
    checkout.payment_status !== "paid" ||
    checkout.client_reference_id !== session.user.id ||
    checkout.metadata?.user_id !== session.user.id ||
    !isPaidSitePlan(plan)
  ) {
    dashboard.searchParams.set("checkout", "no-confirmado");
    return NextResponse.redirect(dashboard);
  }

  await ensureSiteEntitlementSchema();
  await getDb().insert(siteEntitlement).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    plan,
    stripeSessionId: checkout.id ?? sessionId,
  }).onConflictDoNothing();

  return NextResponse.redirect(new URL("/dashboard/build?checkout=pagado", request.url));
}
