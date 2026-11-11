export function buildListingTitle(year: number, brand: string, model: string, colorLabel?: string): string {
  const base = `${year} ${brand} ${model}`.trim();
  return colorLabel?.trim() ? `${base} · ${colorLabel.trim()}` : base;
}

export function resolveColorLabel(color: string, customColor: string): string {
  if (color === 'Other') return customColor.trim();
  return color.trim();
}
