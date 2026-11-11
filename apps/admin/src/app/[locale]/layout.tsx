import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AppQueryClientProvider } from '@/lib/query-client';
import { routing } from '@/i18n/routing';
import { AdminNav } from '@/components/admin/admin-nav';

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
    <NextIntlClientProvider messages={messages} locale={locale}>
      <AppQueryClientProvider>
        <div className="min-h-screen bg-background">
          <AdminNav />
          <div className="min-h-screen lg:ml-56">
            <div className="min-h-screen bg-hills">{children}</div>
          </div>
        </div>
      </AppQueryClientProvider>
    </NextIntlClientProvider>
  );
}
