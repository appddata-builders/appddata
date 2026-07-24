import type { GeneratedFile } from "@/lib/generated-site";

type GitHubResult =
  | { status: "created"; id: number; owner: string; name: string; fullName: string; url: string; cloneUrl: string; private: boolean }
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
  };
  const sourceFiles = siteFiles.map((file) => ({
    path: file.path.replace(/^\//, ""),
    // Los binarios (imagenes) ya vienen en base64; el resto es texto UTF-8.
    content: file.encoding === "base64" ? file.body : Buffer.from(file.body, "utf8").toString("base64"),
  }));
  for (const file of sourceFiles) {
    const contentsUrl = `https://api.github.com/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}`;
    const current = await fetch(contentsUrl, { headers });
    let sha: string | undefined;
    if (current.ok) {
      const existing = await current.json() as { sha?: string };
      sha = existing.sha;
    } else if (current.status !== 404) {
      const detail = await githubError(current);
      throw new Error(`GitHub no pudo revisar ${file.path} (${current.status}): ${detail}`);
    }
    const upload = await fetch(contentsUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Add ${file.path}`,
        content: file.content,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!upload.ok) {
      const detail = await githubError(upload);
      throw new Error(`GitHub creo el repositorio, pero no pudo subir ${file.path} (${upload.status}): ${detail}`);
    }
  }
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

async function githubError(response: Response) {
  try {
    const data = await response.json() as { message?: string };
    return data.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
