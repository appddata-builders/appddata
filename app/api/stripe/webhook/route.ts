import { createHmac, timingSafeEqual } from "node:crypto";

import { getDb } from "@/db";
import { accountSubscription, siteEntitlement } from "@/db/schema";
import { ensureAccountSubscriptionSchema, type AccountSubscriptionKind } from "@/lib/account-subscriptions-server";
import { ensureSiteEntitlementSchema } from "@/lib/site-entitlements-server";
import { isPaidSitePlan, stripeRequest } from "@/lib/stripe";

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
      customer?: string;
      subscription?: string;
      status?: string;
      current_period_end?: number;
      metadata?: { user_id?: string; plan?: string; subscription_kind?: string };
    } };
  };

  const checkout = event.data?.object;
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const kind = checkout?.metadata?.subscription_kind;
    const userId = checkout?.metadata?.user_id;
    if (checkout?.id && userId && (kind === "cloud-server" || kind === "technical-support")) {
      await saveAccountSubscription({
        id: checkout.id,
        userId,
        kind,
        customerId: checkout.customer,
        status: checkout.status ?? (event.type.endsWith(".deleted") ? "canceled" : "active"),
        currentPeriodEnd: checkout.current_period_end,
      });
    }
    return Response.json({ received: true });
  }

  if (event.type !== "checkout.session.completed") return Response.json({ received: true });

  const subscriptionKind = checkout?.metadata?.subscription_kind;
  const subscriptionUserId = checkout?.metadata?.user_id;
  if (
    checkout?.subscription &&
    subscriptionUserId &&
    (subscriptionKind === "cloud-server" || subscriptionKind === "technical-support")
  ) {
    const response = await stripeRequest(`/subscriptions/${encodeURIComponent(checkout.subscription)}`);
    const subscription = await response.json() as {
      id?: string;
      customer?: string;
      status?: string;
      current_period_end?: number;
    };
    if (response.ok && subscription.id) {
      await saveAccountSubscription({
        id: subscription.id,
        userId: subscriptionUserId,
        kind: subscriptionKind,
        customerId: subscription.customer ?? checkout.customer,
        status: subscription.status ?? "active",
        currentPeriodEnd: subscription.current_period_end,
      });
      return Response.json({ received: true });
    }
  }

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

async function saveAccountSubscription(input: {
  id: string;
  userId: string;
  kind: AccountSubscriptionKind;
  customerId?: string;
  status: string;
  currentPeriodEnd?: number;
}) {
  await ensureAccountSubscriptionSchema();
  await getDb().insert(accountSubscription).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    kind: input.kind,
    stripeCustomerId: input.customerId,
    stripeSubscriptionId: input.id,
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000) : null,
  }).onConflictDoUpdate({
    target: accountSubscription.stripeSubscriptionId,
    set: {
      status: input.status,
      stripeCustomerId: input.customerId,
      currentPeriodEnd: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000) : null,
    },
  });
}
