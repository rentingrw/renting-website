'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { Camera, Car, MapPin, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';

type RegisterTaxiPageProps = {
  params: Promise<{ locale: string }>;
};

export default function RegisterTaxiPage({ params }: RegisterTaxiPageProps) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    location: '',
    seats: '',
    details: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled && isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
    }
    resolveParams();
    return () => { cancelled = true; };
  }, [params]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/taxi-drivers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          city: form.location,
          seats: Number(form.seats),
          details: form.details || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? 'Registration failed. Please try again.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />

      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <span className="inline-block rounded border-2 border-teal-600 bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-teal-700">
            Become a Taxi Driver
          </span>
          <h1 className="mt-4 text-3xl font-black text-neutral-900">Register Your Taxi</h1>
          <p className="mt-2 text-base font-medium text-neutral-600">
            Join Renting.rw and start getting customers calling you directly across Rwanda.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-md border-2 border-teal-600 bg-teal-50 p-8 text-center shadow-brutal">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-teal-600 bg-teal-600">
              <span className="text-2xl text-white">✓</span>
            </div>
            <h2 className="text-xl font-black text-neutral-900">Registration Submitted!</h2>
            <p className="mt-2 text-sm font-medium text-neutral-600">
              Our team will review your registration and contact you within 24 hours at <strong>{form.phone}</strong>.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-md border-2 border-neutral-900 bg-white p-6 shadow-brutal"
          >
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500">
                <User className="h-3.5 w-3.5" /> Full Name *
              </label>
              <input
                required
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Jean-Claude Mugisha"
                className="w-full rounded border-2 border-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500">
                <Phone className="h-3.5 w-3.5" /> Phone Number (VERY IMPORTANT) *
              </label>
              <input
                required
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+250 788 000 000"
                className="w-full rounded border-2 border-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-teal-600"
              />
              <p className="mt-1 text-xs font-medium text-teal-700">
                This number will be shown to customers so they can call you directly.
              </p>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500">
                <MapPin className="h-3.5 w-3.5" /> Operating Location *
              </label>
              <input
                required
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Kigali, Musanze, Rubavu..."
                className="w-full rounded border-2 border-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500">
                <Car className="h-3.5 w-3.5" /> Number of Seats *
              </label>
              <select
                required
                name="seats"
                value={form.seats}
                onChange={handleChange}
                className="w-full rounded border-2 border-neutral-900 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 focus:outline-none focus:border-teal-600"
              >
                <option value="">Select seats...</option>
                {[4, 5, 6, 7, 8, 9, 10, 12, 14].map((n) => (
                  <option key={n} value={n}>{n} seats</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500">
                <Camera className="h-3.5 w-3.5" /> Additional Details (optional)
              </label>
              <textarea
                name="details"
                value={form.details}
                onChange={handleChange}
                placeholder="Car model, color, special services..."
                rows={3}
                className="w-full rounded border-2 border-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-teal-600 resize-none"
              />
            </div>

            <div className="rounded border-2 border-amber-400 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-800">
                After submitting, our team will verify your registration and activate your profile on Renting.rw.
                You will receive a call from us to confirm within 24 hours.
              </p>
            </div>

            {error && (
              <div className="rounded border-2 border-red-400 bg-red-50 px-4 py-3">
                <p className="text-xs font-bold text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded border-2 border-teal-800 bg-teal-600 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-teal-700 hover:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>
        )}
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
