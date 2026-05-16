'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';

const ITEMS = [
  { href: '', label: 'Overview' },
  { href: '/listings', label: 'Listings' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/users', label: 'Users' },
  { href: '/disputes', label: 'Disputes' },
  { href: '/subscriptions', label: 'Subscriptions' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/analytics', label: 'Analytics' },
];

export function AdminNav() {
  const pathname = usePathname();
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const router = useRouter();

  const onSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/${locale}`} className="mr-2 text-lg font-bold">
            renting.rw Admin
          </Link>
          {ITEMS.map((item) => {
            const href = `/${locale}${item.href}`;
            const active =
              item.href === ''
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.label}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  active ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
