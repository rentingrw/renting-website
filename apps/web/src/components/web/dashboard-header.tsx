'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@rentingi/ui';
import { type SupportedLocale } from '@/i18n/routing';
import { LanguageSelector } from './language-selector';
import { SearchPopup } from './search-popup';

type DashboardHeaderProps = {
  locale: SupportedLocale;
  onLocaleChange?: (locale: SupportedLocale) => void;
  /** Real-time notifications from socket events */
  notifications?: string[];
  onClearNotifications?: () => void;
};

export function DashboardHeader({ locale, onLocaleChange, notifications = [], onClearNotifications }: DashboardHeaderProps) {
  const t = useTranslations('web');
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-background/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
          <Link
            href={`/${locale}`}
            className="shrink-0 text-lg font-bold text-primary transition hover:opacity-90 sm:text-xl"
          >
            renting.rw
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {/* Search - opens popup */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[min(70vh,400px)] min-w-[280px] overflow-hidden border-gray-200 bg-white p-0 sm:min-w-[320px]">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">{t('app.notificationsTitle')}</span>
                  {notifications.length > 0 && onClearNotifications ? (
                    <button
                      type="button"
                      onClick={onClearNotifications}
                      className="text-xs text-gray-500 hover:text-gray-900"
                    >
                      {t('app.notificationsClearAll')}
                    </button>
                  ) : null}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-500">{t('app.notificationsEmpty')}</p>
                  ) : (
                    notifications.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="border-b border-gray-100 px-4 py-3 last:border-0"
                      >
                        <p className="text-sm text-gray-700">{item}</p>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

          <LanguageSelector locale={locale} onLocaleChange={onLocaleChange} variant="light" />

          {/* User avatar in green circle */}
          <UserButton
            afterSignOutUrl={`/${locale}`}
            appearance={{
              elements: {
                avatarBox: 'h-9 w-9 ring-2 ring-teal-500 rounded-full',
              },
            }}
          />
        </div>
      </div>
    </header>

    <SearchPopup open={searchOpen} onOpenChange={setSearchOpen} locale={locale} />
    </>
  );
}
