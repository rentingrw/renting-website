'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { CarListingCard } from '@/components/web/car-listing-card';
import { ProfileHeader } from '@/components/web/profile-header';
import { ShareMenu } from '@/components/web/share-menu';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  getCarsByOwner,
  getReviewsForUser,
  getUserPublicProfile,
  type SearchCar,
  type UserPublicProfile,
} from '@/lib/api';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function Skeleton({ locale }: { locale: SupportedLocale }) {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-4xl animate-pulse px-4 py-10 md:px-6">
        <div className="mb-8 flex gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="h-24 w-24 shrink-0 rounded-full border-2 border-border bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-1/2 rounded bg-muted" />
            <div className="h-5 w-1/4 rounded bg-muted" />
            <div className="h-5 w-1/3 rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-md border-2 border-border bg-muted" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function UserProfilePage({ params }: Props) {
  const t = useTranslations('web.listing');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [cars, setCars] = useState<SearchCar[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const p = await params;
      if (!cancelled) {
        if (isSupportedLocale(p.locale)) setLocale(p.locale);
        setUserId(p.id);
      }
    }
    void resolveParams();
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [userProfile, carListings, reviews] = await Promise.all([
          getUserPublicProfile(userId),
          getCarsByOwner(userId),
          getReviewsForUser(userId).catch(() => null),
        ]);
        if (!cancelled) {
          setProfile(userProfile);
          setCars(carListings);
          if (reviews) {
            setAverageRating(reviews.averageRating);
            setTotalReviews(reviews.totalReviews);
          }
        }
      } catch {
        if (!cancelled) setError('User not found.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <Skeleton locale={locale} />;

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-background">
        <AppHeader locale={locale} variant="default" />
        <div className="mx-auto max-w-4xl p-8">
          <p className="rounded-md border-2 border-red-600 bg-red-50 p-4 font-semibold text-red-700">
            {error ?? 'User not found.'}
          </p>
        </div>
      </main>
    );
  }

  const avatarSrc = profile.avatarUrl ?? null;

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />

      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <ProfileHeader
          name={profile.fullName}
          photo={avatarSrc}
          city={profile.driverPrimaryCity}
          trustScore={Number(profile.trustScore)}
          rating={averageRating}
          reviewCount={totalReviews}
          actions={
            <>
              <ShareMenu url={`/${locale}/users/${profile.id}`} title={profile.fullName} />
              {profile.driverProfileId ? (
                <Link
                  href={`/${locale}/drivers/${profile.driverProfileId}`}
                  className="rounded border-2 border-border bg-card px-4 py-2 text-sm font-black text-foreground"
                >
                  {t('viewDriverProfile')}
                </Link>
              ) : null}
            </>
          }
        />

        {profile.recentTrustEvents && profile.recentTrustEvents.length > 0 ? (
          <section className="mb-8 rounded-md border-2 border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">{t('trustHistory')}</h2>
            <ul className="space-y-2">
              {profile.recentTrustEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">{event.type.replace(/_/g, ' ')}</span>
                  <span className={`font-black ${event.delta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {event.delta > 0 ? '+' : ''}{event.delta}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cars.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-black text-foreground">
              {t('carsListedBy', { name: profile.fullName })}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car) => (
                <CarListingCard
                  key={car.id}
                  car={car}
                  locale={locale}
                  favorited={false}
                  onFavoriteChange={() => undefined}
                />
              ))}
            </div>
          </section>
        )}

        {cars.length === 0 && !profile.driverProfileId && (
          <p className="text-center text-sm font-medium text-muted-foreground">
            {t('noListings')}
          </p>
        )}
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
