export const TAXI_CAR_FEATURES = [
  'Air conditioning',
  'Airport runs',
  'Night service',
  'Child seat',
  'Extra luggage',
  'Wi‑Fi',
  'Card payment',
  'Wheelchair accessible',
  'USB charging',
  'GPS navigation',
] as const;

export const TAXI_LANGUAGE_OPTIONS: { label: string; value: string }[] = [
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'Kinyarwanda', value: 'rw' },
  { label: 'Swahili', value: 'sw' },
];

export const TAXI_VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'van', 'pickup'] as const;

export const MAX_TAXI_CAR_PHOTOS = 5;
export const MIN_TAXI_CAR_PHOTOS = 1;
