import { NextResponse } from "next/server";

import { sendInvoiceIssuedEmail } from "@/lib/billing-email-server";
import { issueInvoice } from "@/lib/billing-invoice-server";
import {
  closeBillingPeriod,
  getUnissuedByAccount,
  markPeriodsIssued,
  previousPeriod,
} from "@/lib/billing-ledger-server";
import { isRoot, requirePanelSession } from "@/lib/require-panel-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cierra un mes y, opcionalmente, emite su factura.
 *
 * Pensado para correrse el dia 1 de cada mes (cron). Es idempotente: volver a
 * llamarlo sobre un periodo ya cerrado no duplica nada.
 */
export async function POST(request: Request) {
  const session = await requirePanelSession();
  if (!session) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  if (!isRoot(session)) return NextResponse.json({ error: "no autorizado" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { period?: string; issue?: boolean };
  const period = body.period ?? previousPeriod();

  try {
    const close = await closeBillingPeriod(period);
    if (!body.issue) return NextResponse.json({ close, issued: [] });

    const issued: { email: string; invoiceId: string; totalCents: number; emailSent: boolean }[] = [];
    for (const account of await getUnissuedByAccount(period)) {
      const invoice = await issueInvoice({ email: account.email, name: account.name, rows: account.rows });
      await markPeriodsIssued(account.rows.map((row) => row.id), invoice.id, invoice.hostedInvoiceUrl);
      const mail = await sendInvoiceIssuedEmail({
        clientEmail: account.email,
        clientName: account.name,
        period,
        rows: account.rows,
        totalCents: invoice.totalCents,
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
      });
      issued.push({
        email: account.email,
        invoiceId: invoice.id,
        totalCents: invoice.totalCents,
        emailSent: mail.sent,
      });
    }
    return NextResponse.json({ close, issued });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cerrar el periodo." },
      { status: 400 },
    );
  }
}
