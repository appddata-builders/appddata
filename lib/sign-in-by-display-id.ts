"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { findUserByDisplayId } from "@/lib/display-id";

export type SignInResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "Correo, ID o contrasena incorrectos.";
const DISABLED_ERROR = "Tu cuenta esta inhabilitada. Contacta al equipo de Appddata.";

/**
 * Traduce lo que escribio la persona (correo o display ID) al correo con el
 * que better-auth sabe autenticar. Devuelve `null` sin distinguir "no existe"
 * de "contrasena mala": el mensaje al usuario es el mismo en ambos casos para
 * no confirmar que correos estan dados de alta.
 */
async function resolveEmailForLogin(
  identifierRaw: string,
): Promise<{ email: string | null; disabled: boolean }> {
  const raw = identifierRaw.trim();
  if (raw === "") return { email: null, disabled: false };

  const db = getDb();

  if (raw.includes("@")) {
    const [row] = await db
      .select({ email: schema.user.email, enabled: schema.user.enabled })
      .from(schema.user)
      .where(eq(schema.user.email, raw.toLowerCase()))
      .limit(1);
    if (row == null) return { email: null, disabled: false };
    if (row.enabled === false) return { email: null, disabled: true };
    return { email: row.email.trim(), disabled: false };
  }

  const byDisplayId = await findUserByDisplayId(db, raw);
  if (byDisplayId == null) return { email: null, disabled: false };
  if (byDisplayId.enabled === false) return { email: null, disabled: true };
  return { email: byDisplayId.email.trim(), disabled: false };
}

export async function signInWithIdentifier(
  identifierRaw: string,
  password: string,
): Promise<SignInResult> {
  if (identifierRaw.trim() === "" || password === "") {
    return { ok: false, error: GENERIC_ERROR };
  }

  const resolved = await resolveEmailForLogin(identifierRaw);
  if (resolved.disabled) return { ok: false, error: DISABLED_ERROR };
  if (resolved.email == null || resolved.email === "") {
    return { ok: false, error: GENERIC_ERROR };
  }

  try {
    await auth.api.signInEmail({
      body: { email: resolved.email, password },
      headers: await headers(),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}
