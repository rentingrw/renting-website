'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Car,
  Home,
  LogOut,
  MessageSquareWarning,
  Users,
  Wallet,
  Ticket,
  UserCheck,
} from 'lucide-react';

const ITEMS = [
  { href: '', label: 'Overview', icon: Home },
  { href: '/listings', label: 'Listings', icon: Car },
  { href: '/drivers', label: 'Drivers', icon: UserCheck },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/disputes', label: 'Disputes', icon: MessageSquareWarning },
  { href: '/subscriptions', label: 'Subscriptions', icon: Wallet },
  { href: '/promo-codes', label: 'Promo codes', icon: Ticket },
  { href: '/bookings', label: 'Booking desk', icon: BookOpen },
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
    <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-neutral-900 border-r-4 border-neutral-900">
      <div className="flex h-14 items-center border-b-2 border-neutral-700 px-4">
        <span className="text-base font-black tracking-tight text-white">renting.rw</span>
        <span className="ml-2 rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-neutral-900 border border-amber-600">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {ITEMS.map((item) => {
          const href = `/${locale}${item.href}`;
          const active =
            item.href === ''
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={href}
              className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-amber-400 text-neutral-900'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-2 border-neutral-700 p-2">
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm font-semibold text-neutral-400 transition-colors hover:bg-red-900 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
