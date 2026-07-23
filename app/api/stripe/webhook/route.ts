import { createHmac, timingSafeEqual } from "node:crypto";

import { getDb } from "@/db";
import { siteEntitlement } from "@/db/schema";
import { ensureSiteEntitlementSchema } from "@/lib/site-entitlements-server";
import { isPaidSitePlan } from "@/lib/stripe";

function validSignature(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "webhook no configurado" }, { status: 503 });
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!validSignature(payload, signature, secret)) {
    return Response.json({ error: "firma inválida" }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type?: string;
    data?: { object?: {
      id?: string;
      payment_status?: string;
      client_reference_id?: string;
      metadata?: { user_id?: string; plan?: string };
    } };
  };
  if (event.type !== "checkout.session.completed") return Response.json({ received: true });

  const checkout = event.data?.object;
  const userId = checkout?.metadata?.user_id;
  const plan = checkout?.metadata?.plan;
  if (!checkout?.id || checkout.payment_status !== "paid" || !userId || checkout.client_reference_id !== userId || !isPaidSitePlan(plan)) {
    return Response.json({ error: "checkout incompleto" }, { status: 400 });
  }

  await ensureSiteEntitlementSchema();
  await getDb().insert(siteEntitlement).values({
    id: crypto.randomUUID(),
    userId,
    plan,
    stripeSessionId: checkout.id,
  }).onConflictDoNothing();

  return Response.json({ received: true });
}
