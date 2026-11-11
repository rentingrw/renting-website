/** Accept Cloudinary HTTPS URLs and local dev URLs (localhost) from ImageUploadService. */
export const LISTING_PHOTO_URL_OPTIONS = {
  require_tld: false,
  protocols: ['http', 'https'] as string[],
};

function readRate(obj: Record<string, unknown>, primary: string, legacy?: string): unknown {
  if (obj[primary] !== undefined && obj[primary] !== null && obj[primary] !== '') {
    return obj[primary];
  }
  if (legacy && obj[legacy] !== undefined && obj[legacy] !== null && obj[legacy] !== '') {
    return obj[legacy];
  }
  return undefined;
}

export function transformListingRate(
  obj: Record<string, unknown>,
  primary: string,
  legacy?: string,
): number | undefined {
  const raw = readRate(obj, primary, legacy);
  if (raw === undefined) return undefined;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? n : undefined;
}
