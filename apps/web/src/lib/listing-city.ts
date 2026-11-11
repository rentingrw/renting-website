export function parseListingCityFromLocationText(locationText: string): string {
  const parts = locationText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts[2];
  if (parts.length >= 1) return parts[parts.length - 1];
  return 'Kigali';
}

export function inCityRateLabel(city: string): string {
  return `In ${city}`;
}

export function outsideCityRateLabel(city: string): string {
  return `Outside ${city}`;
}
