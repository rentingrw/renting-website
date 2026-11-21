import type { AdminListingItem } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function adminListingPhotoDownloadPath(listingId: string, photoIndex: number): string {
  return `${API_BASE_URL}/admin/listings/${listingId}/photos/${photoIndex}/download`;
}

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function listingPhotoFilename(
  listing: Pick<AdminListingItem, 'id' | 'brand' | 'model' | 'plateNumber'>,
  photoIndex: number,
  url: string,
): string {
  const parts = [listing.plateNumber, listing.brand, listing.model, listing.id.slice(0, 8)].filter(Boolean);
  const slug = parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  let ext = 'jpg';
  try {
    const fromPath = new URL(url).pathname.split('.').pop()?.toLowerCase();
    if (fromPath && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(fromPath)) {
      ext = fromPath === 'jpeg' ? 'jpg' : fromPath;
    }
  } catch {
    // ignore
  }
  return `${slug || 'listing'}_${photoIndex + 1}.${ext}`;
}

/** Cloudinary attachment transform; otherwise use the admin API proxy (local dev uploads). */
export function resolvePhotoDownloadUrl(listingId: string, photoIndex: number, url: string): string {
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (url.includes('/upload/fl_attachment/')) return url;
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  if (url.startsWith(API_BASE_URL) || url.includes('/dev-media/')) {
    return adminListingPhotoDownloadPath(listingId, photoIndex);
  }
  return adminListingPhotoDownloadPath(listingId, photoIndex);
}

export function shouldDownloadViaApi(url: string): boolean {
  return !url.includes('res.cloudinary.com');
}

export async function downloadListingPhoto(
  token: string,
  listing: Pick<AdminListingItem, 'id' | 'brand' | 'model' | 'plateNumber'>,
  photoIndex: number,
  photoUrl: string,
): Promise<void> {
  const filename = listingPhotoFilename(listing, photoIndex, photoUrl);
  if (shouldDownloadViaApi(photoUrl)) {
    const response = await fetch(adminListingPhotoDownloadPath(listing.id, photoIndex), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Could not download photo.');
    const blob = await response.blob();
    saveBlob(blob, filename);
    return;
  }

  const href = resolvePhotoDownloadUrl(listing.id, photoIndex, photoUrl);
  const response = await fetch(href);
  if (!response.ok) throw new Error('Could not download photo.');
  const blob = await response.blob();
  saveBlob(blob, filename);
}

export async function downloadAllListingPhotos(
  token: string,
  listing: AdminListingItem,
): Promise<void> {
  if (!listing.photos.length) return;
  for (let index = 0; index < listing.photos.length; index += 1) {
    await downloadListingPhoto(token, listing, index, listing.photos[index]!);
    if (index < listing.photos.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
}