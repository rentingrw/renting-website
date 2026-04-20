import { BadRequestException } from '@nestjs/common';

/**
 * Geocoding via OpenStreetMap Nominatim (free, no API key).
 * Rate limit: 1 request/second. Use responsibly.
 * Docs: https://nominatim.org/release-docs/latest/api/Search/
 */
export async function geocode(
  query: string,
): Promise<{ latitude: number; longitude: number; displayName?: string }> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new BadRequestException('Geocoding query cannot be empty.');
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Rentingi/1.0 (rental-platform)',
      },
    });
  } catch {
    throw new BadRequestException('Could not geocode location. Please try again.');
  }

  if (!response.ok) {
    throw new BadRequestException('Geocoding request failed.');
  }

  const body = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  const first = body?.[0];
  const lat = first?.lat != null ? Number(first.lat) : NaN;
  const lon = first?.lon != null ? Number(first.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new BadRequestException(`No results found for "${trimmed}".`);
  }

  return {
    latitude: lat,
    longitude: lon,
    displayName: first?.display_name,
  };
}

/**
 * Autocomplete: returns up to `limit` matching places for a partial query.
 */
export async function autocomplete(
  query: string,
  limit = 5,
): Promise<Array<{ latitude: number; longitude: number; displayName: string }>> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '0');

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'renting.rw/1.0 (rental-platform)' },
    });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const body = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  return (body ?? [])
    .map((r) => ({
      latitude: Number(r.lat ?? NaN),
      longitude: Number(r.lon ?? NaN),
      displayName: r.display_name?.trim() ?? '',
    }))
    .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
}

/**
 * Reverse geocode: coordinates → address.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ displayName: string }> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new BadRequestException('Invalid coordinates for reverse geocoding.');
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '0');

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Rentingi/1.0 (rental-platform)',
      },
    });
  } catch {
    throw new BadRequestException('Could not reverse geocode. Please try again.');
  }

  if (!response.ok) {
    throw new BadRequestException('Reverse geocoding failed.');
  }

  const body = (await response.json()) as { display_name?: string };
  const displayName = body?.display_name?.trim() ?? 'Unknown location';
  return { displayName };
}
