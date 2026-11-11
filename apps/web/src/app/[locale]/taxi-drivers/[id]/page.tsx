'use client';

import { Car, Check, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { MediaImage } from '@/components/web/media-image';
import { ProfileHeader } from '@/components/web/profile-header';
import { ShareMenu } from '@/components/web/share-menu';
import { SiteFooter } from '@/components/web/site-footer';
import { TaxiListingCard } from '@/components/web/taxi-listing-card';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { getTaxiDriverById, searchMarketplace, type SearchTaxi, type TaxiDriverPublic } from '@/lib/api';
import { TAXI_LANGUAGE_OPTIONS } from '@/lib/taxi-features';
import { useTranslations } from 'next-intl';

type TaxiDriverPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function languageLabel(code: string) {
  return TAXI_LANGUAGE_OPTIONS.find((item) => item.value === code)?.label ?? code;
}

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
  const showPhone = taxi?.contactPhoneEnabled !== false && taxi?.phone;
  const showWhatsapp = taxi?.contactWhatsappEnabled !== false && whatsapp;
  const locationLine = taxi?.workLocationText?.trim() || taxi?.city;

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
                city={locationLine}
                trustScore={100}
                actions={
                  <ShareMenu
                    url={`/${locale}/taxi-drivers/${taxi.id}`}
                    title={taxi.fullName}
                    text={`${taxi.fullName} — taxi in ${locationLine}.`}
                  />
                }
              />
            </div>

            <div className="space-y-5 p-5">
              {taxi.languages?.length ? (
                <div>
                  <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-muted-foreground">Languages</h2>
                  <p className="text-sm font-medium text-foreground">
                    {taxi.languages.map(languageLabel).join(' · ')}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 text-sm font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1 capitalize">
                  <Car className="h-4 w-4 text-red-400" />
                  {taxi.vehicleType?.replace(/_/g, ' ') ?? 'Vehicle'}
                </span>
                {taxi.seats ? <span>{taxi.seats} seats</span> : null}
                {locationLine ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-brand" />
                    {locationLine}
                  </span>
                ) : null}
              </div>

              {taxi.features?.length ? (
                <div>
                  <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-muted-foreground">Car features</h2>
                  <ul className="flex flex-wrap gap-2">
                    {taxi.features.map((f) => (
                      <li
                        key={f}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground"
                      >
                        <Check className="h-3 w-3 text-brand" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {taxi.details ? (
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">{taxi.details}</p>
              ) : null}

              {photos.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {photos.slice(0, 5).map((src, index) => (
                    <div key={`${src}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded border border-border bg-muted">
                      <MediaImage src={src} alt="" fill sizes="200px" className="object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 pt-2">
                {showPhone ? (
                  <a
                    href={`tel:${taxi.phone.replace(/\s/g, '')}`}
                    className="flex w-full items-center justify-center gap-2 rounded border-2 border-red-800 bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700"
                  >
                    <Phone className="h-4 w-4" />
                    {t('contact')} · {taxi.phone}
                  </a>
                ) : null}
                {showWhatsapp ? (
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
            </div>
          </article>
        )}

        {!loading && similar.length > 0 ? (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-black text-foreground">{t('similarTaxis')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {similar.map((item) => (
                <TaxiListingCard key={item.id} taxi={item} locale={locale} size="medium" />
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <SiteFooter locale={locale} />
    </main>
  );
}
