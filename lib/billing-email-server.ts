/**
 * Aviso de factura emitida.
 *
 * Usa el mismo transporte que el correo de requerimientos (Resend) y la misma
 * lista de destinatarios internos, `ROOT_USER_EMAILS`, que ya esta configurada
 * y probada. Al cliente se le manda copia solo si hay remitente configurado.
 */
import type { BillingPeriodRow } from "@/lib/billing-ledger-server";

function rootRecipients(): string[] {
  return [...new Set(
    (process.env.ROOT_USER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@")),
  )];
}

function money(cents: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}

export async function sendInvoiceIssuedEmail(input: {
  clientEmail: string;
  clientName: string | null;
  period: string;
  rows: BillingPeriodRow[];
  totalCents: number;
  hostedInvoiceUrl: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = [...new Set([...rootRecipients(), input.clientEmail.toLowerCase()])];
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY no configurada" };
  if (to.length === 0) return { sent: false, reason: "ROOT_USER_EMAILS no configurado" };

  const text = [
    `Factura del periodo ${input.period}`,
    "",
    `Cuenta: ${input.clientName ?? input.clientEmail}`,
    "",
    "Detalle por dominio:",
    ...input.rows.map((row) => `- ${row.projectSlug}: ${money(row.subtotalCents)}`),
    "",
    `Total a pagar: ${money(input.totalCents)}`,
    ...(input.hostedInvoiceUrl ? ["", `Pagar: ${input.hostedInvoiceUrl}`] : []),
    "",
    "El monto corresponde a un mes ya cerrado y no cambia.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Appddata <onboarding@resend.dev>",
      to,
      subject: `[Appddata] Factura ${input.period} · ${money(input.totalCents)}`,
      text,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = (await response.json()) as { id?: string; message?: string };
  if (!response.ok || !result.id) return { sent: false, reason: result.message ?? `Resend respondio ${response.status}` };
  return { sent: true };
}
