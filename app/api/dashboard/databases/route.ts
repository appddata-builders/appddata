import { NextResponse } from "next/server";

import { isRoot, requirePanelSession } from "@/lib/require-panel-session";
import { listDatabases, listTables, readRows } from "@/lib/droplet-databases-server";

/**
 * Explorador de bases del droplet (solo-lectura), exclusivo para cuentas root.
 *
 *   GET ?                                  -> { databases }
 *   GET ?db=X                              -> { tables }
 *   GET ?db=X&schema=S&table=T&page=N      -> { columns, rows, total, page, pageSize }
 */
const PAGE_SIZE = 50;

/** Deja los valores en algo serializable a JSON (fechas, buffers, objetos). */
function toCell(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return value;
  if (type === "bigint") return value.toString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function GET(request: Request) {
  const session = await requirePanelSession();
  if (!session) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  if (!isRoot(session)) return NextResponse.json({ error: "no autorizado" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const db = params.get("db");
  const schema = params.get("schema");
  const table = params.get("table");

  try {
    if (!db) {
      return NextResponse.json({ databases: await listDatabases() });
    }
    if (!schema || !table) {
      return NextResponse.json({ tables: await listTables(db) });
    }
    const page = Math.max(Number(params.get("page")) || 1, 1);
    const data = await readRows(db, schema, table, PAGE_SIZE, (page - 1) * PAGE_SIZE);
    return NextResponse.json({
      columns: data.columns,
      rows: data.rows.map((row) => {
        const clean: Record<string, unknown> = {};
        for (const key of data.columns) clean[key] = toCell(row[key]);
        return clean;
      }),
      total: data.total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar la base.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
