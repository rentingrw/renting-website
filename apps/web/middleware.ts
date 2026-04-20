import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'rw', 'fr'] as const;
const CAR_DETAIL_ROUTE = /^\/cars\/[^/]+$/;
const DRIVER_DETAIL_ROUTE = /^\/drivers\/[^/]+$/;

function stripLocalePrefix(pathname: string): string {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname === `/${locale}` || pathname === `/${locale}/`) {
      return '/';
    }

    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }

  return pathname;
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/' || pathname === '/search') {
    return true;
  }

  return CAR_DETAIL_ROUTE.test(pathname) || DRIVER_DETAIL_ROUTE.test(pathname);
}

const DEFAULT_LOCALE = 'en';

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Redirect / to locale from cookie or default
  if (pathname === '/' || pathname === '') {
    const localeCookie = req.cookies.get('NEXT_LOCALE')?.value;
    const locale =
      localeCookie && SUPPORTED_LOCALES.includes(localeCookie as (typeof SUPPORTED_LOCALES)[number])
        ? localeCookie
        : DEFAULT_LOCALE;
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  const normalizedPathname = stripLocalePrefix(pathname);

  if (!isPublicRoute(normalizedPathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/'],
};
