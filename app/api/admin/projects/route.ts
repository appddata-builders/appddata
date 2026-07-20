import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { project } from "@/db/schema";
import { ensureDefaultProjects } from "@/lib/default-projects";
import { requireAdminSession } from "@/lib/require-admin-session";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  await ensureDefaultProjects();
  const rows = await getDb().select().from(project);
  return NextResponse.json({
    projects: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
    })),
  });
}
