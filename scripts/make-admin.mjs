/**
 * Promueve a admin una cuenta ya creada desde /account/register.
 *
 * Existe porque el registro publico siempre da de alta con rol "cliente": el
 * primer administrador tiene que nombrarse fuera de la aplicacion.
 *
 *   node scripts/make-admin.mjs correo@ejemplo.com
 *
 * Solo toca la base local (SQLite). En Postgres se hace con un UPDATE.
 */
import path from "node:path";
import process from "node:process";

import Database from "better-sqlite3";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Uso: node scripts/make-admin.mjs <correo>");
  process.exit(1);
}

const dbPath = process.env.LOCAL_DATABASE_PATH ?? path.join(process.cwd(), "local.db");
const db = new Database(dbPath);

const result = db
  .prepare("UPDATE user SET role = 'admin', enabled = 1, project_slug = NULL WHERE email = ?")
  .run(email);

if (result.changes === 0) {
  console.error(`No existe ningun usuario con el correo ${email} en ${dbPath}`);
  process.exit(1);
}

const row = db.prepare("SELECT display_id, role FROM user WHERE email = ?").get(email);
console.log(`${email} ahora es ${row.role} (ID ${row.display_id ?? "sin asignar"})`);
