/** Rwanda admin address: Cell, Sector, District, Province — district is the listing city label. */
export function parseListingCityFromLocationText(locationText: string): string {
  const parts = locationText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts[2];
  if (parts.length >= 1) return parts[parts.length - 1];
  return 'Kigali';
}

export function resolveListingCity(locationText: string, explicitCity?: string): string {
  const trimmed = explicitCity?.trim();
  if (trimmed) return trimmed;
  return parseListingCityFromLocationText(locationText);
}
