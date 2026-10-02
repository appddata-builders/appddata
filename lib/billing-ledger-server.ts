/**
 * Libro mayor de periodos de facturacion.
 *
 * Regla del modelo: mientras el mes corre, el monto es un ESTIMADO que se mueve
 * y no es exigible. El cierre lo congela aqui con el tipo de cambio y el margen
 * vigentes en ese momento, y solo entonces existe una deuda que se puede
 * cobrar. Un periodo cerrado nunca se recalcula.
 */
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { getAuthProvider, getDb, getPgDb, getSqliteDb } from "@/db";
import { billingPeriod, user, userProject } from "@/db/schema";
import { getAccountSites, type AccountSite } from "@/lib/account-summary-server";
import { CLUSTER_PRODUCT, resolveShares } from "@/lib/account-billing-server";
import { getPeriodConsumption } from "@/lib/digitalocean-server";
import { getUsdMxnRate } from "@/lib/fx-rate-server";
import { getInfraConsoleCached } from "@/lib/infra-console-server";
import { chargeForProject, serviceMargin } from "@/lib/service-billing";

export type PeriodStatus = "closed" | "issued" | "paid" | "void";

export type BillingPeriodRow = {
  id: string;
  projectSlug: string;
  period: string;
  baseCents: number;
  computeCents: number;
  databaseCents: number;
  platformCents: number;
  subtotalCents: number;
  stripeFeeCents: number;
  taxCents: number;
  totalCents: number;
  status: PeriodStatus;
  hostedInvoiceUrl: string | null;
  closedAt: string | null;
};

let schemaPromise: Promise<void> | null = null;

export function ensureBillingPeriodSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const columns = `
      "id" text primary key,
      "user_id" text not null references "user"("id") on delete cascade,
      "project_slug" text not null,
      "period" text not null,
      "base_cents" integer not null,
      "compute_cents" integer not null,
      "database_cents" integer not null,
      "platform_cents" integer not null,
      "subtotal_cents" integer not null,
      "stripe_fee_cents" integer not null,
      "tax_cents" integer not null default 0,
      "total_cents" integer not null,
      "fx_rate" text not null,
      "margin" text not null,
      "status" text not null default 'closed',
      "stripe_invoice_id" text,
      "hosted_invoice_url" text`;

    if (getAuthProvider() === "pg") {
      const db = getPgDb();
      await db.execute(sql.raw(`create table if not exists "billing_period" (${columns},
        "closed_at" timestamp(3) not null default now(),
        "issued_at" timestamp(3),
        "paid_at" timestamp(3))`));
      await db.execute(sql`create index if not exists "billing_period_user_id_idx" on "billing_period" ("user_id")`);
      await db.execute(sql`create unique index if not exists "billing_period_user_slug_period_uidx" on "billing_period" ("user_id","project_slug","period")`);
      // Igual que en SQLite: la tabla pudo crearse antes de existir esta columna.
      await db.execute(sql`alter table "billing_period" add column if not exists "tax_cents" integer not null default 0`);
    } else {
      const db = getSqliteDb();
      db.run(sql.raw(`create table if not exists "billing_period" (${columns},
        "closed_at" integer not null default (cast(unixepoch('subsecond') * 1000 as integer)),
        "issued_at" integer,
        "paid_at" integer)`));
      db.run(sql`create index if not exists "billing_period_user_id_idx" on "billing_period" ("user_id")`);
      db.run(sql`create unique index if not exists "billing_period_user_slug_period_uidx" on "billing_period" ("user_id","project_slug","period")`);

      // `create table if not exists` no toca una tabla que ya existe, asi que
      // las columnas agregadas despues hay que anadirlas aparte o las bases
      // creadas con la version anterior revientan al consultarlas.
      const [column] = db.all<{ total: number }>(
        sql`select count(*) as total from pragma_table_info('billing_period') where name = 'tax_cents'`,
      );
      if (!column || Number(column.total) === 0) {
        db.run(sql`alter table "billing_period" add column "tax_cents" integer not null default 0`);
      }
    }
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

/** Mes anterior al actual, en YYYY-MM: el que toca cerrar el dia 1. */
export function previousPeriod(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isPeriodClosed(period: string, now = new Date()): boolean {
  const current = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return period < current;
}

export type CloseResult = {
  period: string;
  created: number;
  skipped: number;
  netUsd: number;
  clusterUsd: number;
};

/**
 * Cierra un mes y congela el cobro de cada dominio.
 *
 * Idempotente: si el periodo ya fue cerrado, no lo vuelve a escribir. Nunca
 * cierra el mes en curso, porque su consumo todavia no esta completo.
 */
export async function closeBillingPeriod(period: string, now = new Date()): Promise<CloseResult> {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("El periodo debe venir como YYYY-MM.");
  if (!isPeriodClosed(period, now)) {
    throw new Error(`El periodo ${period} sigue abierto: solo se cierra un mes ya terminado.`);
  }

  await ensureBillingPeriodSchema();
  const db = getDb();

  const { netUsd, clusterUsd } = await getPeriodConsumption(period, (product) =>
    CLUSTER_PRODUCT.test(product),
  );
  const fx = await getUsdMxnRate();
  const margin = serviceMargin();

  // El reparto usa la foto ACTUAL del cluster: no se guarda historico de pods,
  // asi que el peso de cada dominio se toma del layout vigente al cerrar.
  const infra = await getInfraConsoleCached();

  let created = 0;
  let skipped = 0;

  for (const account of await accountsWithSites()) {
    const sites = account.sites;
    if (sites.length === 0) continue;

    const shares = resolveShares(sites, infra);

    for (const site of sites) {
      const existing = await db
        .select({ id: billingPeriod.id })
        .from(billingPeriod)
        .where(
          and(
            eq(billingPeriod.userId, account.userId),
            eq(billingPeriod.projectSlug, site.slug),
            eq(billingPeriod.period, period),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        skipped += 1;
        continue;
      }

      const share = shares.get(site.slug) ?? {
        slug: site.slug,
        ownShare: 0,
        databaseShare: 0,
        platformShare: 0,
      };
      const charge = chargeForProject(site.slug, share, clusterUsd, fx.rate);

      await db.insert(billingPeriod).values({
        id: crypto.randomUUID(),
        userId: account.userId,
        projectSlug: site.slug,
        period,
        baseCents: charge.baseCents,
        computeCents: charge.computeCents,
        databaseCents: charge.databaseCents,
        platformCents: charge.platformCents,
        subtotalCents: charge.subtotalCents,
        stripeFeeCents: charge.stripeFeeCents,
        taxCents: charge.taxCents,
        totalCents: charge.totalCents,
        fxRate: String(fx.rate),
        margin: String(margin),
        status: "closed",
      });
      created += 1;
    }
  }

  return { period, created, skipped, netUsd, clusterUsd };
}

/** Cuentas que tienen al menos un sitio vinculado. */
async function accountsWithSites(): Promise<{ userId: string; sites: AccountSite[] }[]> {
  const db = getDb();
  const [linked, assigned] = await Promise.all([
    db.selectDistinct({ userId: userProject.userId }).from(userProject),
    db.select({ userId: user.id }).from(user).where(isNotNull(user.projectSlug)),
  ]);

  const userIds = [...new Set([...linked, ...assigned].map((row) => row.userId))];
  if (userIds.length === 0) return [];

  const rows = await db
    .select({ id: user.id, email: user.email, name: user.name, role: user.role, projectSlug: user.projectSlug })
    .from(user)
    .where(inArray(user.id, userIds));

  return Promise.all(
    rows.map(async (row) => ({
      userId: row.id,
      sites: await getAccountSites({
        user: {
          id: row.id,
          email: row.email,
          name: row.name ?? null,
          image: null,
          phone: null,
          role: row.role ?? "cliente",
          displayId: null,
          projectSlug: row.projectSlug ?? null,
        },
      }),
    })),
  );
}

export async function getBillingPeriods(userId: string, limit = 12): Promise<BillingPeriodRow[]> {
  await ensureBillingPeriodSchema();
  const rows = await getDb()
    .select()
    .from(billingPeriod)
    .where(eq(billingPeriod.userId, userId))
    .orderBy(desc(billingPeriod.period))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    projectSlug: row.projectSlug,
    period: row.period,
    baseCents: row.baseCents,
    computeCents: row.computeCents,
    databaseCents: row.databaseCents,
    platformCents: row.platformCents,
    subtotalCents: row.subtotalCents,
    stripeFeeCents: row.stripeFeeCents,
    taxCents: row.taxCents ?? 0,
    totalCents: row.totalCents,
    status: (row.status as PeriodStatus) ?? "closed",
    hostedInvoiceUrl: row.hostedInvoiceUrl ?? null,
    closedAt: row.closedAt ? new Date(row.closedAt).toISOString() : null,
  }));
}

/** Periodos ya cerrados que todavia no se han facturado, agrupados por cuenta. */
export async function getUnissuedByAccount(period?: string): Promise<
  { userId: string; email: string; name: string | null; rows: BillingPeriodRow[] }[]
> {
  await ensureBillingPeriodSchema();
  const db = getDb();

  const conditions = [eq(billingPeriod.status, "closed")];
  if (period) conditions.push(eq(billingPeriod.period, period));

  const rows = await db
    .select({ row: billingPeriod, email: user.email, name: user.name })
    .from(billingPeriod)
    .innerJoin(user, eq(user.id, billingPeriod.userId))
    .where(and(...conditions));

  const byUser = new Map<string, { userId: string; email: string; name: string | null; rows: BillingPeriodRow[] }>();
  for (const entry of rows) {
    const current = byUser.get(entry.row.userId) ?? {
      userId: entry.row.userId,
      email: entry.email,
      name: entry.name ?? null,
      rows: [],
    };
    current.rows.push({
      id: entry.row.id,
      projectSlug: entry.row.projectSlug,
      period: entry.row.period,
      baseCents: entry.row.baseCents,
      computeCents: entry.row.computeCents,
      databaseCents: entry.row.databaseCents,
      platformCents: entry.row.platformCents,
      subtotalCents: entry.row.subtotalCents,
      stripeFeeCents: entry.row.stripeFeeCents,
      taxCents: entry.row.taxCents ?? 0,
      totalCents: entry.row.totalCents,
      status: "closed",
      hostedInvoiceUrl: null,
      closedAt: entry.row.closedAt ? new Date(entry.row.closedAt).toISOString() : null,
    });
    byUser.set(entry.row.userId, current);
  }
  return [...byUser.values()];
}

export async function markPeriodsIssued(
  ids: string[],
  stripeInvoiceId: string,
  hostedInvoiceUrl: string | null,
): Promise<void> {
  if (ids.length === 0) return;
  await getDb()
    .update(billingPeriod)
    .set({ status: "issued", stripeInvoiceId, hostedInvoiceUrl, issuedAt: new Date() })
    .where(inArray(billingPeriod.id, ids));
}

export async function markPeriodsPaidByInvoice(stripeInvoiceId: string): Promise<void> {
  await ensureBillingPeriodSchema();
  await getDb()
    .update(billingPeriod)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(billingPeriod.stripeInvoiceId, stripeInvoiceId));
}
