/**
 * Major cities and urban centers in Rwanda for search, filters, and “Move around” links.
 * Names match common marketplace / geocoding labels (English).
 */
export const RWANDA_MAJOR_CITIES = [
  'Kigali',
  'Musanze',
  'Rubavu',
  'Rusizi',
  'Karongi',
  'Huye',
  'Muhanga',
  'Nyagatare',
  'Rwamagana',
  'Kayonza',
  'Bugesera',
  'Nyanza',
  'Gicumbi',
  'Rulindo',
  'Nyamagabe',
  'Kamonyi',
  'Ngororero',
  'Kirehe',
  'Ngoma',
  'Burera',
] as const;

export type RwandaMajorCity = (typeof RWANDA_MAJOR_CITIES)[number];