import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type PanelSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    displayId: string | null;
    projectSlug: string | null;
  };
};

/**
 * Sesion valida para entrar al panel. Devuelve `null` si no hay sesion o si la
 * cuenta fue inhabilitada, para que quien llama redirija o responda 401.
 */
export async function requirePanelSession(): Promise<PanelSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = session.user as typeof session.user & {
    role?: string | null;
    displayId?: string | null;
    projectSlug?: string | null;
    enabled?: boolean | null;
  };

  if (user.enabled === false) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role ?? "cliente",
      displayId: user.displayId ?? null,
      projectSlug: user.projectSlug ?? null,
    },
  };
}

export function isAdmin(session: PanelSession): boolean {
  return session.user.role === "admin";
}

/** Un cliente solo toca el proyecto que tiene asignado; un admin, todos. */
export function canEditProject(session: PanelSession, slug: string): boolean {
  return isAdmin(session) || session.user.projectSlug === slug;
}
