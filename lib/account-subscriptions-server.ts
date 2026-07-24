import { eq, sql } from "drizzle-orm";

import { getAuthProvider, getDb, getPgDb, getSqliteDb } from "@/db";
import { accountSubscription } from "@/db/schema";
import { stripeRequest } from "@/lib/stripe";

export type AccountSubscriptionKind = "cloud-server" | "technical-support";
export type AccountSubscriptionState = {
  kind: AccountSubscriptionKind;
  status: string;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string;
};
export type UpcomingAccountCharge = {
  kind: AccountSubscriptionKind;
  label: string;
  amount: number;
  currency: string;
  chargeAt: Date | null;
};

let schemaPromise: Promise<void> | null = null;

export function ensureAccountSubscriptionSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    if (getAuthProvider() === "pg") {
      const db = getPgDb();
      await db.execute(sql`create table if not exists "account_subscription" (
        "id" text primary key,
        "user_id" text not null references "user"("id") on delete cascade,
        "kind" text not null,
        "stripe_customer_id" text,
        "stripe_subscription_id" text not null,
        "status" text not null,
        "current_period_end" timestamp(3),
        "created_at" timestamp(3) not null default now(),
        "updated_at" timestamp(3) not null default now()
      )`);
      await db.execute(sql`create index if not exists "account_subscription_user_id_idx" on "account_subscription" ("user_id")`);
      await db.execute(sql`create unique index if not exists "account_subscription_stripe_id_uidx" on "account_subscription" ("stripe_subscription_id")`);
    } else {
      const db = getSqliteDb();
      db.run(sql`create table if not exists "account_subscription" (
        "id" text primary key,
        "user_id" text not null references "user"("id") on delete cascade,
        "kind" text not null,
        "stripe_customer_id" text,
        "stripe_subscription_id" text not null,
        "status" text not null,
        "current_period_end" integer,
        "created_at" integer not null default (cast(unixepoch('subsecond') * 1000 as integer)),
        "updated_at" integer not null default (cast(unixepoch('subsecond') * 1000 as integer))
      )`);
      db.run(sql`create index if not exists "account_subscription_user_id_idx" on "account_subscription" ("user_id")`);
      db.run(sql`create unique index if not exists "account_subscription_stripe_id_uidx" on "account_subscription" ("stripe_subscription_id")`);
    }
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

export async function getAccountSubscriptions(userId: string): Promise<AccountSubscriptionState[]> {
  await ensureAccountSubscriptionSchema();
  const rows = await getDb().select({
    kind: accountSubscription.kind,
    status: accountSubscription.status,
    currentPeriodEnd: accountSubscription.currentPeriodEnd,
    stripeSubscriptionId: accountSubscription.stripeSubscriptionId,
  }).from(accountSubscription).where(eq(accountSubscription.userId, userId));
  return rows
    .filter((row): row is typeof row & { kind: AccountSubscriptionKind } =>
      row.kind === "cloud-server" || row.kind === "technical-support")
    .map((row) => ({ kind: row.kind, status: row.status, currentPeriodEnd: row.currentPeriodEnd, stripeSubscriptionId: row.stripeSubscriptionId }));
}

export async function getUpcomingAccountCharges(userId: string): Promise<UpcomingAccountCharge[]> {
  const subscriptions = (await getAccountSubscriptions(userId))
    .filter((item) => item.kind === "cloud-server" && ["active", "trialing", "past_due"].includes(item.status));
  const charges = await Promise.all(subscriptions.map(async (item): Promise<UpcomingAccountCharge | null> => {
    try {
      const response = await stripeRequest(`/subscriptions/${encodeURIComponent(item.stripeSubscriptionId)}?expand[]=items.data.price`);
      const subscription = await response.json() as {
        current_period_end?: number;
        items?: { data?: Array<{
          current_period_end?: number;
          quantity?: number;
          price?: { unit_amount?: number; currency?: string };
        }> };
      };
      const line = subscription.items?.data?.[0];
      if (!response.ok || !line?.price?.unit_amount) return null;
      const periodEnd = line.current_period_end ?? subscription.current_period_end;
      return {
        kind: item.kind,
        label: item.kind === "cloud-server" ? "Servidor de base de datos" : "Soporte técnico",
        amount: line.price.unit_amount * (line.quantity ?? 1),
        currency: (line.price.currency ?? "mxn").toUpperCase(),
        chargeAt: periodEnd ? new Date(periodEnd * 1000) : item.currentPeriodEnd,
      };
    } catch {
      return null;
    }
  }));
  return charges.filter((charge): charge is UpcomingAccountCharge => charge !== null);
}
