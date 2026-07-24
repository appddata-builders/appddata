import type { RequirementAnalysis } from "@/lib/requirements-analysis-server";

function rootRecipients(): string[] {
  return [...new Set(
    (process.env.ROOT_USER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@")),
  )];
}

function analysisText(analysis: RequirementAnalysis | null): string {
  if (!analysis) return "El análisis automático no estuvo disponible. La solicitud requiere revisión manual.";
  const classificationLabels: Record<RequirementAnalysis["classification"], string> = {
    included_adjustment: "Posible ajuste incluido",
    requires_quote: "Requiere cotización",
    needs_clarification: "Requiere aclaración",
    incident: "Posible incidente",
  };
  return [
    `Clasificación: ${classificationLabels[analysis.classification]}`,
    `Resumen: ${analysis.summary}`,
    `Complejidad: ${analysis.complexity}`,
    `Estimación: ${analysis.estimatedHoursMin}–${analysis.estimatedHoursMax} horas`,
    `Confianza: ${Math.round(analysis.confidence * 100)}%`,
    "",
    "Alcance finito:",
    ...analysis.finiteScope.map((item) => `- ${item}`),
    "",
    "Fuera de alcance:",
    ...(analysis.exclusions.length ? analysis.exclusions.map((item) => `- ${item}`) : ["- Sin exclusiones identificadas"]),
    "",
    "Preguntas para el cliente:",
    ...(analysis.questionsForClient.length
      ? analysis.questionsForClient.map((item) => `- ${item}`)
      : ["- No hay preguntas pendientes"]),
    "",
    `Recomendación: ${analysis.recommendation}`,
    "",
    "Este dictamen es una recomendación automática y requiere aprobación humana.",
  ].join("\n");
}

export async function sendRequirementEmail(input: {
  requirementId: string;
  clientName: string;
  clientEmail: string;
  projectName: string;
  projectSlug: string;
  content: string;
  analysis: RequirementAnalysis | null;
}): Promise<{ sent: boolean; messageId: string | null; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = rootRecipients();
  if (!apiKey) return { sent: false, messageId: null, reason: "RESEND_API_KEY no configurada" };
  if (to.length === 0) return { sent: false, messageId: null, reason: "ROOT_USER_EMAILS no configurado" };

  const subject = `[Appddata] Nuevo requerimiento · ${input.projectName}`;
  const text = [
    "Nuevo requerimiento de cliente",
    "",
    `Cliente: ${input.clientName}`,
    `Correo: ${input.clientEmail}`,
    `Proyecto: ${input.projectName} (${input.projectSlug})`,
    `ID: ${input.requirementId}`,
    "",
    "Solicitud original:",
    input.content,
    "",
    "Análisis de IA:",
    analysisText(input.analysis),
  ].join("\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Appddata <onboarding@resend.dev>",
      to,
      reply_to: input.clientEmail,
      subject,
      text,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json() as { id?: string; message?: string };
  if (!response.ok || !result.id) {
    throw new Error(result.message ?? `Resend respondió ${response.status}`);
  }
  return { sent: true, messageId: result.id };
}
