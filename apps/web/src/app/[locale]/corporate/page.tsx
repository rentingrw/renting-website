'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { IllustrationCorporate } from '@/components/web/illustrations';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { BadgeCheck, Building2, Car, Clock, Mail, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function CorporatePage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  return (
    <main className="flex min-h-screen flex-col">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-700 to-teal-900 px-4 py-12 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <Building2 className="mb-4 h-12 w-12 text-teal-200 mx-auto md:mx-0" />
            <h1 className="text-4xl font-extrabold sm:text-5xl">Corporate Solutions</h1>
            <p className="mt-4 max-w-lg text-lg text-teal-100">
              Reliable, managed transportation for businesses, NGOs, embassies, and corporate teams
              operating in Rwanda.
            </p>
          </div>
          <IllustrationCorporate className="w-full max-w-[260px] shrink-0" />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">What We Offer</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Car className="h-8 w-8 text-teal-600" />,
              title: 'Fleet Access',
              desc: 'Access a curated fleet of executive vehicles, minibuses, and standard cars for any business need.',
            },
            {
              icon: <BadgeCheck className="h-8 w-8 text-teal-600" />,
              title: 'Vetted Drivers',
              desc: 'All drivers are verified, professionally trained, and experienced with corporate clients.',
            },
            {
              icon: <Clock className="h-8 w-8 text-teal-600" />,
              title: 'On-Demand or Scheduled',
              desc: 'Book on-demand or set up recurring trips. We adapt to your team\'s schedule.',
            },
            {
              icon: <Building2 className="h-8 w-8 text-teal-600" />,
              title: 'Centralized Billing',
              desc: 'Monthly invoicing for your accounts team. No need for individual expense claims.',
            },
            {
              icon: <Mail className="h-8 w-8 text-teal-600" />,
              title: 'Dedicated Account Manager',
              desc: 'Corporate clients get a named point of contact for all bookings and issues.',
            },
            {
              icon: <Phone className="h-8 w-8 text-teal-600" />,
              title: 'Priority Support',
              desc: 'Corporate accounts get priority response from our support team — day and night.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-3">{item.icon}</div>
              <h3 className="mb-2 font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who we serve */}
      <section className="bg-gray-50 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Who We Serve</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              'NGOs & Development Agencies',
              'Embassies & Diplomats',
              'Hotels & Hospitality',
              'Event Organizers',
              'Tour Companies',
              'Corporate Offices',
            ].map((c) => (
              <div key={c} className="rounded-xl border bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="mb-3 text-2xl font-bold text-gray-900">Get a Corporate Quote</h2>
        <p className="mb-6 text-gray-600">
          Contact our team to discuss your requirements. We&apos;ll prepare a tailored solution and
          pricing for your organization.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="tel:+250788781648"
            className="flex items-center gap-2 rounded-full bg-teal-600 px-7 py-3 font-semibold text-white hover:bg-teal-700"
          >
            <Phone className="h-4 w-4" /> 0788 781 648
          </a>
          <a
            href="mailto:renting.rw@gmail.com"
            className="flex items-center gap-2 rounded-full border border-teal-600 px-7 py-3 font-semibold text-teal-600 hover:bg-teal-50"
          >
            <Mail className="h-4 w-4" /> renting.rw@gmail.com
          </a>
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
