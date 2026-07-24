export type RequirementAnalysis = {
  classification: "included_adjustment" | "requires_quote" | "needs_clarification" | "incident";
  summary: string;
  finiteScope: string[];
  exclusions: string[];
  questionsForClient: string[];
  complexity: "low" | "medium" | "high";
  estimatedHoursMin: number;
  estimatedHoursMax: number;
  requiresDatabaseChange: boolean;
  requiresExternalService: boolean;
  confidence: number;
  recommendation: string;
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    classification: {
      type: "string",
      enum: ["included_adjustment", "requires_quote", "needs_clarification", "incident"],
    },
    summary: { type: "string" },
    finiteScope: { type: "array", items: { type: "string" } },
    exclusions: { type: "array", items: { type: "string" } },
    questionsForClient: { type: "array", items: { type: "string" } },
    complexity: { type: "string", enum: ["low", "medium", "high"] },
    estimatedHoursMin: { type: "integer", minimum: 0, maximum: 1_000 },
    estimatedHoursMax: { type: "integer", minimum: 0, maximum: 1_000 },
    requiresDatabaseChange: { type: "boolean" },
    requiresExternalService: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    recommendation: { type: "string" },
  },
  required: [
    "classification",
    "summary",
    "finiteScope",
    "exclusions",
    "questionsForClient",
    "complexity",
    "estimatedHoursMin",
    "estimatedHoursMax",
    "requiresDatabaseChange",
    "requiresExternalService",
    "confidence",
    "recommendation",
  ],
} as const;

const systemPrompt = `Eres el analista interno de requerimientos de Appddata.
Tu trabajo es convertir solicitudes potencialmente ambiguas o ilimitadas en un alcance finito y revisable.

Clasifica cada solicitud:
- included_adjustment: cambio pequeño sobre algo existente, normalmente menos de 2 horas, sin nueva integración, base de datos, flujo de negocio ni página completa.
- requires_quote: función nueva, alcance mayor, integración, persistencia, automatización, rediseño sustancial o más de 5 horas.
- needs_clarification: no hay información suficiente para estimar responsablemente.
- incident: una función existente dejó de operar como se esperaba.

Reglas:
- No prometas que el trabajo está incluido y no establezcas precios.
- La salida es una recomendación para revisión humana.
- Resume el objetivo sin ampliar lo solicitado.
- finiteScope debe contener entregables concretos y verificables.
- exclusions debe señalar lo que razonablemente queda fuera para evitar alcance infinito.
- questionsForClient debe incluir solo preguntas que cambien alcance o estimación.
- Estima un rango prudente de horas; el máximo nunca puede ser menor al mínimo.
- Si la confianza es menor a 0.75, usa needs_clarification.
- Responde en español.`;

export async function analyzeRequirement(input: {
  projectName: string;
  projectSlug: string;
  clientName: string;
  content: string;
}): Promise<{ analysis: RequirementAnalysis; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada");
  const model = process.env.OPENAI_REQUIREMENTS_MODEL ?? "gpt-5.4-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 1_200,
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            project: { name: input.projectName, slug: input.projectSlug },
            clientName: input.clientName,
            requirement: input.content,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "appddata_requirement_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const result = await response.json() as {
    error?: { message?: string };
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (!response.ok) throw new Error(result.error?.message ?? `OpenAI respondió ${response.status}`);
  const text = result.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("OpenAI no devolvió un análisis estructurado");
  return { analysis: JSON.parse(text) as RequirementAnalysis, model };
}
