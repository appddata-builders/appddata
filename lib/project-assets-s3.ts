/**
 * Publica la multimedia de un proyecto en su folder de S3 (`{slug}/...`).
 *
 * Se dispara cuando el build de Netlify completa (webhook). Recolecta la
 * multimedia con `collectProjectMedia`, obtiene los bytes (data URL o fetch),
 * convierte CUALQUIER imagen a JPG (incluido HEIC via sharp) y sube los videos
 * tal cual. Idempotente: sobrescribe el folder en cada corrida.
 */

import sharp from "sharp";

import { publicAssetUrl } from "@/lib/public-assets";
import { collectProjectMedia, type MediaItem } from "@/lib/project-media";
import { isS3Configured, putObject } from "@/lib/s3-upload";

const VIDEO_CONTENT_TYPE: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
};

export type PublishResult = {
  folder: string;
  uploaded: string[];
  skipped: { filename: string; reason: string }[];
};

/** Obtiene los bytes de un medio: decodifica data URL o hace fetch de la URL. */
async function readSource(source: string): Promise<Buffer | null> {
  if (source.startsWith("data:")) {
    const comma = source.indexOf(",");
    if (comma === -1) return null;
    return Buffer.from(source.slice(comma + 1), "base64");
  }
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  return null; // rutas relativas u otros esquemas no son alcanzables desde el server
}

async function uploadItem(slug: string, item: MediaItem): Promise<void> {
  const bytes = await readSource(item.source);
  if (!bytes) throw new Error("no se pudo leer la fuente");
  const key = `${slug}/${item.filename}`;
  if (item.kind === "image") {
    const jpg = await sharp(bytes).jpeg({ quality: 82 }).toBuffer();
    await putObject(key, jpg, "image/jpeg");
  } else {
    const ext = item.filename.split(".").pop() ?? "mp4";
    await putObject(key, bytes, VIDEO_CONTENT_TYPE[ext] ?? "application/octet-stream");
  }
}

/** Sube toda la multimedia del proyecto al folder `{slug}/` del bucket. */
export async function publishProjectMediaToS3(slug: string, document: unknown): Promise<PublishResult> {
  if (!isS3Configured()) throw new Error("S3 no esta configurado.");
  const items = collectProjectMedia(slug, document);
  const uploaded: string[] = [];
  const skipped: PublishResult["skipped"] = [];

  for (const item of items) {
    try {
      await uploadItem(slug, item);
      uploaded.push(item.filename);
    } catch (error) {
      skipped.push({ filename: item.filename, reason: error instanceof Error ? error.message : "error" });
    }
  }

  return { folder: `${slug}/`, uploaded, skipped };
}

type SiteDocument = { content?: Record<string, string> } & Record<string, unknown>;

/**
 * Sube TODA la multimedia del proyecto a `s3://.../{slug}/...` (imagenes → JPG)
 * y devuelve el documento con `content` REESCRITO para que cada medio apunte a
 * su URL de S3. Asi el sitio generado carga desde el slug y NO se hornea ningun
 * binario en el repo. Si S3 no esta configurado, devuelve el documento igual.
 */
export async function uploadDocumentMediaToS3(slug: string, document: unknown): Promise<unknown> {
  if (!isS3Configured()) return document;
  const site = (document && typeof document === "object" ? document : {}) as SiteDocument;
  const items = collectProjectMedia(slug, document);
  const rewrites: Record<string, string> = {};

  await Promise.all(
    items.map(async (item) => {
      try {
        await uploadItem(slug, item);
        rewrites[item.key] = publicAssetUrl(`${slug}/${item.filename}`);
      } catch {
        // Si un medio falla, se deja el valor original (no se reescribe esa clave).
      }
    }),
  );

  if (Object.keys(rewrites).length === 0) return document;
  return { ...site, content: { ...(site.content ?? {}), ...rewrites } };
}
