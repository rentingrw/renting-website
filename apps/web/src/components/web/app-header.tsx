'use client';

import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentingi/ui';
import { type SupportedLocale } from '@/i18n/routing';
import { LanguageSelector } from './language-selector';
import { SearchPopup } from './search-popup';

type AppHeaderProps = {
  locale: SupportedLocale;
  variant?: 'default' | 'dark';
};

export function AppHeader({ locale, variant = 'default' }: AppHeaderProps) {
  const t = useTranslations('web');
  const { isSignedIn } = useAuth();
  const isDark = variant === 'dark';
  const [searchOpen, setSearchOpen] = useState(false);

  const navContent = (
    <>
      {isSignedIn ? (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={`rounded p-2 transition ${
            isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : null}
      <LanguageSelector locale={locale} variant={isDark ? 'dark' : 'light'} />
      {isSignedIn ? (
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/app`}
            className={`rounded border-2 px-3 py-1.5 text-sm font-bold transition-all ${
              isDark
                ? 'border-zinc-600 text-white hover:bg-zinc-800'
                : 'border-neutral-900 bg-white text-neutral-900 shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none'
            }`}
          >
            {t('nav.dashboard')}
          </Link>
          <UserButton afterSignOutUrl={`/${locale}`} />
        </div>
      ) : (
        <>
          <SignInButton mode="modal">
            <button
              type="button"
              className={`rounded border-2 px-3 py-1.5 text-sm font-bold transition-all ${
                isDark
                  ? 'border-zinc-600 text-white hover:bg-zinc-800'
                  : 'border-neutral-900 bg-white text-neutral-900 shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none'
              }`}
            >
              {t('auth.signIn')}
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded border-2 border-teal-800 bg-teal-600 px-3 py-1.5 text-sm font-bold text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-teal-700 hover:shadow-none"
            >
              {t('auth.createAccount')}
            </button>
          </SignUpButton>
        </>
      )}
    </>
  );

  return (
    <header
      className={`sticky top-0 z-50 border-b-2 ${
        isDark ? 'border-zinc-800 bg-zinc-950' : 'border-neutral-900 bg-white'
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href={`/${locale}`}
          className={`shrink-0 text-lg font-black tracking-tight sm:text-xl ${isDark ? 'text-white' : 'text-neutral-900'}`}
        >
          renting.rw
        </Link>

        {/* Desktop nav */}
        <nav className={`hidden items-center gap-3 sm:flex ${isDark ? 'text-white' : ''}`}>
          <Link
            href={`/${locale}/cars`}
            className={`text-sm font-bold transition-colors ${isDark ? 'text-zinc-300 hover:text-white' : 'text-neutral-700 hover:text-teal-600'}`}
          >
            {t('nav.cars')}
          </Link>
          <Link
            href={`/${locale}/drivers`}
            className={`text-sm font-bold transition-colors ${isDark ? 'text-zinc-300 hover:text-white' : 'text-neutral-700 hover:text-teal-600'}`}
          >
            {t('nav.drivers')}
          </Link>
          {navContent}
        </nav>

        {/* Mobile hamburger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`shrink-0 rounded border-2 p-1.5 sm:hidden ${isDark ? 'border-zinc-600 text-white hover:bg-zinc-800' : 'border-neutral-900 bg-white text-neutral-900'}`}
            >
              <Menu className="h-5 w-5" aria-label="Open menu" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`w-56 border-2 border-neutral-900 shadow-brutal ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
            <div className={`flex flex-col gap-2 p-2 ${isDark ? 'text-white' : ''}`}>
              {isSignedIn ? (
                <DropdownMenuItem
                  onClick={() => setSearchOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded font-semibold"
                >
                  <Search className="h-4 w-4" />
                  {t('app.cta.searchButton')}
                </DropdownMenuItem>
              ) : null}
              <LanguageSelector locale={locale} variant={isDark ? 'dark' : 'light'} />
              {isSignedIn ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/app`} className="flex cursor-pointer items-center font-semibold">
                      {t('nav.dashboard')}
                    </Link>
                  </DropdownMenuItem>
                  <div className="border-t pt-2">
                    <UserButton afterSignOutUrl={`/${locale}`} />
                  </div>
                </>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <DropdownMenuItem asChild>
                      <span className="cursor-pointer font-semibold">{t('auth.signIn')}</span>
                    </DropdownMenuItem>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <DropdownMenuItem asChild>
                      <span className="cursor-pointer font-semibold">{t('auth.createAccount')}</span>
                    </DropdownMenuItem>
                  </SignUpButton>
                </>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isSignedIn ? <SearchPopup open={searchOpen} onOpenChange={setSearchOpen} locale={locale} /> : null}
    </header>
  );
}
