/**
 * Crea un sitio en Netlify enlazado al repositorio de GitHub para que Netlify
 * compile el proyecto Next.js en cada push (build continuo). Ya no se suben
 * archivos renderizados: el repo es la fuente de verdad.
 *
 * Requiere:
 *  - NETLIFY_AUTH_TOKEN            token de la cuenta.
 *  - NETLIFY_ACCOUNT_SLUG          slug del equipo/cuenta donde crear el sitio.
 *  - NETLIFY_GITHUB_INSTALLATION_ID  id de instalacion de la Netlify GitHub App
 *                                    (la app debe tener acceso a los repos).
 */

type LinkedRepo = { fullName: string; id: number; private: boolean };

type NetlifyResult =
  | { status: "deployed"; siteId: string; url: string; adminUrl: string }
  | { status: "name_taken"; message: string }
  | { status: "configuration_required" };

export async function deployNetlifySite(name: string, slug: string, repo: LinkedRepo): Promise<NetlifyResult> {
  const token = process.env.NETLIFY_AUTH_TOKEN?.trim();
  const accountSlug = process.env.NETLIFY_ACCOUNT_SLUG?.trim();
  const installationId = Number(process.env.NETLIFY_GITHUB_INSTALLATION_ID?.trim());
  if (!token || !accountSlug || !Number.isFinite(installationId)) return { status: "configuration_required" };

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "Appddata site generator",
  };

  const response = await fetch(`https://api.netlify.com/api/v1/${encodeURIComponent(accountSlug)}/sites`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: slug,
      repo: {
        provider: "github",
        installation_id: installationId,
        id: repo.id,
        repo: repo.fullName,
        private: repo.private,
        branch: "main",
        cmd: "npm run build",
      },
    }),
  });
  if (!response.ok) {
    const detail = await netlifyError(response);
    // 422 al crear = el nombre/subdominio ya esta en uso (nombre en uso).
    if (response.status === 422) return { status: "name_taken", message: detail };
    throw new Error(`Netlify no pudo crear el sitio enlazado (${response.status}): ${detail}`);
  }
  const site = (await response.json()) as { id: string; ssl_url?: string; url?: string; admin_url?: string };

  // Notificacion de deploy: cuando el build complete, Netlify llama a nuestro
  // endpoint para publicar la multimedia del proyecto en S3. Best-effort.
  await registerDeployWebhook(site.id, headers);

  return {
    status: "deployed",
    siteId: site.id,
    url: site.ssl_url ?? site.url ?? `https://${slug}.netlify.app`,
    adminUrl: site.admin_url ?? `https://app.netlify.com/sites/${slug}`,
  };
}

/**
 * Registra en Netlify una notificacion de deploy (`deploy_created`) que apunta a
 * nuestro endpoint. Requiere APP_BASE_URL y NETLIFY_DEPLOY_WEBHOOK_SECRET; si
 * faltan, se omite sin romper el deploy.
 */
async function registerDeployWebhook(siteId: string, headers: Record<string, string>): Promise<void> {
  const baseUrl = process.env.APP_BASE_URL?.trim().replace(/\/+$/, "");
  const secret = process.env.NETLIFY_DEPLOY_WEBHOOK_SECRET?.trim();
  if (!baseUrl || !secret) return;
  const url = `${baseUrl}/api/netlify/deploy?token=${encodeURIComponent(secret)}`;
  try {
    await fetch("https://api.netlify.com/api/v1/hooks", {
      method: "POST",
      headers,
      body: JSON.stringify({ site_id: siteId, type: "url", event: "deploy_created", data: { url } }),
    });
  } catch {
    // best-effort: un fallo aqui no debe abortar la creacion del sitio.
  }
}

async function netlifyError(response: Response): Promise<string> {
  const raw = await response.text().catch(() => "");
  if (!raw) return response.statusText;
  try {
    const data = JSON.parse(raw) as { message?: string; error?: string; errors?: unknown };
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.errors) return typeof data.errors === "string" ? data.errors : JSON.stringify(data.errors);
    return raw;
  } catch {
    return raw; // body en texto plano
  }
}
