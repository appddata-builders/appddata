import type { GeneratedFile } from "@/lib/generated-site";

type GitHubResult =
  | { status: "created"; id: number; owner: string; name: string; fullName: string; url: string; cloneUrl: string; private: boolean }
  | { status: "name_taken"; message: string }
  | { status: "configuration_required" };

const API_VERSION = "2026-03-10";

export async function createGitHubRepository(projectName: string, slug: string, siteFiles: GeneratedFile[]): Promise<GitHubResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return { status: "configuration_required" };
  const owner = process.env.GITHUB_OWNER?.trim();

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "Appddata site generator",
    "X-GitHub-Api-Version": API_VERSION,
  };
  const privateRepository = process.env.GITHUB_REPOSITORY_PRIVATE !== "false";
  const createEndpoint = owner
    ? `https://api.github.com/orgs/${encodeURIComponent(owner)}/repos`
    : "https://api.github.com/user/repos";
  const response = await fetch(createEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: slug,
      description: `Sitio ${projectName}, generado desde Appddata.`,
      private: privateRepository,
      auto_init: true,
    }),
  });
  if (!response.ok) {
    const detail = await githubError(response);
    // 422 al crear = el repositorio con ese nombre ya existe (nombre en uso).
    if (response.status === 422) return { status: "name_taken", message: detail };
    throw new Error(`GitHub no pudo crear el repositorio (${response.status}): ${detail}`);
  }
  const repository = await response.json() as {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    html_url: string;
    clone_url: string;
    private: boolean;
    default_branch: string;
  };

  // Se sube todo el sitio en UN commit via la Git Data API (blobs + arbol + ref).
  // A diferencia de la Contents API (un PUT por archivo, con limite de ~1 MB por
  // archivo), los blobs aceptan binarios grandes: por eso el logo/imagenes ya no
  // fallan con 400/401.
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}`;
  await pushFilesInOneCommit(apiBase, repository.default_branch || "main", headers, siteFiles);

  return {
    status: "created",
    id: repository.id,
    owner: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    url: repository.html_url,
    cloneUrl: repository.clone_url,
    private: repository.private,
  };
}

/**
 * Borra un repositorio (para limpiar el repo huerfano si el sitio de Netlify no
 * se pudo crear). Best-effort: requiere el scope `delete_repo` en el token; si
 * falla, no rompe el flujo. Devuelve true si se borro.
 */
export async function deleteGitHubRepository(owner: string, name: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return false;
  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Appddata site generator",
          "X-GitHub-Api-Version": API_VERSION,
        },
      },
    );
    return response.ok; // 204 al borrar
  } catch {
    return false;
  }
}

type GhHeaders = Record<string, string>;

/** Sube todos los archivos del sitio como un solo commit sobre la rama por defecto. */
async function pushFilesInOneCommit(apiBase: string, branch: string, headers: GhHeaders, siteFiles: GeneratedFile[]) {
  const api = (path: string, init?: RequestInit) => fetch(`${apiBase}${path}`, { ...init, headers });
  const ref = `heads/${branch}`;

  // 1. Commit base de la rama (el de `auto_init`). Puede tardar un instante en
  // existir tras crear el repo, asi que se reintenta un par de veces.
  let baseCommitSha = "";
  for (let attempt = 0; attempt < 4 && !baseCommitSha; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 600));
    const refRes = await api(`/git/ref/${ref}`);
    if (refRes.ok) {
      baseCommitSha = ((await refRes.json()) as { object?: { sha?: string } }).object?.sha ?? "";
    } else if (refRes.status !== 404 && refRes.status !== 409) {
      throw new Error(`GitHub no pudo leer la rama ${branch} (${refRes.status}): ${await githubError(refRes)}`);
    }
  }
  if (!baseCommitSha) throw new Error("GitHub no expuso el commit base de la rama tras crear el repositorio.");

  // 2. Arbol base de ese commit.
  const commitRes = await api(`/git/commits/${baseCommitSha}`);
  if (!commitRes.ok) throw new Error(`GitHub no pudo leer el commit base (${commitRes.status}): ${await githubError(commitRes)}`);
  const baseTreeSha = ((await commitRes.json()) as { tree?: { sha?: string } }).tree?.sha;

  // 3. Un blob por archivo; los binarios (imagenes) van en base64.
  const tree: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];
  for (const file of siteFiles) {
    const path = file.path.replace(/^\//, "");
    const blobRes = await api(`/git/blobs`, {
      method: "POST",
      body: JSON.stringify(
        file.encoding === "base64"
          ? { content: file.body, encoding: "base64" }
          : { content: file.body, encoding: "utf-8" },
      ),
    });
    if (!blobRes.ok) throw new Error(`GitHub no pudo crear el blob de ${path} (${blobRes.status}): ${await githubError(blobRes)}`);
    const blobSha = ((await blobRes.json()) as { sha?: string }).sha;
    if (!blobSha) throw new Error(`GitHub no devolvio el sha del blob de ${path}.`);
    tree.push({ path, mode: "100644", type: "blob", sha: blobSha });
  }

  // 4. Nuevo arbol sobre el base.
  const treeRes = await api(`/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  });
  if (!treeRes.ok) throw new Error(`GitHub no pudo crear el arbol de archivos (${treeRes.status}): ${await githubError(treeRes)}`);
  const newTreeSha = ((await treeRes.json()) as { sha?: string }).sha;

  // 5. Commit con el sitio generado.
  const newCommitRes = await api(`/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: "Sitio generado desde Appddata", tree: newTreeSha, parents: [baseCommitSha] }),
  });
  if (!newCommitRes.ok) throw new Error(`GitHub no pudo crear el commit (${newCommitRes.status}): ${await githubError(newCommitRes)}`);
  const newCommitSha = ((await newCommitRes.json()) as { sha?: string }).sha;

  // 6. Mueve la rama al nuevo commit.
  const patchRes = await api(`/git/refs/${ref}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommitSha }),
  });
  if (!patchRes.ok) throw new Error(`GitHub creo el repositorio, pero no pudo publicar el sitio (${patchRes.status}): ${await githubError(patchRes)}`);
}

async function githubError(response: Response) {
  try {
    const data = await response.json() as { message?: string };
    return data.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
