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
  UserCheck,
} from 'lucide-react';

const ITEMS = [
  { href: '', label: 'Overview', icon: Home },
  { href: '/listings', label: 'Listings', icon: Car },
  { href: '/drivers', label: 'Drivers', icon: UserCheck },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/disputes', label: 'Disputes', icon: MessageSquareWarning },
  { href: '/subscriptions', label: 'Subscriptions', icon: Wallet },
  { href: '/bookings', label: 'Bookings', icon: BookOpen },
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
    <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-base font-bold tracking-tight">renting.rw</span>
        <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
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
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
