'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { BedDouble, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

type StaysPageProps = {
  params: Promise<{ locale: string }>;
};

const LAUNCH_DATE = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function tick() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}

export default function StaysPage({ params }: StaysPageProps) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled && isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
    }
    resolveParams();
    return () => { cancelled = true; };
  }, [params]);

  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />

      <section className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-md border-2 border-neutral-900 bg-teal-400 shadow-brutal">
              <BedDouble className="h-12 w-12 text-neutral-900" />
            </div>
          </div>

          <span className="inline-block rounded border-2 border-amber-500 bg-amber-400 px-4 py-1 text-xs font-black uppercase tracking-widest text-neutral-900">
            Coming Soon
          </span>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-neutral-900 md:text-5xl">
            Stays in Rwanda
          </h1>
          <p className="mt-4 text-lg font-medium text-neutral-600">
            Book hotels, guesthouses, and short-term rentals across Rwanda — all in one place.
            We&apos;re working hard to bring this to you soon.
          </p>

          {/* Countdown timer */}
          <div className="mt-12">
            <div className="mb-4 flex items-center justify-center gap-2 text-sm font-bold text-neutral-500">
              <Clock className="h-4 w-4" />
              Launching in
            </div>
            <div className="flex items-start justify-center gap-4">
              {[
                { value: days, label: 'Days' },
                { value: hours, label: 'Hours' },
                { value: minutes, label: 'Minutes' },
                { value: seconds, label: 'Seconds' },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-neutral-900 bg-white shadow-brutal">
                    <span className="text-3xl font-black tabular-nums text-neutral-900">
                      {String(value).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="mt-2 text-xs font-black uppercase tracking-widest text-neutral-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-md border-2 border-neutral-900 bg-white p-6 shadow-brutal text-left">
            <h2 className="text-lg font-black text-neutral-900">What to expect</h2>
            <ul className="mt-4 space-y-3 text-sm font-medium text-neutral-600">
              {[
                'Browse verified hotels, guesthouses & vacation rentals across Rwanda',
                'Instant or request-based bookings with flexible payment',
                'Reviews and ratings from real guests',
                'Direct contact with property owners',
                '24/7 customer support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-teal-600 bg-teal-50 flex items-center justify-center text-xs font-black text-teal-700">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
