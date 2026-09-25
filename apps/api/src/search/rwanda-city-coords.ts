/** Approximate city centers used when a listing only has a city name. */
const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  kigali: { latitude: -1.9441, longitude: 30.0619 },
  musanze: { latitude: -1.4998, longitude: 29.635 },
  ruhengeri: { latitude: -1.4998, longitude: 29.635 },
  rubavu: { latitude: -1.7028, longitude: 29.256 },
  gisenyi: { latitude: -1.7028, longitude: 29.256 },
  rusizi: { latitude: -2.4833, longitude: 28.9075 },
  cyangugu: { latitude: -2.4833, longitude: 28.9075 },
  karongi: { latitude: -2.1503, longitude: 29.348 },
  kibuye: { latitude: -2.1503, longitude: 29.348 },
  huye: { latitude: -2.5967, longitude: 29.7394 },
  butare: { latitude: -2.5967, longitude: 29.7394 },
  muhanga: { latitude: -2.0811, longitude: 29.743 },
  gitarama: { latitude: -2.0811, longitude: 29.743 },
  nyagatare: { latitude: -1.2975, longitude: 30.326 },
  rwamagana: { latitude: -1.9487, longitude: 30.4347 },
  kayonza: { latitude: -1.869, longitude: 30.658 },
  nyamasheke: { latitude: -2.373, longitude: 29.144 },
  ngoma: { latitude: -2.145, longitude: 30.543 },
  kibungo: { latitude: -2.1606, longitude: 30.5428 },
  gicumbi: { latitude: -1.578, longitude: 30.067 },
  byumba: { latitude: -1.5761, longitude: 30.0675 },
  nyarugenge: { latitude: -1.957, longitude: 30.044 },
  kicukiro: { latitude: -1.97, longitude: 30.104 },
  gasabo: { latitude: -1.89, longitude: 30.1 },
};

export function coordsForRwandaCity(city?: string | null): { latitude: number; longitude: number } | null {
  if (!city?.trim()) return null;
  const normalized = city
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || normalized.length < 3) return null;

  const exact = CITY_COORDS[normalized];
  if (exact) return exact;

  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(name)) return coords;
    if (normalized.length >= 4 && name.includes(normalized)) return coords;
  }
  return null;
}

export function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}
