'use client';

import { Car, ShieldCheck, Star, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  getCarsByOwner,
  getReviewsForUser,
  getUserPublicProfile,
  type SearchCar,
  type UserPublicProfile,
} from '@/lib/api';
import { formatRange, trustTierFromScore } from '@/lib/format';
import { stockImages } from '@/lib/stock-images';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

function Skeleton({ locale }: { locale: SupportedLocale }) {
  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-4xl animate-pulse px-4 py-10 md:px-6">
        <div className="mb-8 flex gap-5 rounded-md border-2 border-neutral-900 bg-white p-6 shadow-brutal">
          <div className="h-24 w-24 shrink-0 rounded-full border-2 border-neutral-900 bg-neutral-200" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-1/2 rounded bg-neutral-200" />
            <div className="h-5 w-1/4 rounded bg-neutral-200" />
            <div className="h-5 w-1/3 rounded bg-neutral-200" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-md border-2 border-neutral-900 bg-neutral-200" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function UserProfilePage({ params }: Props) {
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
      <main className="min-h-screen bg-[#f5f0e8]">
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
  const trustLabel = trustTierFromScore(Number(profile.trustScore));

  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />

      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        {/* Profile card */}
        <section className="mb-8 flex flex-col items-center gap-5 rounded-md border-2 border-neutral-900 bg-white p-6 shadow-brutal sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-neutral-900 bg-teal-50">
            {avatarSrc ? (
              <Image src={avatarSrc} alt={profile.fullName} fill sizes="96px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-10 w-10 text-teal-600" />
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-black text-neutral-900">{profile.fullName}</h1>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="flex items-center gap-1 rounded border-2 border-teal-600 bg-teal-50 px-2.5 py-1 text-sm font-black text-teal-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {trustLabel}
              </span>

              {totalReviews > 0 && (
                <span className="flex items-center gap-1 rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-sm font-black text-neutral-900">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {averageRating?.toFixed(1)}
                  <span className="font-medium text-neutral-500">({totalReviews})</span>
                </span>
              )}

              <span className="rounded border-2 border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-neutral-600">
                {profile.primaryRole.replace('_', ' ')}
              </span>
            </div>

            {/* Driver profile link */}
            {profile.driverProfileId && (
              <div className="mt-3">
                <Link
                  href={`/${locale}/drivers/${profile.driverProfileId}`}
                  className="inline-flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  View Driver Profile
                  {profile.driverPrimaryCity && (
                    <span className="font-medium text-neutral-500">· {profile.driverPrimaryCity}</span>
                  )}
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Car listings */}
        {cars.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-black text-neutral-900">
              Cars listed by {profile.fullName}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car) => {
                const photo = car.photos?.[0] ?? stockImages.carPlaceholder;
                const rateDisplay = car.approximateDailyRateRangeRwf
                  ? formatRange(car.approximateDailyRateRangeRwf.kigali.min, car.approximateDailyRateRangeRwf.kigali.max)
                  : car.dailyRateKigaliRwf
                    ? `${car.dailyRateKigaliRwf.toLocaleString()} RWF`
                    : 'Price on request';

                return (
                  <Link
                    key={car.id}
                    href={`/${locale}/cars/${car.id}`}
                    className="group overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                      <Image
                        src={photo}
                        alt={car.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-black leading-tight text-neutral-900">{car.title}</p>
                      <p className="mt-0.5 text-xs font-semibold text-neutral-500">
                        {car.year} {car.brand} {car.model} · {car.locationText}
                      </p>
                      <p className="mt-1 text-sm font-black text-teal-700">{rateDisplay}/day</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {cars.length === 0 && !profile.driverProfileId && (
          <p className="text-center text-sm font-medium text-neutral-500">
            No public listings yet.
          </p>
        )}
      </div>

      <SiteFooter locale={locale} />
    </main>
  );
}
