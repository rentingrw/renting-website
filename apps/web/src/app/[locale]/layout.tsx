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
import { UserSync } from '@/components/web/user-sync';

export const metadata: Metadata = {
  title: { default: 'renting.rw, Rwanda\'s Car & Driver Marketplace', template: '%s | renting.rw' },
  description: 'Book cars and professional drivers in Rwanda. Self-drive, airport transfers, city trips and more.',
  metadataBase: new URL('https://renting.rw'),
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
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
      <body className={`${inter.className} bg-background text-foreground`}>
        <ClerkProvider
          appearance={{
            layout: { unsafe_disableDevelopmentModeWarnings: true },
            variables: {
              colorPrimary: '#14221f',
              colorBackground: '#ffffff',
              colorText: '#1c2a27',
              colorTextSecondary: '#5c6b67',
              borderRadius: '0.9rem',
            },
          }}
        >
          <NextIntlClientProvider messages={messages}>
            <AppQueryClientProvider>
              <UserSync />
              {children}
            </AppQueryClientProvider>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
