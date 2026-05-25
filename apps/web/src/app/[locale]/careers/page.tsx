'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { Briefcase, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

type CareersPageProps = {
  params: Promise<{ locale: string }>;
};

const OPEN_POSITIONS = [
  {
    title: 'Customer Support Agent',
    type: 'Full-time',
    location: 'Kigali, Rwanda',
    description: 'Help our customers get the best experience — answer calls, resolve issues, and ensure satisfaction across all platforms.',
  },
  {
    title: 'Driver Verification Officer',
    type: 'Contract',
    location: 'Multiple cities, Rwanda',
    description: 'Verify driver profiles, conduct background checks, and ensure all drivers meet Renting.rw standards.',
  },
  {
    title: 'Business Development Representative',
    type: 'Full-time',
    location: 'Kigali, Rwanda',
    description: 'Grow our network of car hosters and drivers across Rwanda. Build partnerships and onboard new partners.',
  },
  {
    title: 'Mobile App Developer',
    type: 'Full-time (Remote)',
    location: 'Rwanda / Remote',
    description: 'Build and improve the Renting.rw mobile app. React Native experience required.',
  },
];

export default function CareersPage({ params }: CareersPageProps) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

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

      <section className="border-b-2 border-neutral-900 bg-neutral-900 px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-amber-400 bg-amber-400 shadow-brutal">
              <Briefcase className="h-8 w-8 text-neutral-900" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white md:text-4xl">Careers at Renting.rw</h1>
          <p className="mt-4 text-base font-medium text-neutral-400">
            Join our mission to make renting easy and fast across Rwanda. We&apos;re building the future of mobility.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="text-xl font-black text-neutral-900">Open Positions</h2>
        <p className="mt-1 text-sm font-medium text-neutral-500">
          {OPEN_POSITIONS.length} position{OPEN_POSITIONS.length !== 1 ? 's' : ''} available
        </p>

        <div className="mt-6 space-y-4">
          {OPEN_POSITIONS.map((position) => (
            <div
              key={position.title}
              className="rounded-md border-2 border-neutral-900 bg-white p-6 shadow-brutal"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-neutral-900">{position.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded border-2 border-teal-600 bg-teal-50 px-2 py-0.5 font-black text-teal-700">
                      {position.type}
                    </span>
                    <span className="rounded border-2 border-neutral-300 bg-neutral-50 px-2 py-0.5 font-black text-neutral-600">
                      {position.location}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-neutral-600">{position.description}</p>
                </div>
                <a
                  href={`mailto:renting.rw@gmail.com?subject=Application: ${encodeURIComponent(position.title)}`}
                  className="shrink-0 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  Apply Now
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-md border-2 border-neutral-900 bg-amber-50 p-6 shadow-brutal">
          <h2 className="font-black text-neutral-900">Don&apos;t see your role?</h2>
          <p className="mt-2 text-sm font-medium text-neutral-600">
            We&apos;re always looking for talented people. Send us your CV and let us know how you can contribute.
          </p>
          <a
            href="mailto:renting.rw@gmail.com?subject=Open Application"
            className="mt-4 inline-flex items-center gap-2 rounded border-2 border-neutral-900 bg-amber-400 px-5 py-2.5 text-sm font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            <Mail className="h-4 w-4" />
            Send Open Application
          </a>
        </div>
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
