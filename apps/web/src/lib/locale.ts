import type { SupportedLocale } from '@/i18n/routing';

const COOKIE_NAME = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/** Set the locale cookie so next-intl and future visits use this preference */
export function setLocaleCookie(locale: SupportedLocale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
