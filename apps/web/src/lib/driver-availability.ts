export const DRIVER_AVAILABILITY_OPTIONS = ['24/7', 'Weekends', 'Daytime', 'Nighttime'] as const;

export type DriverAvailabilityOption = (typeof DRIVER_AVAILABILITY_OPTIONS)[number];

const LEGACY_AVAILABILITY: Record<string, DriverAvailabilityOption> = {
  Anytime: '24/7',
  'Weekends only': 'Weekends',
  'Daytime (6am–6pm)': 'Daytime',
  'Daytime (6am-6pm)': 'Daytime',
  'Nighttime (6pm–6am)': 'Nighttime',
  'Nighttime (6pm-6am)': 'Nighttime',
};

export function normalizeAvailabilityLabel(raw: string): DriverAvailabilityOption | null {
  const trimmed = raw.trim();
  if ((DRIVER_AVAILABILITY_OPTIONS as readonly string[]).includes(trimmed)) {
    return trimmed as DriverAvailabilityOption;
  }
  return LEGACY_AVAILABILITY[trimmed] ?? null;
}

export function parseAvailabilityFromProfile(profile: {
  certifications?: string[];
  serviceAreas?: string[];
}): DriverAvailabilityOption[] {
  const tokens = [
    ...(profile.certifications ?? []),
    ...(profile.serviceAreas ?? []),
  ]
    .filter((item) => item.startsWith('Availability: '))
    .map((item) => item.replace('Availability: ', ''));

  const normalized = tokens
    .map((token) => normalizeAvailabilityLabel(token))
    .filter((item): item is DriverAvailabilityOption => item != null);

  const unique = [...new Set(normalized)];
  return unique.length ? unique : ['24/7'];
}

export function availabilityCertifications(modes: string[]): string[] {
  return modes.map((mode) => `Availability: ${mode}`);
}