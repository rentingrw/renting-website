import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const localeCookie = (await cookies()).get('NEXT_LOCALE')?.value;
  const fallback = hasLocale(routing.locales, localeCookie) ? localeCookie : routing.defaultLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : fallback;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
