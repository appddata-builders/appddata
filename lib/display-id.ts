/**
 * IDs legibles de usuario ("AP0001").
 *
 * Sirven para que alguien pueda entrar al panel sin recordar el correo con el
 * que se dio de alta, y para referirse a un usuario en soporte sin exponer su
 * correo. El prefijo va en su propia columna para poder numerar por familia.
 */
import { and, eq, isNotNull } from "drizzle-orm";

import type { AppDb } from "@/db";
import * as schema from "@/db/schema";

export const USER_ID_PREFIX = "AP";

export async function generateDisplayId(
  db: AppDb,
  prefix: string = USER_ID_PREFIX,
): Promise<string> {
  const rows = await db
    .select({ displayId: schema.user.displayId })
    .from(schema.user)
    .where(and(isNotNull(schema.user.displayId), eq(schema.user.idPrefix, prefix)));

  let maxNum = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`, "i");
  for (const row of rows) {
    if (!row.displayId) continue;
    const m = re.exec(row.displayId);
    if (!m) continue;
    const num = Number.parseInt(m[1], 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }

  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

export async function findUserByDisplayId(db: AppDb, displayIdRaw: string) {
  const displayId = displayIdRaw.trim().toUpperCase();
  if (!displayId) return null;
  const [row] = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
      enabled: schema.user.enabled,
      projectSlug: schema.user.projectSlug,
    })
    .from(schema.user)
    .where(eq(schema.user.displayId, displayId))
    .limit(1);
  return row ?? null;
}
