'use client';

import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import {
  Car,
  Heart,
  Home,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Menu,
  UserPlus,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentingi/ui';
import { type SupportedLocale } from '@/i18n/routing';
import { LanguageSelector } from './language-selector';

type AppHeaderProps = {
  locale: SupportedLocale;
  variant?: 'default' | 'dark';
};

export function AppHeader({ locale, variant = 'default' }: AppHeaderProps) {
  const t = useTranslations('web');
  const { isSignedIn } = useAuth();
  const isDark = variant === 'dark';

  const menuItems = [
    { href: `/${locale}/list-your-car`, label: t('nav.becomeHoster'), icon: Home },
    { href: `/${locale}/drive-with-us`, label: t('nav.becomeDriver'), icon: Car },
    { href: `/${locale}/taxi-drivers/register`, label: t('nav.becomeTaxi'), icon: Zap },
  ];

  const userMenuItems = isSignedIn
    ? [
        { href: `/${locale}/app`, label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: `/${locale}/app/favorites`, label: t('nav.favorites'), icon: Heart },
        { href: `/${locale}/app?section=messages`, label: t('nav.inbox'), icon: Inbox },
      ]
    : [];

  const infoItems = [
    { href: `/${locale}/how-it-works`, label: t('nav.whyRenting'), icon: HelpCircle },
  ];

  const ExtendedMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`shrink-0 rounded border-2 p-1.5 ${
            isDark
              ? 'border-zinc-600 text-white hover:bg-zinc-800'
              : 'border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-100'
          }`}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`w-60 border-2 border-neutral-900 shadow-brutal ${isDark ? 'bg-zinc-900' : 'bg-white'}`}
      >
        <div className="px-2 py-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Join as</p>
        </div>
        {menuItems.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link
              href={href}
              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm font-bold ${
                isDark ? 'text-white hover:bg-zinc-800' : 'text-neutral-800 hover:bg-neutral-100'
              }`}
            >
              <Icon className="h-4 w-4 text-teal-600" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}

        {userMenuItems.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-1 border-neutral-200" />
            <div className="px-2 py-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">My Account</p>
            </div>
            {userMenuItems.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} asChild>
                <Link
                  href={href}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm font-bold ${
                    isDark ? 'text-white hover:bg-zinc-800' : 'text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="h-4 w-4 text-teal-600" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator className="my-1 border-neutral-200" />
        {infoItems.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link
              href={href}
              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm font-bold ${
                isDark ? 'text-white hover:bg-zinc-800' : 'text-neutral-800 hover:bg-neutral-100'
              }`}
            >
              <Icon className="h-4 w-4 text-neutral-500" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}

        {!isSignedIn && (
          <>
            <DropdownMenuSeparator className="my-1 border-neutral-200" />
            <div className="flex flex-col gap-1 p-2">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded border-2 border-neutral-900 px-3 py-1.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100"
                >
                  {t('auth.signIn')}
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded border-2 border-teal-800 bg-teal-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-teal-700"
                >
                  {t('auth.createAccount')}
                </button>
              </SignUpButton>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className={`sticky top-0 z-50 ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-neutral-900 bg-white'}`}>
      {/* Earning Banner */}
      <div className="border-b-2 border-amber-500 bg-amber-400 px-4 py-2 text-center">
        <p className="text-xs font-black text-neutral-900 sm:text-sm">
          {t('header.earningBanner')}{' '}
          <Link href={`/${locale}/list-your-car`} className="underline decoration-2 hover:text-neutral-700">
            {t('header.earningBannerCta')}
          </Link>
        </p>
      </div>

      {/* Main nav */}
      <div className={`border-b-2 ${isDark ? 'border-zinc-800' : 'border-neutral-900'}`}>
        <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
          <Link
            href={`/${locale}`}
            className={`shrink-0 text-lg font-black tracking-tight sm:text-xl ${isDark ? 'text-white' : 'text-neutral-900'}`}
          >
            Renting.rw
          </Link>

          {/* Desktop nav links */}
          <nav className={`hidden items-center gap-4 sm:flex ${isDark ? 'text-white' : ''}`}>
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
            <Link
              href={`/${locale}/taxi-drivers`}
              className={`text-sm font-bold transition-colors ${isDark ? 'text-zinc-300 hover:text-white' : 'text-neutral-700 hover:text-teal-600'}`}
            >
              {t('nav.taxi')}
            </Link>
            <Link
              href={`/${locale}/stays`}
              className={`text-sm font-bold transition-colors ${isDark ? 'text-zinc-300 hover:text-white' : 'text-neutral-700 hover:text-teal-600'}`}
            >
              {t('nav.stays')}
            </Link>

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
                <ExtendedMenu />
              </div>
            ) : (
              <div className="flex items-center gap-2">
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
                <ExtendedMenu />
              </div>
            )}
          </nav>

          {/* Mobile: sign-in + hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            {isSignedIn ? (
              <>
                <UserButton afterSignOutUrl={`/${locale}`} />
                <ExtendedMenu />
              </>
            ) : (
              <ExtendedMenu />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
