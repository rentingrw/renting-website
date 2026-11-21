import type { SearchCar, SearchDriver } from '@/lib/api';

const MODEL_KEY_SEP = '\u001f';

export type BrandGroup = { brand: string; count: number };
export type ModelGroup = { model: string; count: number };

export type CarModelListingGroup = {
  key: string;
  brand: string;
  model: string;
  label: string;
  count: number;
  cars: SearchCar[];
};

function normalizeLabel(value: string): string {
  return value.trim();
}

function titleCaseBrand(brand: string): string {
  const t = normalizeLabel(brand);
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function carModelKeyFromCar(car: SearchCar): string {
  return carModelKey(car.brand ?? '', car.model ?? '');
}

/** Stable model filter key — must match groupCarsByModel. */
export function carModelKeyForListing(car: SearchCar): string {
  const brand = normalizeLabel(car.brand ?? '');
  const model = normalizeLabel(car.model ?? '');
  const effectiveModel = model || normalizeLabel(car.title ?? '') || brand;
  if (!effectiveModel) return '';
  return model ? carModelKeyFromCar(car) : carModelKey(brand, effectiveModel);
}

export function filterCarsByModelKey(cars: SearchCar[], modelKey: string | null): SearchCar[] {
  if (!modelKey) return cars;
  return cars.filter((car) => carModelKeyForListing(car) === modelKey);
}

export function carModelKey(brand: string, model: string): string {
  const b = normalizeLabel(brand).toLowerCase();
  const m = normalizeLabel(model).toLowerCase();
  return `${b}${MODEL_KEY_SEP}${m}`;
}

export function parseCarModelKey(key: string): { brand: string; model: string } | null {
  const i = key.indexOf(MODEL_KEY_SEP);
  if (i < 0) return null;
  const brand = key.slice(0, i);
  const model = key.slice(i + 1);
  if (!brand || !model) return null;
  return { brand, model };
}

function countDuplicateModelNames(cars: SearchCar[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const car of cars) {
    const model = (
      normalizeLabel(car.model ?? '') ||
      normalizeLabel(car.title ?? '') ||
      normalizeLabel(car.brand ?? '')
    ).toLowerCase();
    if (!model) continue;
    map.set(model, (map.get(model) ?? 0) + 1);
  }
  return map;
}

function carModelLabel(brand: string, model: string, duplicateModels: Map<string, number>): string {
  const m = normalizeLabel(model);
  if (!m) return m;
  const b = titleCaseBrand(brand);
  if ((duplicateModels.get(m.toLowerCase()) ?? 0) > 1 && b) {
    return `${b} ${m}`;
  }
  return m;
}

/** Group listings by vehicle model (brand+model), for home page sections and chips. */
export function groupCarsByModel(
  cars: SearchCar[],
  options?: { maxGroups?: number; maxCarsPerGroup?: number },
): CarModelListingGroup[] {
  const maxGroups = options?.maxGroups ?? 24;
  const maxCarsPerGroup = options?.maxCarsPerGroup ?? 12;
  const duplicateModels = countDuplicateModelNames(cars);
  const map = new Map<string, SearchCar[]>();

  for (const car of cars) {
    const key = carModelKeyForListing(car);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(car);
    map.set(key, list);
  }

  return [...map.entries()]
    .map(([key, groupCars]) => {
      const brand = normalizeLabel(groupCars[0]?.brand ?? '');
      const model =
        normalizeLabel(groupCars[0]?.model ?? '') ||
        normalizeLabel(groupCars[0]?.title ?? '') ||
        brand;
      return {
        key,
        brand,
        model,
        label: carModelLabel(brand, model, duplicateModels),
        count: groupCars.length,
        cars: groupCars.slice(0, maxCarsPerGroup),
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, maxGroups);
}

export function aggregateCarBrands(cars: SearchCar[]): BrandGroup[] {
  const map = new Map<string, number>();
  for (const car of cars) {
    const brand = titleCaseBrand(car.brand ?? '');
    if (!brand) continue;
    map.set(brand, (map.get(brand) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
}

export function aggregateCarModels(cars: SearchCar[], brand: string): ModelGroup[] {
  const brandKey = brand.toLowerCase();
  const map = new Map<string, number>();
  for (const car of cars) {
    if (normalizeLabel(car.brand).toLowerCase() !== brandKey) continue;
    const model = normalizeLabel(car.model ?? '');
    if (!model) continue;
    map.set(model, (map.get(model) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model));
}

export function driverMatchesCity(driver: SearchDriver, city: string): boolean {
  const needle = city.trim().toLowerCase();
  if (!needle) return true;
  const primary = normalizeLabel(driver.primaryCity ?? '').toLowerCase();
  if (primary === needle || primary.includes(needle) || needle.includes(primary)) return true;
  return (driver.serviceAreas ?? []).some((area) => {
    const a = normalizeLabel(area).toLowerCase();
    return a === needle || a.includes(needle) || needle.includes(a);
  });
}

export function citiesWithDrivers(
  drivers: SearchDriver[],
  majorCities: readonly string[],
): string[] {
  const fromMajor = majorCities.filter((city) => drivers.some((d) => driverMatchesCity(d, city)));
  if (fromMajor.length > 0) return [...fromMajor];
  if (drivers.length === 0) return [...majorCities];
  const seen = new Set<string>();
  const extra: string[] = [];
  for (const d of drivers) {
    const city = normalizeLabel(d.primaryCity ?? '');
    if (city && !seen.has(city.toLowerCase())) {
      seen.add(city.toLowerCase());
      extra.push(city);
    }
  }
  return extra.sort((a, b) => a.localeCompare(b));
}