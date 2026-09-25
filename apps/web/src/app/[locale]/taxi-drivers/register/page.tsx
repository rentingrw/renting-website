import { redirect } from 'next/navigation';

import { isSupportedLocale, routing } from '@/i18n/routing';

export default async function RegisterTaxiRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const nextLocale = isSupportedLocale(locale) ? locale : routing.defaultLocale;
  redirect(`/${nextLocale}/onboard/taxi`);
}
