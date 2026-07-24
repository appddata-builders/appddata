import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { iminEntitlement } from "@/db/schema";
import { ensureIminEntitlementSchema, hasUsedIminTrial } from "@/lib/imin-entitlements-server";
import { requirePanelSession } from "@/lib/require-panel-session";

const TRIAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Prueba gratuita de IMIN: otorga acceso por unos dias, una sola vez por cuenta.
 * No pasa por Stripe. El `stripe_session_id` "trial:<user>" es unico, asi que
 * un segundo intento no genera otra prueba.
 */
export async function POST(request: Request) {
  const session = await requirePanelSession();
  const back = new URL("/dashboard/imin", request.url);
  if (!session) {
    back.pathname = "/account/login";
    back.searchParams.set("siguiente", "/dashboard/imin");
    return NextResponse.redirect(back, 303);
  }

  await ensureIminEntitlementSchema();
  if (await hasUsedIminTrial(session.user.id)) {
    back.searchParams.set("imin", "trial-used");
    return NextResponse.redirect(back, 303);
  }
  await getDb().insert(iminEntitlement).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    tier: "trial",
    stripeSessionId: `trial:${session.user.id}`,
    expiresAt: new Date(Date.now() + TRIAL_DAYS * DAY_MS),
  }).onConflictDoNothing();

  back.searchParams.set("imin", "trial");
  return NextResponse.redirect(back, 303);
}
