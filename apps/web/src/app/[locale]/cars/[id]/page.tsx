'use client';

import { useAuth } from '@clerk/nextjs';
import {
  CalendarDays,
  Car,
  ChevronRight,
  CreditCard,
  Fuel,
  Gauge,
  Heart,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  ThumbsUp,
  User,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { BookingRequestDialog } from '@/components/web/booking-request-dialog';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { getCarAvailability, getCarById, getReviewsForUser, type CarDetail } from '@/lib/api';
import { formatCurrencyRwf, formatRange } from '@/lib/format';
import { stockImages } from '@/lib/stock-images';

type CarPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

const photos = (detail: CarDetail) =>
  detail.photos?.length
    ? detail.photos
    : [stockImages.carPlaceholder, stockImages.carInterior, stockImages.carPlaceholder];

function DetailSkeleton({ locale }: { locale: SupportedLocale }) {
  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 md:px-6">
        <div className="mb-8 aspect-[16/10] w-full rounded-md border-2 border-neutral-900 bg-neutral-200" />
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-8 w-2/3 rounded bg-neutral-200" />
            <div className="h-5 w-1/3 rounded bg-neutral-200" />
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-9 w-24 rounded bg-neutral-200" />)}
            </div>
            <div className="h-32 w-full rounded bg-neutral-200" />
            <div className="h-48 w-full rounded bg-neutral-200" />
          </div>
          <div className="h-96 w-full rounded bg-neutral-200" />
        </div>
      </div>
    </main>
  );
}

export default function CarDetailPage({ params }: CarPageProps) {
  const t = useTranslations('web');
  const { isSignedIn, getToken } = useAuth();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [carId, setCarId] = useState('');
  const [detail, setDetail] = useState<CarDetail | null>(null);
  const [bookedRanges, setBookedRanges] = useState<Array<{ startDate: string; endDate: string }>>([]);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof getReviewsForUser>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled) {
        if (isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
        setCarId(routeParams.id);
      }
    }
    resolveParams();
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function loadDetails() {
      if (!carId) return;
      setLoading(true);
      setError(null);
      try {
        const token = isSignedIn ? await getToken() : null;
        const car = await getCarById(carId, token ?? undefined);
        const [availability, reviewsData] = await Promise.all([
          getCarAvailability(carId, new Date().toISOString().slice(0, 7)),
          getReviewsForUser(car.ownerId),
        ]);
        if (!cancelled) {
          setDetail(car);
          setBookedRanges(availability.bookedRanges.map((item) => ({ startDate: item.startDate, endDate: item.endDate })));
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
  }, [carId, getToken, isSignedIn, t]);

  const priceBlock = useMemo(() => {
    if (!detail) return null;
    if (detail.dailyRateKigaliRwf) {
      return { display: formatCurrencyRwf(detail.dailyRateKigaliRwf), exact: detail.dailyRateKigaliRwf };
    }
    if (detail.approximateDailyRateRangeRwf) {
      return {
        display: formatRange(detail.approximateDailyRateRangeRwf.kigali.min, detail.approximateDailyRateRangeRwf.kigali.max),
        exact: detail.approximateDailyRateRangeRwf.kigali.min,
      };
    }
    return null;
  }, [detail]);

  const displayedFeatures = useMemo(() => {
    if (!detail?.features?.length) return [];
    return showAllFeatures ? detail.features : detail.features.slice(0, 6);
  }, [detail?.features, showAllFeatures]);

  if (loading) return <DetailSkeleton locale={locale} />;

  if (error || !detail) {
    return (
      <main className="min-h-screen bg-[#f5f0e8]">
        <AppHeader locale={locale} variant="default" />
        <div className="mx-auto max-w-6xl p-8">
          <p className="rounded-md border-2 border-red-600 bg-red-50 p-4 font-semibold text-red-700">
            {error ?? t('detail.notFound')}
          </p>
        </div>
      </main>
    );
  }

  const photoList = photos(detail);
  const mainPhoto = photoList[selectedPhotoIndex] ?? photoList[0];
  const thumbnails = photoList.slice(0, 3).filter((_, i) => i !== selectedPhotoIndex).slice(0, 2);

  return (
    <main className="min-h-screen bg-[#f5f0e8]">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Image gallery */}
        <section className="mb-8 grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px] md:grid-rows-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-md border-2 border-neutral-900 bg-neutral-200 shadow-brutal md:row-span-2">
            <Image
              src={mainPhoto}
              alt={detail.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 80vw"
              className="object-cover"
            />
            <button
              type="button"
              className="absolute right-3 top-3 rounded border-2 border-neutral-900 bg-white p-2 shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
              aria-label="Add to favorites"
            >
              <Heart className="h-4 w-4 text-neutral-600" />
            </button>
          </div>
          {thumbnails.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setSelectedPhotoIndex(photoList.indexOf(src))}
              className="relative hidden aspect-square overflow-hidden rounded-md border-2 border-neutral-900 bg-neutral-200 md:block"
            >
              <Image src={src} alt="" fill sizes="120px" className="object-cover" />
              {i === 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-black text-white">
                  {t('detail.viewPhotos', { count: photoList.length })}
                </span>
              )}
            </button>
          ))}
          {photoList.length <= 2 && (
            <button
              type="button"
              className="hidden rounded-md border-2 border-neutral-900 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none md:flex md:items-center md:justify-center"
            >
              {t('detail.viewPhotos', { count: photoList.length })}
            </button>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-neutral-900 md:text-3xl">{detail.title}</h1>
              <p className="mt-1 font-medium text-neutral-600">
                {detail.year} {detail.brand} {detail.model}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {reviews && reviews.totalReviews > 0 && (
                  <span className="flex items-center gap-1 rounded border-2 border-neutral-900 bg-white px-2.5 py-1 text-sm font-black text-neutral-900">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {reviews.averageRating?.toFixed(1)}
                    <span className="font-medium text-neutral-500">({reviews.totalReviews} {t('detail.trips')})</span>
                  </span>
                )}
                <span className="flex items-center gap-1 rounded border-2 border-teal-600 bg-teal-50 px-2.5 py-1 text-sm font-black text-teal-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t('detail.trustBadge')}
                </span>
              </div>
            </div>

            {/* Spec tags */}
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                <User className="h-4 w-4 text-neutral-500" />
                {detail.seats} {t('home.seats')}
              </span>
              {detail.fuelType && (
                <span className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                  <Fuel className="h-4 w-4 text-neutral-500" />
                  {detail.fuelType}
                </span>
              )}
              {detail.transmission && (
                <span className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                  <Gauge className="h-4 w-4 text-neutral-500" />
                  {detail.transmission}
                </span>
              )}
              <span className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                <Car className="h-4 w-4 text-neutral-500" />
                {detail.vehicleType}
              </span>
            </div>

            {/* Hosted by */}
            <div className="rounded-md border-2 border-neutral-900 bg-white p-4 shadow-brutal-xs">
              <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-neutral-500">{t('detail.hostedBy')}</h2>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-900 bg-teal-50">
                  <User className="h-6 w-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-neutral-900">{detail.ownerName}</p>
                  {reviews && reviews.totalReviews > 0 && (
                    <p className="text-sm font-medium text-neutral-600">
                      {reviews.averageRating?.toFixed(1)} ★ · {reviews.totalReviews} {t('detail.trips')}
                    </p>
                  )}
                  <p className="flex items-center gap-1 text-sm font-medium text-teal-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t('detail.trustBadge')}
                  </p>
                </div>
              </div>
              {/* Contact actions */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  href="tel:+250788781648"
                  className="flex flex-1 items-center justify-center gap-2 rounded border-2 border-teal-800 bg-teal-600 px-4 py-2.5 text-sm font-black text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-teal-700 hover:shadow-none"
                >
                  <Phone className="h-4 w-4" />
                  Call Hoster
                </a>
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded border-2 border-neutral-900 bg-white px-4 py-2.5 text-sm font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
              </div>
            </div>

            {/* Description */}
            {detail.description && (
              <div>
                <h2 className="mb-2 text-lg font-black text-neutral-900">{t('detail.about')}</h2>
                <p className="text-sm font-medium text-neutral-600">{detail.description}</p>
              </div>
            )}

            {/* Vehicle features */}
            {displayedFeatures.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-black text-neutral-900">{t('detail.features')}</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {displayedFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                {detail.features?.length > 6 && !showAllFeatures && (
                  <button
                    type="button"
                    onClick={() => setShowAllFeatures(true)}
                    className="mt-3 text-sm font-black text-teal-700 hover:underline"
                  >
                    {t('detail.seeAllFeatures', { count: detail.features.length })}
                  </button>
                )}
              </div>
            )}

            {/* Availability */}
            <div>
              <h2 className="mb-2 text-lg font-black text-neutral-900">{t('detail.availability')}</h2>
              {bookedRanges.length ? (
                <div className="space-y-2">
                  {bookedRanges.map((range) => (
                    <div
                      key={`${range.startDate}-${range.endDate}`}
                      className="flex items-center gap-2 rounded border-2 border-neutral-900 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700"
                    >
                      <CalendarDays className="h-4 w-4 shrink-0 text-teal-600" />
                      {new Date(range.startDate).toLocaleDateString()} – {new Date(range.endDate).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-neutral-500">{t('detail.noBlockedDates')}</p>
              )}
            </div>

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
                  <p className="text-2xl font-black text-neutral-900">
                    {priceBlock?.display ?? t('home.priceUnavailable')}
                  </p>
                  <p className="text-sm font-medium text-neutral-500">/ {t('home.day')} · {t('detail.beforeTaxes')}</p>
                </div>

                <div className="rounded border-2 border-neutral-200 bg-neutral-50 p-3">
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-neutral-500">{t('detail.yourTrip')}</h3>
                  <p className="text-sm font-medium text-neutral-600">
                    {t('detail.tripStart')} / {t('detail.tripEnd')}
                  </p>
                  <p className="mt-1 text-xs font-medium text-neutral-400">
                    Set dates and pickup when you request a booking.
                  </p>
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-neutral-500">{t('detail.pickupReturn')}</h3>
                  <p className="text-sm font-medium text-neutral-700">{detail.locationText}</p>
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
                  <div className="flex items-start gap-2">
                    <Car className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-sm font-black text-neutral-900">{t('detail.distanceIncluded')}</p>
                      <p className="text-xs font-medium text-neutral-400">{t('detail.unlimitedMiles')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-sm font-black text-neutral-900">Insurance &amp; Protection</p>
                      <p className="text-xs font-medium text-neutral-400">Coverage included with your booking.</p>
                    </div>
                  </div>
                </div>

                {/* Quick call — most important action */}
                <a
                  href="tel:+250788781648"
                  className="flex w-full items-center justify-center gap-2 rounded border-2 border-teal-800 bg-teal-600 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  <Phone className="h-4 w-4" />
                  Call Hoster Directly
                </a>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded border-2 border-neutral-900 bg-white py-2 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  <Heart className="h-4 w-4" />
                  Save to Favorites
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
          mode: 'car',
          id: detail.id,
          title: detail.title,
          ownerLabel: `${t('detail.owner')}: ${detail.ownerName}`,
          defaultServiceType: detail.serviceType,
          exactDailyRate: detail.dailyRateKigaliRwf,
        }}
      />
    </main>
  );
}
