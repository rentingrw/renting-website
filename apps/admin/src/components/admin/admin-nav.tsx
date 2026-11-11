'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Car,
  Home,
  LogOut,
  Menu,
  MessageSquareWarning,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

const ITEMS = [
  { href: '', label: 'Overview', icon: Home },
  { href: '/listings', label: 'Cars', icon: Car },
  { href: '/drivers', label: 'Drivers', icon: UserCheck },
  { href: '/taxis', label: 'Taxi', icon: Truck },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/disputes', label: 'Disputes', icon: MessageSquareWarning },
  { href: '/bookings', label: 'Booking desk', icon: BookOpen },
  { href: '/jobs', label: 'Careers', icon: Briefcase },
];

export function AdminNav() {
  const pathname = usePathname();
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    function sync() {
      setIsDesktop(media.matches);
      if (media.matches) setOpen(false);
    }
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const onSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-ink px-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full p-1.5 transition hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href={`/${locale}`} className="truncate text-base font-black tracking-tight">
          Renting.rw
        </Link>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          Admin
        </span>
      </header>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        aria-hidden={isDesktop ? undefined : !open}
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col overflow-hidden bg-ink text-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="aurora-blob -left-16 -top-20 h-52 w-52 bg-[#2f8f5b]" style={{ opacity: 0.35 }} />
          <div className="aurora-blob -bottom-24 -right-12 h-48 w-48 bg-[#d4a017]" style={{ opacity: 0.15 }} />
          <div className="admin-sidebar-grid absolute inset-0" />
        </div>
        <div className="relative flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <Link href={`/${locale}`} className="truncate text-base font-black tracking-tight text-white">
            Renting.rw
          </Link>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Admin
          </span>
          <button
            type="button"
            className="ml-auto rounded-full p-1.5 text-white/80 transition hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Marketplace
          </p>
          {ITEMS.map((item) => {
            const href = `/${locale}${item.href}`;
            const active =
              item.href === ''
                ? pathname === href || pathname === `/${locale}/`
                : pathname === href || pathname.startsWith(`${href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-ink shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-white/10 p-2">
          <p className="px-3 pb-2 text-[10px] font-medium leading-snug text-white/40">
            Cars, drivers, taxi &amp; airport transfers · hosts keep 90%
          </p>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
