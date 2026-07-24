import { NextResponse } from "next/server";

import { analyzeRequirement } from "@/lib/requirements-analysis-server";
import type { RequirementAnalysis } from "@/lib/requirements-analysis-server";
import { sendRequirementEmail } from "@/lib/requirements-email-server";
import { requirePanelSession } from "@/lib/require-panel-session";
import {
  createSiteRequirement,
  getRequirementProjects,
  saveRequirementAnalysis,
} from "@/lib/site-requirements-server";

export async function POST(request: Request) {
  const session = await requirePanelSession();
  if (!session) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const body = await request.json() as { content?: unknown; projectSlug?: unknown };
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const projectSlug = typeof body.projectSlug === "string" ? body.projectSlug.trim() : "";
  if (content.length < 20) {
    return NextResponse.json(
      { error: "Describe el requerimiento con al menos 20 caracteres." },
      { status: 400 },
    );
  }
  if (content.length > 4_000) {
    return NextResponse.json(
      { error: "El requerimiento no puede superar los 4,000 caracteres." },
      { status: 400 },
    );
  }
  const projects = await getRequirementProjects(session);
  const selectedProject = projects.find((item) => item.slug === projectSlug);
  if (!selectedProject) {
    return NextResponse.json({ error: "Selecciona un proyecto válido." }, { status: 400 });
  }

  const requirementId = await createSiteRequirement({
    userId: session.user.id,
    projectSlug,
    contactName: session.user.name ?? "Cliente Appddata",
    contactEmail: session.user.email,
    content,
  });
  const model = process.env.OPENAI_REQUIREMENTS_MODEL ?? "gpt-5.4-mini";
  let analysis: RequirementAnalysis | null = null;
  let analyzed = false;
  try {
    const result = await analyzeRequirement({
      projectName: selectedProject.name,
      projectSlug,
      clientName: session.user.name ?? "Cliente Appddata",
      content,
    });
    analysis = result.analysis;
    analyzed = true;
    await saveRequirementAnalysis({
      id: requirementId,
      analysis: JSON.stringify(analysis),
      status: "completed",
      model: result.model,
    });
  } catch (error) {
    console.error("OpenAI requirement analysis:", error instanceof Error ? error.message : error);
    await saveRequirementAnalysis({
      id: requirementId,
      analysis: null,
      status: "failed",
      model,
    });
  }

  let emailSent = false;
  try {
    const email = await sendRequirementEmail({
      requirementId,
      clientName: session.user.name ?? "Cliente Appddata",
      clientEmail: session.user.email,
      projectName: selectedProject.name,
      projectSlug,
      content,
      analysis,
    });
    emailSent = email.sent;
    if (!email.sent) console.warn("Requirement email skipped:", email.reason);
  } catch (error) {
    console.error("Requirement email:", error instanceof Error ? error.message : error);
  }
  return NextResponse.json({ ok: true, analyzed, emailSent }, { status: 201 });
}
