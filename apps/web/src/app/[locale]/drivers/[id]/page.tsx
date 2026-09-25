'use client';

import { useAuth } from '@clerk/nextjs';
import {
  BriefcaseBusiness,
  Car,
  ChevronRight,
  CreditCard,
  Languages,
  MapPinned,
  Phone,
  ShieldCheck,
  Star,
  ThumbsUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import Link from 'next/link';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { BookingRequestDialog } from '@/components/web/booking-request-dialog';
import { FavoriteButton } from '@/components/web/favorite-button';
import { ShareMenu } from '@/components/web/share-menu';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { getDriverById, getReviewsForUser, getDriverFavorites, searchMarketplace, type DriverDetail, type SearchDriver } from '@/lib/api';
import { formatCurrencyRwf, formatRange } from '@/lib/format';
import { ProfileHeader } from '@/components/web/profile-header';
import { DriverListingCard } from '@/components/web/driver-listing-card';

type DriverPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function DetailSkeleton({ locale }: { locale: SupportedLocale }) {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 md:px-6">
        <div className="mb-8 flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="h-32 w-32 shrink-0 rounded-full border-2 border-border bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-5 w-1/3 rounded bg-muted" />
            <div className="flex gap-2">
              {[1, 2].map((i) => <div key={i} className="h-7 w-24 rounded bg-muted" />)}
            </div>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-32 w-full rounded bg-muted" />
            <div className="h-48 w-full rounded bg-muted" />
          </div>
          <div className="h-96 w-full rounded bg-muted" />
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
  const [isFavorited, setIsFavorited] = useState(false);
  const [similar, setSimilar] = useState<SearchDriver[]>([]);

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
        const [reviewsData, similarData] = await Promise.all([
          getReviewsForUser(data.userId).catch(() => null),
          searchMarketplace({ type: 'drivers', location: data.primaryCity, limit: 6 }).catch(() => null),
        ]);
        if (!cancelled) {
          setDetail(data);
          if (reviewsData) setReviews(reviewsData);
          setSimilar((similarData?.drivers ?? []).filter((item) => item.id !== data.id).slice(0, 6));
          if (token) {
            getDriverFavorites(token).then((favs) => {
              if (!cancelled) setIsFavorited(favs.some((f) => f.driverProfile.id === data.id));
            }).catch(() => null);
          }
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
      <main className="min-h-screen bg-background">
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

  const categories = detail.categories?.length ? detail.categories : [detail.driverCategory?.replace('_', ' ') ?? ''];
  const bookedNow = Boolean(detail.isBookedNow);
  const bookLabel = bookedNow ? t('detail.unavailable') : t('booking.requestButton');

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Hero: profile photo + name + trust badge */}
        <ProfileHeader
          name={detail.fullName}
          photo={detail.profilePhotoUrl}
          city={detail.primaryCity}
          trustScore={detail.trustScore}
          rating={reviews?.averageRating ?? detail.rating}
          reviewCount={reviews?.totalReviews ?? 0}
          bookedNow={bookedNow}
          actions={
            <>
              <FavoriteButton
                kind="driver"
                id={detail.id}
                favorited={isFavorited}
                onChanged={setIsFavorited}
              />
              <ShareMenu url={`/${locale}/drivers/${detail.id}`} title={detail.fullName} />
              {detail.phone ? (
                <a
                  href={`tel:${detail.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-1 rounded border-2 border-brand-strong bg-brand px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {t('listing.contact')}
                </a>
              ) : (
                <button
                  type="button"
                  disabled={bookedNow}
                  onClick={() => setBookingOpen(true)}
                  className="rounded border-2 border-brand-strong bg-brand px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
                >
                  {bookLabel}
                </button>
              )}
            </>
          }
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="rounded border-2 border-border bg-card px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-muted-foreground"
            >
              {cat}
            </span>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Bio */}
            {detail.biography && (
              <div>
                <h2 className="mb-2 text-lg font-black text-foreground">{t('driver.profile')}</h2>
                <p className="text-sm font-medium text-muted-foreground">{detail.biography}</p>
              </div>
            )}

            {/* Spec tags */}
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-2 rounded border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                {detail.yearsExperience} {t('driver.yearsExperience')}
              </span>
              {detail.languages?.length > 0 && (
                <span className="flex items-center gap-2 rounded border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  {detail.languages.join(', ')}
                </span>
              )}
              {detail.vehicleTypes?.length > 0 && (
                <span className="flex items-center gap-2 rounded border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  {detail.vehicleTypes.join(', ')}
                </span>
              )}
              <span className="flex items-center gap-2 rounded border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-brand" />
                {t('driver.completedTrips', { count: detail.completedTrips })}
              </span>
            </div>

            {/* Service areas */}
            {detail.serviceAreas?.length > 0 && (
              <div>
                <h2 className="mb-2 text-lg font-black text-foreground">Service areas</h2>
                <div className="flex items-start gap-2 text-sm font-medium text-muted-foreground">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <p>{detail.serviceAreas.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Certifications */}
            {detail.certifications?.length > 0 && (
              <div>
                <h2 className="mb-2 text-lg font-black text-foreground">{t('driver.certifications')}</h2>
                <ul className="space-y-2">
                  {detail.certifications.map((cert) => (
                    <li key={cert} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand" />
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="mb-3 text-lg font-black text-foreground">{t('detail.reviews')}</h2>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft-sm">
                {reviews && reviews.totalReviews > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-black text-foreground">{reviews.averageRating?.toFixed(1)}</span>
                      </div>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-medium text-muted-foreground">{reviews.totalReviews} {t('detail.reviewsCount')}</span>
                    </div>
                    <ul className="space-y-3">
                      {reviews.reviews.slice(0, 5).map((r) => (
                        <li key={r.id} className="rounded border-2 border-border bg-neutral-50 p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-black text-foreground">{r.fromUser.fullName}</span>
                            <span className="flex items-center gap-0.5 font-semibold text-amber-500">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              {r.rating}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {r.comment ? <p className="mt-1 text-sm font-medium text-muted-foreground">{r.comment}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">{t('detail.reviewsPending')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right column — sticky booking summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card shadow-card">
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-2xl font-black text-foreground">{dailyRate}</p>
                  <p className="text-sm font-medium text-muted-foreground">{t('driver.dailyRate')} · {t('detail.beforeTaxes')}</p>
                </div>

                {detail.hourlyRateRwf != null && (
                  <div className="flex items-center justify-between rounded border-2 border-border bg-neutral-50 px-3 py-2">
                    <span className="text-sm font-black text-muted-foreground">{t('driver.hourlyRate')}</span>
                    <span className="text-sm font-black text-brand">{formatCurrencyRwf(detail.hourlyRateRwf)}</span>
                  </div>
                )}
                {detail.weeklyRateRwf != null && (
                  <div className="flex items-center justify-between rounded border-2 border-border bg-neutral-50 px-3 py-2">
                    <span className="text-sm font-black text-muted-foreground">{t('driver.weeklyRate')}</span>
                    <span className="text-sm font-black text-brand">{formatCurrencyRwf(detail.weeklyRateRwf)}</span>
                  </div>
                )}

                <div className="rounded border-2 border-border bg-neutral-50 p-3">
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">{t('detail.yourTrip')}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{t('detail.tripStart')} / {t('detail.tripEnd')}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Set dates and pickup when you request a booking.</p>
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">{t('detail.pickupReturn')}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{detail.primaryCity}</p>
                </div>

                {bookedNow ? (
                  <p className="rounded border-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                    {t('detail.bookedNow')}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  disabled={bookedNow}
                  className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bookLabel}
                </button>

                <div className="space-y-3 border-t-2 border-neutral-100 pt-4">
                  <div className="flex items-start gap-2">
                    <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-black text-foreground">{t('detail.cancellationPolicy')}</p>
                      <p className="text-xs font-medium text-muted-foreground">{t('detail.freeCancellation')}</p>
                      <p className="text-xs font-medium text-muted-foreground">{t('detail.cancellationNote')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-black text-foreground">{t('detail.paymentOptions')}</p>
                      <p className="text-xs font-medium text-muted-foreground">{t('detail.flexiblePayment')}</p>
                      <p className="text-xs font-medium text-muted-foreground">{t('detail.paymentNote')}</p>
                    </div>
                  </div>
                </div>

                {/* Direct call — key feature */}
                {detail.phone ? (
                  <a
                    href={`tel:${detail.phone.replace(/\s/g, '')}`}
                    className="flex w-full items-center justify-center gap-2 rounded border-2 border-brand-strong bg-brand py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                  >
                    <Phone className="h-4 w-4" />
                    {detail.phone}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={bookedNow}
                    onClick={() => setBookingOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded border-2 border-brand-strong bg-brand py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Phone className="h-4 w-4" />
                    {bookLabel}
                  </button>
                )}
                <FavoriteButton
                  kind="driver"
                  id={detail.id}
                  favorited={isFavorited}
                  onChanged={setIsFavorited}
                  variant="bar"
                />
                <div className="flex justify-end">
                  <ShareMenu url={`/${locale}/drivers/${detail.id}`} title={detail.fullName} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {similar.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pb-10 md:px-6">
          <h2 className="mb-4 text-lg font-black text-foreground">{t('listing.similarDrivers')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((driver) => (
              <DriverListingCard
                key={driver.id}
                driver={driver}
                locale={locale}
                favorited={false}
                onFavoriteChange={() => undefined}
              />
            ))}
          </div>
        </div>
      ) : null}

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
