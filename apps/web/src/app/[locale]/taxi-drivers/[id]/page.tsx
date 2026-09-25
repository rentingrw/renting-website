'use client';

import { Car, Phone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { ProfileHeader } from '@/components/web/profile-header';
import { ShareMenu } from '@/components/web/share-menu';
import { SiteFooter } from '@/components/web/site-footer';
import { TaxiListingCard } from '@/components/web/taxi-listing-card';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { getTaxiDriverById, searchMarketplace, type SearchTaxi, type TaxiDriverPublic } from '@/lib/api';
import { useTranslations } from 'next-intl';

type TaxiDriverPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default function TaxiDriverDetailPage({ params }: TaxiDriverPageProps) {
  const t = useTranslations('web.listing');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [taxiId, setTaxiId] = useState('');
  const [taxi, setTaxi] = useState<TaxiDriverPublic | null>(null);
  const [similar, setSimilar] = useState<SearchTaxi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled) {
        if (isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
        setTaxiId(routeParams.id);
      }
    }
    resolveParams();
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!taxiId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTaxiDriverById(taxiId);
        const similarData = await searchMarketplace({ type: 'taxis', location: data.city, limit: 6 }).catch(() => null);
        if (!cancelled) {
          setTaxi(data);
          setSimilar((similarData?.taxis ?? []).filter((item) => item.id !== data.id).slice(0, 6));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Taxi driver not found.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [taxiId]);

  const photos = taxi
    ? (taxi.photos?.length ? taxi.photos : taxi.photoUrl ? [taxi.photoUrl] : [])
    : [];
  const whatsapp = taxi?.whatsapp?.replace(/\D/g, '') ?? '';

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/${locale}/search?type=taxis`}
          className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Back to search
        </Link>

        {loading ? (
          <div className="mt-6 h-72 animate-pulse rounded-md border-2 border-border bg-muted" />
        ) : error || !taxi ? (
          <p className="mt-6 rounded border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error ?? 'Taxi driver not found.'}
          </p>
        ) : (
          <article className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="p-5">
            <ProfileHeader
              name={taxi.fullName}
              photo={taxi.profilePhotoUrl}
              city={taxi.city}
              trustScore={100}
              actions={
                <>
                  <ShareMenu
                    url={`/${locale}/taxi-drivers/${taxi.id}`}
                    title={taxi.fullName}
                    text={`${taxi.fullName} — taxi in ${taxi.city}. Call ${taxi.phone}.`}
                  />
                  <a
                    href={`tel:${taxi.phone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-1 rounded border-2 border-red-800 bg-red-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {t('contact')}
                  </a>
                </>
              }
            />
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-3 text-sm font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Car className="h-4 w-4 text-red-400" />
                  {taxi.seats} seats
                </span>
                {taxi.carModel ? <span>{taxi.carModel}</span> : null}
                {taxi.vehicleType ? <span className="capitalize">{taxi.vehicleType.replace('_', ' ')}</span> : null}
              </div>

              {taxi.details ? (
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">{taxi.details}</p>
              ) : null}

              {photos.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {photos.slice(0, 4).map((src) => (
                    <div key={src} className="relative h-28 overflow-hidden rounded border border-border">
                      <Image src={src} alt="" fill sizes="200px" className="object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}

              <a
                href={`tel:${taxi.phone.replace(/\s/g, '')}`}
                className="flex w-full items-center justify-center gap-2 rounded border-2 border-red-800 bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700"
              >
                <Phone className="h-4 w-4" />
                {taxi.phone}
              </a>
              {whatsapp ? (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded border-2 border-border bg-card px-4 py-3 text-sm font-black text-foreground transition hover:bg-muted"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </article>
        )}

        {!loading && similar.length > 0 ? (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-black text-foreground">{t('similarTaxis')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {similar.map((item) => (
                <TaxiListingCard key={item.id} taxi={item} locale={locale} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <SiteFooter locale={locale} />
    </main>
  );
}
