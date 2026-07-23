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
    throw new Error(`Netlify no pudo crear el sitio enlazado (${response.status}): ${await netlifyError(response)}`);
  }
  const site = (await response.json()) as { id: string; ssl_url?: string; url?: string; admin_url?: string };
  return {
    status: "deployed",
    siteId: site.id,
    url: site.ssl_url ?? site.url ?? `https://${slug}.netlify.app`,
    adminUrl: site.admin_url ?? `https://app.netlify.com/sites/${slug}`,
  };
}

async function netlifyError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
