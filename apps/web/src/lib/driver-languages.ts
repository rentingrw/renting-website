const DRIVER_LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  sw: 'Swahili',
  fr: 'French',
};

/** Map stored language codes to full display names. */
export function formatDriverLanguages(codes: string[]): string {
  return codes
    .map((code) => {
      const key = code.trim().toLowerCase();
      return DRIVER_LANGUAGE_LABELS[key] ?? code;
    })
    .join(', ');
}