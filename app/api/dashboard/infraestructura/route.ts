import { NextResponse } from "next/server";

import { clearInfraConsoleCache, getInfraConsole } from "@/lib/infra-console-server";
import { isRoot, requirePanelSession } from "@/lib/require-panel-session";

// Lee la API de DigitalOcean en cada request: nunca debe cachearse.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requirePanelSession();
  if (!session) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  // El consumo y la factura son de la cuenta de DigitalOcean de Appddata, no
  // del cliente: mismo gate interno que el explorador de bases.
  if (!isRoot(session)) return NextResponse.json({ error: "no autorizado" }, { status: 403 });

  // El boton de actualizar existe para ver datos frescos: se salta el cache.
  clearInfraConsoleCache();
  return NextResponse.json(await getInfraConsole());
}
