/**
 * Iniciales consistentes para toda la interfaz.
 * Usa nombre + ultimo apellido; con una sola palabra toma sus dos primeras
 * letras y, si no hay nombre, aplica la misma regla al usuario del correo.
 */
export function getUserInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const source = name?.trim() || email?.split("@")[0]?.trim() || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";

  const first = parts[0]?.[0] ?? "";
  const second =
    parts.length > 1
      ? parts[parts.length - 1]?.[0] ?? ""
      : parts[0]?.[1] ?? "";

  return (first + second).toUpperCase() || "?";
}
