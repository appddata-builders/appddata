/**
 * Origenes permitidos por better-auth.
 *
 * En produccion el dominio no siempre se conoce al escribir el codigo (Vercel
 * genera URLs por deploy), asi que se arma la lista leyendo las variables que
 * inyecta cada plataforma.
 */

function addOrigin(set: Set<string>, value: string | undefined) {
  if (!value) return;
  const raw = value.trim();
  if (!raw) return;
  try {
    const url =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? new URL(raw)
        : new URL(`https://${raw}`);
    set.add(url.origin);
  } catch {
    // Una variable mal formada no debe tumbar el arranque.
  }
}

export function getTrustedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://localhost:3001",
  ]);

  // Next cambia de puerto automaticamente cuando el puerto habitual esta
  // ocupado. Better Auth admite wildcards; limitamos estos patrones a
  // loopback y solo al entorno de desarrollo.
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:*");
    origins.add("http://127.0.0.1:*");
    origins.add("http://[::1]:*");
  }

  addOrigin(origins, process.env.BETTER_AUTH_URL);
  addOrigin(origins, process.env.NEXT_PUBLIC_APP_URL);
  addOrigin(origins, process.env.SITE_URL);

  if (process.env.VERCEL_URL) {
    addOrigin(origins, `https://${process.env.VERCEL_URL}`);
  }
  addOrigin(origins, process.env.VERCEL_BRANCH_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    addOrigin(origins, `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  // Netlify: URL contiene la URL canonica del sitio.
  addOrigin(origins, process.env.URL);
  addOrigin(origins, process.env.DEPLOY_PRIME_URL);

  return [...origins];
}
