const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName?: string;
};

export type ReverseGeocodeResult = {
  displayName: string;
};

export async function geocode(query: string): Promise<GeocodeResult> {
  const res = await fetch(`${API_BASE}/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const err = (await res.json()).message ?? 'Geocoding failed';
    throw new Error(typeof err === 'string' ? err : err.join?.(' ') ?? 'Geocoding failed');
  }
  return res.json();
}

export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const res = await fetch(`${API_BASE}/geocode/reverse?lat=${lat}&lon=${lon}`);
  if (!res.ok) {
    const err = (await res.json()).message ?? 'Reverse geocoding failed';
    throw new Error(typeof err === 'string' ? err : err.join?.(' ') ?? 'Reverse geocoding failed');
  }
  return res.json();
}
