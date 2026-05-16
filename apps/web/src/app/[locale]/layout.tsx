import { ClerkProvider } from '@clerk/nextjs';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';

import '@rentingi/ui/globals.css';
import '../web.css';

import { AppQueryClientProvider } from '@/lib/query-client';
import { routing } from '@/i18n/routing';

export const metadata: Metadata = {
  title: { default: 'renting.rw — Rwanda\'s Car & Driver Marketplace', template: '%s | renting.rw' },
  description: 'Book verified cars and professional drivers in Rwanda. Self-drive, airport transfers, city trips and more.',
  metadataBase: new URL('https://renting.rw'),
  openGraph: {
    siteName: 'renting.rw',
    locale: 'en_RW',
    type: 'website',
  },
};

const inter = Inter({ subsets: ['latin'] });

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <ClerkProvider>
          <NextIntlClientProvider messages={messages}>
            <AppQueryClientProvider>{children}</AppQueryClientProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
