const RESERVED_PROJECT_SLUGS = new Set(["admin", "api", "app", "dashboard", "imin", "login", "www"]);

export function slugifyProjectName(name: string): string {
  return name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function validateProjectName(raw: unknown): { ok: true; name: string; slug: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Escribe un nombre para el proyecto." };
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 60) return { ok: false, error: "El nombre debe tener entre 3 y 60 caracteres." };
  const slug = slugifyProjectName(name);
  if (slug.length < 3) return { ok: false, error: "El nombre debe contener al menos tres letras o numeros." };
  if (RESERVED_PROJECT_SLUGS.has(slug)) return { ok: false, error: "Ese nombre esta reservado por Appddata." };
  return { ok: true, name, slug };
}
