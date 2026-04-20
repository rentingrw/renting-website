'use client';

import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  Button,
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
          className={`rounded-lg p-2 transition ${
            isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : null}
      <LanguageSelector locale={locale} variant={isDark ? 'dark' : 'light'} />
      {isSignedIn ? (
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/app`}>
            <Button
              variant="outline"
              className={
                isDark
                  ? 'border-zinc-600 bg-transparent text-white hover:bg-zinc-800 hover:text-white'
                  : ''
              }
            >
              {t('nav.dashboard')}
            </Button>
          </Link>
          <UserButton afterSignOutUrl={`/${locale}`} />
        </div>
      ) : (
        <>
          <SignInButton mode="modal">
            <Button
              variant="outline"
              className={isDark ? 'border-zinc-600 bg-transparent text-white hover:bg-zinc-800 hover:text-white' : ''}
            >
              {t('auth.signIn')}
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button className={isDark ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-teal-600 text-white hover:bg-teal-700'}>
              {t('auth.createAccount')}
            </Button>
          </SignUpButton>
        </>
      )}
    </>
  );

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur ${
        isDark ? 'border-zinc-800 bg-zinc-950/95' : 'bg-background/90'
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href={`/${locale}`}
          className={`shrink-0 text-lg font-bold sm:text-xl ${isDark ? 'text-white' : 'text-primary'}`}
        >
          renting.rw
        </Link>

        {/* Desktop: inline nav */}
        <nav className={`hidden items-center gap-2 sm:flex sm:gap-3 ${isDark ? 'text-white' : ''}`}>
          <Link href={`/${locale}/cars`} className={isDark ? 'text-zinc-300 hover:text-white' : ''}>
            {t('nav.cars')}
          </Link>
          <Link href={`/${locale}/drivers`} className={isDark ? 'text-zinc-300 hover:text-white' : ''}>
            {t('nav.drivers')}
          </Link>
          {navContent}
        </nav>

        {/* Mobile: hamburger menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`shrink-0 sm:hidden ${isDark ? 'border-zinc-600 bg-transparent text-white hover:bg-zinc-800' : ''}`}
            >
              <Menu className="h-5 w-5" aria-label="Open menu" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`w-56 ${isDark ? 'border-zinc-800 bg-zinc-900' : ''}`}>
            <div className={`flex flex-col gap-2 p-2 ${isDark ? 'text-white' : ''}`}>
              {isSignedIn ? (
                <DropdownMenuItem
                  onClick={() => setSearchOpen(true)}
                  className={`flex cursor-pointer items-center gap-2 ${
                    isDark ? 'focus:bg-zinc-800 focus:text-white' : 'focus:bg-gray-100'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  {t('app.cta.searchButton')}
                </DropdownMenuItem>
              ) : null}
              <LanguageSelector locale={locale} variant={isDark ? 'dark' : 'light'} />
              {isSignedIn ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${locale}/app`}
                      className={`flex cursor-pointer items-center ${isDark ? 'focus:bg-zinc-800 focus:text-white' : ''}`}
                    >
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
                      <span className="cursor-pointer">{t('auth.signIn')}</span>
                    </DropdownMenuItem>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <DropdownMenuItem asChild>
                      <span className="cursor-pointer">{t('auth.createAccount')}</span>
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
