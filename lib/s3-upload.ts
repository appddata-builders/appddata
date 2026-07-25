/**
 * Cliente S3 minimo para subir la multimedia de un proyecto al bucket.
 *
 * Credenciales SERVER-ONLY: S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (sin el
 * prefijo NEXT_PUBLIC_, para que NO se incrusten en el bundle del cliente).
 *
 * El bucket y la region se derivan de NEXT_PUBLIC_S3 (solo la URL base, no es
 * secreta; p.ej. https://appddata.s3.us-east-1.amazonaws.com/).
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

type S3Target = { bucket: string; region: string };

/** Deriva bucket + region de la URL base del bucket (estilo virtual-hosted). */
function parseS3Target(): S3Target | null {
  const base = process.env.NEXT_PUBLIC_S3?.trim();
  if (!base) return null;
  let host: string;
  try {
    host = new URL(base).hostname;
  } catch {
    return null;
  }
  // {bucket}.s3.{region}.amazonaws.com  |  {bucket}.s3.amazonaws.com (us-east-1)
  const parts = host.split(".");
  const s3Index = parts.indexOf("s3");
  if (s3Index <= 0) return null;
  const bucket = parts.slice(0, s3Index).join(".");
  const region = parts[s3Index + 1] && parts[s3Index + 1] !== "amazonaws" ? parts[s3Index + 1] : "us-east-1";
  return bucket ? { bucket, region } : null;
}

let cached: { client: S3Client; bucket: string } | null = null;

/** Cliente S3 configurado (o null si faltan credenciales/URL). */
function getS3(): { client: S3Client; bucket: string } | null {
  if (cached) return cached;
  const target = parseS3Target();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!target || !accessKeyId || !secretAccessKey) return null;
  const client = new S3Client({
    region: target.region,
    credentials: { accessKeyId, secretAccessKey },
  });
  cached = { client, bucket: target.bucket };
  return cached;
}

/** true si hay credenciales y bucket configurados para escribir. */
export function isS3Configured(): boolean {
  return getS3() !== null;
}

/** Sube un objeto al bucket. `key` es la ruta completa (p.ej. `slug/archivo.jpg`). */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const s3 = getS3();
  if (!s3) throw new Error("S3 no esta configurado (revisa NEXT_PUBLIC_S3 y las llaves).");
  await s3.client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
