/**
 * Emision de la factura del periodo cerrado en Stripe.
 *
 * Se factura VENCIDO, como cualquier cobro por consumo: primero termina el mes,
 * el ledger congela el monto y hasta entonces se emite. Por eso son invoice
 * items sobre una factura del periodo y no una suscripcion de precio fijo: un
 * precio fijo no puede representar un consumo que cambia mes a mes.
 *
 * Los renglones espejean el desglose que ve el cliente en el panel, para que la
 * factura de Stripe y la pantalla digan lo mismo.
 */
import { stripeRequest } from "@/lib/stripe";
import type { BillingPeriodRow } from "@/lib/billing-ledger-server";

const CURRENCY = "mxn";
const DAYS_UNTIL_DUE = 7;

export type IssuedInvoice = { id: string; hostedInvoiceUrl: string | null; totalCents: number };

async function stripeForm<T>(path: string, body: URLSearchParams): Promise<T> {
  const response = await stripeRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message ?? `Stripe respondio ${response.status} en ${path}.`);
  return result;
}

async function findOrCreateCustomer(email: string, name: string | null): Promise<string> {
  const search = await stripeRequest(`/customers?email=${encodeURIComponent(email)}&limit=1`);
  const existing = (await search.json()) as { data?: { id?: string }[]; error?: { message?: string } };
  if (search.ok && existing.data?.[0]?.id) return existing.data[0].id;

  const body = new URLSearchParams({ email });
  if (name) body.set("name", name);
  const created = await stripeForm<{ id: string }>("/customers", body);
  return created.id;
}

/** Renglones de la factura: mismo desglose que la grafica del panel. */
function invoiceLines(rows: BillingPeriodRow[]): { amount: number; description: string }[] {
  const lines: { amount: number; description: string }[] = [];
  for (const row of rows) {
    const label = (concept: string) => `${concept} · ${row.projectSlug} · ${row.period}`;
    if (row.baseCents > 0) lines.push({ amount: row.baseCents, description: label("Administracion de aplicativo") });
    if (row.computeCents > 0) lines.push({ amount: row.computeCents, description: label("Computo del proyecto") });
    if (row.databaseCents > 0) lines.push({ amount: row.databaseCents, description: label("Base de datos") });
    if (row.platformCents > 0) lines.push({ amount: row.platformCents, description: label("Plataforma compartida") });
    if (row.stripeFeeCents > 0) lines.push({ amount: row.stripeFeeCents, description: label("Comision de pago") });
    if (row.taxCents > 0) lines.push({ amount: row.taxCents, description: label("IVA 16%") });
  }
  return lines;
}

/**
 * Emite UNA factura con todos los periodos cerrados que se le pasen. Se agrupan
 * en un solo documento para que el cliente pague una vez: la comision ya viene
 * calculada sobre el subtotal combinado.
 */
export async function issueInvoice(input: {
  email: string;
  name: string | null;
  rows: BillingPeriodRow[];
}): Promise<IssuedInvoice> {
  if (input.rows.length === 0) throw new Error("No hay periodos cerrados que facturar.");

  const customer = await findOrCreateCustomer(input.email, input.name);
  const periods = [...new Set(input.rows.map((row) => row.period))].sort().join(", ");

  for (const line of invoiceLines(input.rows)) {
    await stripeForm("/invoiceitems", new URLSearchParams({
      customer,
      currency: CURRENCY,
      amount: String(line.amount),
      description: line.description,
    }));
  }

  const invoice = await stripeForm<{ id: string }>("/invoices", new URLSearchParams({
    customer,
    collection_method: "send_invoice",
    days_until_due: String(DAYS_UNTIL_DUE),
    // Recoge los invoice items pendientes que acabamos de crear.
    pending_invoice_items_behavior: "include",
    description: `Servicios Appddata · ${periods}`,
    "metadata[periodos]": periods,
  }));

  // Finalizar es lo que convierte el borrador en una factura exigible.
  const finalized = await stripeForm<{ id: string; hosted_invoice_url?: string; total?: number }>(
    `/invoices/${encodeURIComponent(invoice.id)}/finalize`,
    new URLSearchParams(),
  );

  return {
    id: finalized.id,
    hostedInvoiceUrl: finalized.hosted_invoice_url ?? null,
    totalCents: finalized.total ?? input.rows.reduce((sum, row) => sum + row.totalCents, 0),
  };
}
