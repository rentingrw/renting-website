'use client';

import { useAuth } from '@clerk/nextjs';
import { Badge, Button, Card, CardContent } from '@rentingi/ui';
import {
  CalendarDays,
  Car,
  ChevronRight,
  CreditCard,
  Fuel,
  Gauge,
  Heart,
  ShieldCheck,
  Star,
  ThumbsUp,
  User,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { DetailPageSkeleton } from '@/components/web/loading-states';
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
    return () => {
      cancelled = true;
    };
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
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('detail.error'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [carId, getToken, isSignedIn, t]);

  const priceBlock = useMemo(() => {
    if (!detail) return null;
    const rate = detail.dailyRateKigaliRwf ?? detail.approximateDailyRateRangeRwf?.kigali?.min;
    if (detail.dailyRateKigaliRwf) {
      return { display: formatCurrencyRwf(detail.dailyRateKigaliRwf), exact: detail.dailyRateKigaliRwf };
    }
    if (detail.approximateDailyRateRangeRwf) {
      return {
        display: formatRange(
          detail.approximateDailyRateRangeRwf.kigali.min,
          detail.approximateDailyRateRangeRwf.kigali.max,
        ),
        exact: detail.approximateDailyRateRangeRwf.kigali.min,
      };
    }
    return null;
  }, [detail]);

  const displayedFeatures = useMemo(() => {
    if (!detail?.features?.length) return [];
    return showAllFeatures ? detail.features : detail.features.slice(0, 6);
  }, [detail?.features, showAllFeatures]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppHeader locale={locale} variant="default" />
        <DetailPageSkeleton />
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppHeader locale={locale} variant="default" />
        <div className="mx-auto max-w-6xl p-8 text-red-600">{error ?? t('detail.notFound')}</div>
      </main>
    );
  }

  const photoList = photos(detail);
  const mainPhoto = photoList[selectedPhotoIndex] ?? photoList[0];
  const thumbnails = photoList.slice(0, 3).filter((_, i) => i !== selectedPhotoIndex).slice(0, 2);

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Image gallery */}
        <section className="mb-8 grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px] md:grid-rows-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-gray-200 md:row-span-2">
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
              className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm hover:bg-white"
              aria-label="Add to favorites"
            >
              <Heart className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          {thumbnails.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setSelectedPhotoIndex(photoList.indexOf(src))}
              className="relative hidden aspect-square overflow-hidden rounded-lg bg-gray-200 md:block"
            >
              <Image src={src} alt="" fill sizes="120px" className="object-cover" />
              {i === 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                  {t('detail.viewPhotos', { count: photoList.length })}
                </span>
              )}
            </button>
          ))}
          {photoList.length <= 2 && (
            <button
              type="button"
              className="hidden rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 md:flex md:items-center md:justify-center"
            >
              {t('detail.viewPhotos', { count: photoList.length })}
            </button>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{detail.title}</h1>
              <p className="mt-1 text-gray-600">
                {detail.year} {detail.brand} {detail.model}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {reviews && reviews.totalReviews > 0 && (
                  <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {reviews.averageRating?.toFixed(1)} ({reviews.totalReviews} {t('detail.trips')})
                  </span>
                )}
                <Badge className="bg-teal-50 text-teal-700">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  {t('detail.trustBadge')}
                </Badge>
              </div>
            </div>

            {/* Spec icons */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{detail.seats} {t('home.seats')}</span>
              </div>
              {detail.fuelType && (
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                  <Fuel className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{detail.fuelType}</span>
                </div>
              )}
              {detail.transmission && (
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                  <Gauge className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{detail.transmission}</span>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                <Car className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{detail.vehicleType}</span>
              </div>
            </div>

            {/* Hosted by */}
            <Card className="border-gray-200 bg-white">
              <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">{t('detail.hostedBy')}</h2>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100">
                    <User className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{detail.ownerName}</p>
                    {reviews && reviews.totalReviews > 0 && (
                      <p className="text-sm text-gray-600">
                        {reviews.averageRating?.toFixed(1)} ★ · {reviews.totalReviews} {t('detail.trips')}
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-sm text-gray-500">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                      {t('detail.trustBadge')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {detail.description && (
              <div>
                <h2 className="mb-2 text-lg font-semibold text-gray-900">{t('detail.features')}</h2>
                <p className="text-sm text-gray-600">{detail.description}</p>
              </div>
            )}

            {/* Vehicle features */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">{t('detail.features')}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <ul className="space-y-2 text-sm text-gray-600">
                  {displayedFeatures.length ? (
                    displayedFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                        {f}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">{t('detail.noFeatures')}</li>
                  )}
                </ul>
              </div>
              {detail.features?.length > 6 && !showAllFeatures && (
                <button
                  type="button"
                  onClick={() => setShowAllFeatures(true)}
                  className="mt-2 text-sm font-medium text-teal-600 hover:underline"
                >
                  {t('detail.seeAllFeatures', { count: detail.features.length })}
                </button>
              )}
            </div>

            {/* Availability */}
            <div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">{t('detail.availability')}</h2>
              <div className="space-y-2">
                {bookedRanges.length ? (
                  bookedRanges.map((range) => (
                    <div
                      key={`${range.startDate}-${range.endDate}`}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
                    >
                      <CalendarDays className="h-4 w-4 shrink-0 text-teal-600" />
                      {new Date(range.startDate).toLocaleDateString()} – {new Date(range.endDate).toLocaleDateString()}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">{t('detail.noBlockedDates')}</p>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">{t('detail.reviews')}</h2>
              <Card className="border-gray-200 bg-white">
                <CardContent className="p-4">
                  {reviews && reviews.totalReviews > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium text-gray-900">{reviews.averageRating?.toFixed(1)}</span>
                        </div>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-600">{reviews.totalReviews} {t('detail.reviewsCount')}</span>
                      </div>
                      <ul className="space-y-3">
                        {reviews.reviews.slice(0, 5).map((r) => (
                          <li key={r.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-900">{r.fromUser.fullName}</span>
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                {r.rating}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {r.comment ? <p className="mt-1 text-sm text-gray-600">{r.comment}</p> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t('detail.reviewsPending')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right column - sticky booking summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="border-gray-200 bg-white shadow-lg">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {priceBlock?.display ?? t('home.priceUnavailable')}
                  </p>
                  <p className="text-sm text-gray-500">{t('home.day')} · {t('detail.beforeTaxes')}</p>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('detail.yourTrip')}</h3>
                  <p className="text-sm text-gray-600">
                    {t('detail.tripStart')} / {t('detail.tripEnd')}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Set dates and pickup when you request a booking.
                  </p>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('detail.pickupReturn')}</h3>
                  <p className="flex items-center gap-2 text-sm text-gray-700">
                    {detail.locationText}
                  </p>
                </div>

                <Button
                  className="w-full bg-teal-600 py-6 text-base font-semibold hover:bg-teal-700"
                  onClick={() => setBookingOpen(true)}
                >
                  {t('detail.continue')}
                </Button>

                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex items-start gap-2">
                    <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('detail.cancellationPolicy')}</p>
                      <p className="text-xs text-gray-600">{t('detail.freeCancellation')}</p>
                      <p className="text-xs text-gray-500">{t('detail.cancellationNote')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('detail.paymentOptions')}</p>
                      <p className="text-xs text-gray-600">{t('detail.flexiblePayment')}</p>
                      <p className="text-xs text-gray-500">{t('detail.paymentNote')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Car className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('detail.distanceIncluded')}</p>
                      <p className="text-xs text-gray-500">{t('detail.unlimitedMiles')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Insurance & Protection</p>
                      <p className="text-xs text-gray-500">Coverage included with your booking.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Heart className="h-4 w-4" />
                  Add to favorites
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
