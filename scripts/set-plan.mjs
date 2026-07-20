/**
 * Activa o quita el paquete de un proyecto mientras no exista cobro en linea.
 *
 *   node scripts/set-plan.mjs imin imin    # contrata IMIN
 *   node scripts/set-plan.mjs imin free    # lo regresa a Free
 *
 * Solo toca la base local (SQLite). En Postgres se hace con un UPDATE.
 */
import path from "node:path";
import process from "node:process";

import Database from "better-sqlite3";

const slug = process.argv[2]?.trim();
const plan = process.argv[3]?.trim();

if (!slug || (plan !== "free" && plan !== "imin")) {
  console.error("Uso: node scripts/set-plan.mjs <slug-proyecto> <free|imin>");
  process.exit(1);
}

const dbPath = process.env.LOCAL_DATABASE_PATH ?? path.join(process.cwd(), "local.db");
const db = new Database(dbPath);

const result = db.prepare("UPDATE project SET plan = ? WHERE slug = ?").run(plan, slug);
if (result.changes === 0) {
  console.error(`No existe el proyecto ${slug} en ${dbPath}`);
  process.exit(1);
}

console.log(`Proyecto ${slug} -> plan ${plan}`);
