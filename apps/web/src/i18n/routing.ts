import { defineRouting } from 'next-intl/routing';

export const supportedLocales = ['en', 'rw', 'fr'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export const routing = defineRouting({
  locales: supportedLocales,
  defaultLocale: 'en',
});
