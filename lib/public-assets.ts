const s3BaseUrl = (process.env.NEXT_PUBLIC_S3 ?? "").replace(/\/+$/, "");

export function publicAssetUrl(filename: string): string {
  const normalizedFilename = filename.replace(/^\/+/, "");
  return s3BaseUrl ? `${s3BaseUrl}/${normalizedFilename}` : `/${normalizedFilename}`;
}

export const BRAND_PLANE_URL = publicAssetUrl("brand-plane.png");
export const IMIN_LOGO_URL = publicAssetUrl("IMIN.png");

export function resolvePublicAssetUrl(value: string): string {
  if (value === "/brand-plane.png") return BRAND_PLANE_URL;
  if (value === "/IMIN.png") return IMIN_LOGO_URL;
  return value;
}

export function isBrandPlaneAsset(value: string | null | undefined): boolean {
  return value === BRAND_PLANE_URL || value === "/brand-plane.png";
}
