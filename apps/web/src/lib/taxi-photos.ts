export type TaxiPhotoFields = {
  photos?: string[];
  photoUrl?: string | null;
};

/** Unique car images for gallery (profile photo excluded). */
export function taxiCarPhotos(taxi: TaxiPhotoFields): string[] {
  const raw = [...(taxi.photos ?? []), taxi.photoUrl].filter((url): url is string => Boolean(url?.trim()));
  return [...new Set(raw.map((url) => url.trim()))];
}