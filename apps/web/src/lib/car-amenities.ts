/** Stored on listing.features and shown on car detail pages. */
export const CAR_AMENITIES = [
  'Air conditioning',
  'Bluetooth',
  'USB charging',
  'GPS navigation',
  'Backup camera',
  'Leather seats',
  'Sunroof',
  '4WD / AWD',
  'Roof rack',
  'Child seat available',
  'Dash cam',
  'Wi‑Fi hotspot',
  'Insurance included',
  'Airport pickup',
  'Extra driver allowed',
  'Fuel included',
] as const;

export type CarAmenity = (typeof CAR_AMENITIES)[number];

export function toggleAmenity(selected: string[], amenity: string): string[] {
  return selected.includes(amenity)
    ? selected.filter((item) => item !== amenity)
    : [...selected, amenity];
}

export function addCustomAmenity(selected: string[], raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || selected.includes(trimmed)) return selected;
  return [...selected, trimmed];
}
