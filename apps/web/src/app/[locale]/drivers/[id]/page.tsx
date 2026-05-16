'use client';

import { useAuth } from '@clerk/nextjs';
import {
  BriefcaseBusiness,
  Car,
  ChevronRight,
  CreditCard,
  Heart,
  Languages,
  MapPinned,
  ShieldCheck,
  Star,
  ThumbsUp,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { BookingRequestDialog } from '@/components/web/booking-request-dialog';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { getDriverById, getReviewsForUser, type DriverDetail } from '@/lib/api';
import { formatCurrencyRwf, formatRange, trustTierFromScore } from '@/lib/format';
import { stockImages } from '@/lib/stock-images';

type DriverPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function DetailSkeleton({ locale }: { locale: SupportedLocale }) {
  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 md:px-6">
        <div className="mb-8 flex gap-4 rounded-md border-2 border-neutral-900 bg-white p-6 shadow-brutal">
          <div className="h-32 w-32 shrink-0 rounded-full border-2 border-neutral-900 bg-neutral-200" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-2/3 rounded bg-neutral-200" />
            <div className="h-5 w-1/3 rounded bg-neutral-200" />
            <div className="flex gap-2">
              {[1, 2].map((i) => <div key={i} className="h-7 w-24 rounded bg-neutral-200" />)}
            </div>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-32 w-full rounded bg-neutral-200" />
            <div className="h-48 w-full rounded bg-neutral-200" />
          </div>
          <div className="h-96 w-full rounded bg-neutral-200" />
        </div>
      </div>
    </main>
  );
}

export default function DriverDetailPage({ params }: DriverPageProps) {
  const t = useTranslations('web');
  const { isSignedIn, getToken } = useAuth();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [driverId, setDriverId] = useState('');
  const [detail, setDetail] = useState<DriverDetail | null>(null);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof getReviewsForUser>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled) {
        if (isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
        setDriverId(routeParams.id);
      }
    }
    resolveParams();
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      if (!driverId) return;
      setLoading(true);
      setError(null);
      try {
        const token = isSignedIn ? await getToken() : null;
        const data = await getDriverById(driverId, token ?? undefined);
        const reviewsData = await getReviewsForUser(data.userId);
        if (!cancelled) {
          setDetail(data);
          setReviews(reviewsData);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : t('detail.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetails();
    return () => { cancelled = true; };
  }, [driverId, getToken, isSignedIn, t]);

  if (loading) return <DetailSkeleton locale={locale} />;

  if (!detail || error) {
    return (
      <main className="min-h-screen bg-[#f5f0e8]">
        <AppHeader locale={locale} variant="default" />
        <div className="mx-auto max-w-5xl p-8">
          <p className="rounded-md border-2 border-red-600 bg-red-50 p-4 font-semibold text-red-700">
            {error ?? t('detail.notFound')}
          </p>
        </div>
      </main>
    );
  }

  const dailyRate =
    detail.dailyRateRwf !== undefined
      ? formatCurrencyRwf(detail.dailyRateRwf)
      : detail.approximateRateRangeRwf
        ? formatRange(detail.approximateRateRangeRwf.daily.min, detail.approximateRateRangeRwf.daily.max)
        : t('home.priceUnavailable');

  const profilePhoto = detail.profilePhotoUrl ?? stockImages.drivers[0];
  const categories = detail.categories?.length ? detail.categories : [detail.driverCategory?.replace('_', ' ') ?? ''];

  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Hero: profile photo + name + trust badge */}
        <section className="mb-8 flex flex-col items-center gap-5 rounded-md border-2 border-neutral-900 bg-white p-6 shadow-brutal sm:flex-row sm:items-start">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-2 border-neutral-900 bg-neutral-100">
            <Image
              src={profilePhoto}
              alt={detail.fullName}
              fill
              priority
              sizes="128px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-black text-neutral-900 md:text-3xl">{detail.fullName}</h1>
            <p className="mt-1 font-medium text-neutral-600">{detail.primaryCity}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {reviews && reviews.totalReviews > 0 && (
                <span className="flex items-center gap-1 rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-sm font-black text-neutral-900">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {reviews.averageRating?.toFixed(1)}
                  <span className="font-medium text-neutral-500">({reviews.totalReviews} {t('detail.trips')})</span>
                </span>
              )}
              <span className="flex items-center gap-1 rounded border-2 border-teal-600 bg-teal-50 px-2.5 py-1 text-sm font-black text-teal-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {trustTierFromScore(detail.trustScore)}
              </span>
              <span className="rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-sm font-black text-neutral-700">
                {detail.yearsExperience} {t('driver.yearsExperience')}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded border-2 border-neutral-300 bg-neutral-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-neutral-700"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Bio */}
            {detail.biography && (
              <div>
                <h2 className="mb-2 text-lg font-black text-neutral-900">{t('driver.profile')}</h2>
                <p className="text-sm font-medium text-neutral-600">{detail.biography}</p>
              </div>
            )}

            {/* Spec tags */}
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                <BriefcaseBusiness className="h-4 w-4 text-neutral-500" />
                {detail.yearsExperience} {t('driver.yearsExperience')}
              </span>
              {detail.languages?.length > 0 && (
                <span className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                  <Languages className="h-4 w-4 text-neutral-500" />
                  {detail.languages.join(', ')}
                </span>
              )}
              {detail.vehicleTypes?.length > 0 && (
                <span className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                  <Car className="h-4 w-4 text-neutral-500" />
                  {detail.vehicleTypes.join(', ')}
                </span>
              )}
              <span className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                {t('driver.completedTrips', { count: detail.completedTrips })}
              </span>
            </div>

            {/* Service areas */}
            {detail.serviceAreas?.length > 0 && (
              <div>
                <h2 className="mb-2 text-lg font-black text-neutral-900">Service areas</h2>
                <div className="flex items-start gap-2 text-sm font-medium text-neutral-600">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <p>{detail.serviceAreas.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Certifications */}
            {detail.certifications?.length > 0 && (
              <div>
                <h2 className="mb-2 text-lg font-black text-neutral-900">{t('driver.certifications')}</h2>
                <ul className="space-y-2">
                  {detail.certifications.map((cert) => (
                    <li key={cert} className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="mb-3 text-lg font-black text-neutral-900">{t('detail.reviews')}</h2>
              <div className="rounded-md border-2 border-neutral-900 bg-white p-4 shadow-brutal-xs">
                {reviews && reviews.totalReviews > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-black text-neutral-900">{reviews.averageRating?.toFixed(1)}</span>
                      </div>
                      <span className="text-neutral-400">·</span>
                      <span className="font-medium text-neutral-600">{reviews.totalReviews} {t('detail.reviewsCount')}</span>
                    </div>
                    <ul className="space-y-3">
                      {reviews.reviews.slice(0, 5).map((r) => (
                        <li key={r.id} className="rounded border-2 border-neutral-200 bg-neutral-50 p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-black text-neutral-900">{r.fromUser.fullName}</span>
                            <span className="flex items-center gap-0.5 font-semibold text-amber-500">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              {r.rating}
                            </span>
                            <span className="text-xs font-medium text-neutral-400">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {r.comment ? <p className="mt-1 text-sm font-medium text-neutral-600">{r.comment}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-neutral-500">{t('detail.reviewsPending')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right column — sticky booking summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-md border-2 border-neutral-900 bg-white shadow-brutal">
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-2xl font-black text-neutral-900">{dailyRate}</p>
                  <p className="text-sm font-medium text-neutral-500">{t('driver.dailyRate')} · {t('detail.beforeTaxes')}</p>
                </div>

                {detail.hourlyRateRwf != null && (
                  <div className="flex items-center justify-between rounded border-2 border-neutral-200 bg-neutral-50 px-3 py-2">
                    <span className="text-sm font-black text-neutral-700">{t('driver.hourlyRate')}</span>
                    <span className="text-sm font-black text-teal-700">{formatCurrencyRwf(detail.hourlyRateRwf)}</span>
                  </div>
                )}
                {detail.weeklyRateRwf != null && (
                  <div className="flex items-center justify-between rounded border-2 border-neutral-200 bg-neutral-50 px-3 py-2">
                    <span className="text-sm font-black text-neutral-700">{t('driver.weeklyRate')}</span>
                    <span className="text-sm font-black text-teal-700">{formatCurrencyRwf(detail.weeklyRateRwf)}</span>
                  </div>
                )}

                <div className="rounded border-2 border-neutral-200 bg-neutral-50 p-3">
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-neutral-500">{t('detail.yourTrip')}</h3>
                  <p className="text-sm font-medium text-neutral-600">{t('detail.tripStart')} / {t('detail.tripEnd')}</p>
                  <p className="mt-1 text-xs font-medium text-neutral-400">Set dates and pickup when you request a booking.</p>
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-neutral-500">{t('detail.pickupReturn')}</h3>
                  <p className="text-sm font-medium text-neutral-700">{detail.primaryCity}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="w-full rounded border-2 border-teal-800 bg-teal-600 py-3 text-sm font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  {t('detail.continue')}
                </button>

                <div className="space-y-3 border-t-2 border-neutral-100 pt-4">
                  <div className="flex items-start gap-2">
                    <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-sm font-black text-neutral-900">{t('detail.cancellationPolicy')}</p>
                      <p className="text-xs font-medium text-neutral-600">{t('detail.freeCancellation')}</p>
                      <p className="text-xs font-medium text-neutral-400">{t('detail.cancellationNote')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-sm font-black text-neutral-900">{t('detail.paymentOptions')}</p>
                      <p className="text-xs font-medium text-neutral-600">{t('detail.flexiblePayment')}</p>
                      <p className="text-xs font-medium text-neutral-400">{t('detail.paymentNote')}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded border-2 border-neutral-900 bg-white py-2 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  <Heart className="h-4 w-4" />
                  Add to favorites
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter locale={locale} />

      <BookingRequestDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        target={{
          mode: 'driver',
          id: detail.userId,
          title: detail.fullName,
          ownerLabel: `${t('driver.primaryCity')}: ${detail.primaryCity}`,
          defaultCategory: detail.driverCategory,
          exactDailyRate: detail.dailyRateRwf,
        }}
      />
    </main>
  );
}
