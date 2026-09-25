'use client';

import { useAuth } from '@clerk/nextjs';
import {
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Fuel,
  Gauge,
  Phone,
  ShieldCheck,
  Star,
  ThumbsUp,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { BookingRequestDialog } from '@/components/web/booking-request-dialog';
import { FavoriteButton, useFavoriteIds } from '@/components/web/favorite-button';
import { ShareMenu } from '@/components/web/share-menu';
import { CarListingCard } from '@/components/web/car-listing-card';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { getCarAvailability, getCarById, getCarsByOwner, getFavorites, getReviewsForUser, searchMarketplace, type CarDetail, type SearchCar } from '@/lib/api';
import { formatCurrencyRwf, formatRange } from '@/lib/format';
import { stockImages } from '@/lib/stock-images';
import { TrustBadge } from '@/components/web/trust-badge';

type CarPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

const photos = (detail: CarDetail) =>
  detail.photos?.length
    ? detail.photos
    : [stockImages.carPlaceholder, stockImages.carInterior, stockImages.carPlaceholder];

function DetailSkeleton({ locale }: { locale: SupportedLocale }) {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 md:px-6">
        <div className="mb-8 aspect-[16/10] w-full rounded-md border-2 border-border bg-muted" />
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-5 w-1/3 rounded bg-muted" />
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-9 w-24 rounded bg-muted" />)}
            </div>
            <div className="h-32 w-full rounded bg-muted" />
            <div className="h-48 w-full rounded bg-muted" />
          </div>
          <div className="h-96 w-full rounded bg-muted" />
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
  const [isFavorited, setIsFavorited] = useState(false);
  const [ownerCars, setOwnerCars] = useState<SearchCar[]>([]);
  const [similarCars, setSimilarCars] = useState<SearchCar[]>([]);
  const carFavorites = useFavoriteIds('car');

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
        const [availability, reviewsData, favs, otherCars, similarData] = await Promise.all([
          getCarAvailability(carId, new Date().toISOString().slice(0, 7)),
          getReviewsForUser(car.ownerId),
          token ? getFavorites(token).catch(() => []) : Promise.resolve([]),
          getCarsByOwner(car.ownerId, carId),
          searchMarketplace({ type: 'cars', vehicleType: car.vehicleType, limit: 8 }).catch(() => null),
        ]);
        if (!cancelled) {
          setDetail(car);
          setBookedRanges(availability.bookedRanges.map((item) => ({ startDate: item.startDate, endDate: item.endDate })));
          setReviews(reviewsData);
          setIsFavorited(favs.some((f) => f.carListing.id === carId));
          setOwnerCars(otherCars);
          const ownerIds = new Set(otherCars.map((item) => item.id));
          setSimilarCars(
            (similarData?.cars ?? [])
              .filter((item) => item.id !== carId && !ownerIds.has(item.id))
              .slice(0, 6),
          );
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
      <main className="min-h-screen bg-background">
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
  const bookedNow = Boolean(detail.isBookedNow);
  const bookLabel = bookedNow
    ? t('detail.unavailable')
    : detail.instantBooking
      ? t('detail.bookNow')
      : t('booking.requestButton');

  function prevPhoto() {
    setSelectedPhotoIndex((i) => (i === 0 ? photoList.length - 1 : i - 1));
  }

  function nextPhoto() {
    setSelectedPhotoIndex((i) => (i === photoList.length - 1 ? 0 : i + 1));
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Image gallery */}
        <section className="mb-6">
          {/* Main image with prev/next */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-md border-2 border-border bg-muted shadow-brutal">
            <Image
              src={mainPhoto}
              alt={detail.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover transition-opacity duration-200"
            />
            {/* Favorite / share */}
            <div className="absolute right-3 top-3 z-10 flex gap-1">
              <FavoriteButton
                kind="car"
                id={detail.id}
                favorited={isFavorited}
                onChanged={setIsFavorited}
              />
              <ShareMenu url={`/${locale}/cars/${detail.id}`} title={detail.title} />
            </div>
            {/* Photo counter */}
            {photoList.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded border-2 border-border bg-card px-2 py-0.5 text-xs font-black text-foreground">
                {selectedPhotoIndex + 1} / {photoList.length}
              </span>
            )}
            {/* Prev / Next arrows */}
            {photoList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded border-2 border-border bg-card p-1.5 shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded border-2 border-border bg-card p-1.5 shadow-brutal-xs hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              </>
            )}
          </div>
          {/* Thumbnail strip */}
          {photoList.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {photoList.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(i)}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === selectedPhotoIndex
                      ? 'border-brand shadow-soft-sm'
                      : 'border-border hover:border-brand'
                  }`}
                >
                  <Image src={src} alt="" fill sizes="96px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-foreground md:text-3xl">
                {detail.title}
                {detail.verified ? (
                  <span className="ml-2 align-middle rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand">
                    {t('detail.verified')}
                  </span>
                ) : null}
              </h1>
              <p className="mt-1 font-medium text-muted-foreground">
                {detail.year} {detail.brand} {detail.model}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {reviews && reviews.totalReviews > 0 && (
                  <span className="flex items-center gap-1 rounded border-2 border-border bg-card px-2.5 py-1 text-sm font-black text-foreground">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {reviews.averageRating?.toFixed(1)}
                    <span className="font-medium text-muted-foreground">({reviews.totalReviews} {t('detail.trips')})</span>
                  </span>
                )}
                <TrustBadge score={detail.ownerTrustScore ?? 100} verified={detail.verified} />
                <span className={`rounded border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${bookedNow ? 'border-amber-500 bg-amber-500 text-black' : 'border-emerald-500 bg-emerald-500 text-black'}`}>
                  {bookedNow ? t('detail.bookedNow') : t('detail.available')}
                </span>
              </div>
            </div>

            {/* Spec tags */}
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-2 rounded border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                {detail.seats} {t('home.seats')}
              </span>
              {detail.fuelType && (
                <span className="flex items-center gap-2 rounded border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  {detail.fuelType}
                </span>
              )}
              {detail.transmission && (
                <span className="flex items-center gap-2 rounded border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  {detail.transmission}
                </span>
              )}
              <span className="flex items-center gap-2 rounded border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
                <Car className="h-4 w-4 text-muted-foreground" />
                {detail.vehicleType}
              </span>
            </div>

            {/* Hosted by */}
            <div className="rounded-md border-2 border-border bg-card p-4 shadow-brutal-xs">
              <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">{t('detail.hostedBy')}</h2>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-brand-soft">
                  <User className="h-6 w-6 text-brand" />
                </div>
                <div className="flex-1">
                  <Link
                    href={`/${locale}/users/${detail.ownerId}`}
                    className="font-black text-foreground underline-offset-2 hover:text-brand hover:underline"
                  >
                    {detail.ownerName}
                  </Link>
                  {reviews && reviews.totalReviews > 0 && (
                    <p className="text-sm font-medium text-muted-foreground">
                      {reviews.averageRating?.toFixed(1)} ★ · {reviews.totalReviews} {t('detail.trips')}
                    </p>
                  )}
                  <TrustBadge score={detail.ownerTrustScore ?? 100} verified={detail.verified} />
                </div>
              </div>
              {/* Contact actions */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {detail.ownerPhone ? (
                  <a
                    href={`tel:${detail.ownerPhone.replace(/\s/g, '')}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded border-2 border-brand-strong bg-brand px-4 py-2.5 text-sm font-black text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-brand-hover hover:shadow-none"
                  >
                    <Phone className="h-4 w-4" />
                    {detail.ownerPhone}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={bookedNow}
                    onClick={() => setBookingOpen(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded border-2 border-brand-strong bg-brand px-4 py-2.5 text-sm font-black text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-brand-hover hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Phone className="h-4 w-4" />
                    {bookLabel}
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            {detail.description && (
              <div>
                <h2 className="mb-2 text-lg font-black text-foreground">{t('detail.about')}</h2>
                <p className="text-sm font-medium text-muted-foreground">{detail.description}</p>
              </div>
            )}

            {/* Vehicle features */}
            {displayedFeatures.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-black text-foreground">{t('detail.features')}</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {displayedFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>
                {detail.features?.length > 6 && !showAllFeatures && (
                  <button
                    type="button"
                    onClick={() => setShowAllFeatures(true)}
                    className="mt-3 text-sm font-black text-brand hover:underline"
                  >
                    {t('detail.seeAllFeatures', { count: detail.features.length })}
                  </button>
                )}
              </div>
            )}

            {/* Availability */}
            <div>
              <h2 className="mb-2 text-lg font-black text-foreground">{t('detail.availability')}</h2>
              {bookedRanges.length ? (
                <div className="space-y-2">
                  {bookedRanges.map((range) => (
                    <div
                      key={`${range.startDate}-${range.endDate}`}
                      className="flex items-center gap-2 rounded border-2 border-border bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground"
                    >
                      <CalendarDays className="h-4 w-4 shrink-0 text-brand" />
                      {new Date(range.startDate).toLocaleDateString()} to {new Date(range.endDate).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">{t('detail.noBlockedDates')}</p>
              )}
            </div>

            {/* Reviews */}
            <div>
              <h2 className="mb-3 text-lg font-black text-foreground">{t('detail.reviews')}</h2>
              <div className="rounded-md border-2 border-border bg-card p-4 shadow-brutal-xs">
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
            {/* More from this hoster */}
            {ownerCars.length > 0 && (
              <div id="more-from-owner">
                <h2 className="mb-3 text-lg font-black text-foreground">{t('listing.moreFrom', { name: detail.ownerName })}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ownerCars.map((car) => (
                    <CarListingCard
                      key={car.id}
                      car={car}
                      locale={locale}
                      favorited={carFavorites.ids.has(car.id)}
                      onFavoriteChange={(next) => carFavorites.setFavorited(car.id, next)}
                    />
                  ))}
                </div>
              </div>
            )}
            {similarCars.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-black text-foreground">{t('listing.similarCars')}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {similarCars.map((car) => (
                    <CarListingCard
                      key={car.id}
                      car={car}
                      locale={locale}
                      favorited={carFavorites.ids.has(car.id)}
                      onFavoriteChange={(next) => carFavorites.setFavorited(car.id, next)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — sticky booking summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card shadow-card">
              <div className="space-y-4 p-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-2xl font-black text-foreground">
                      {priceBlock?.display ?? t('home.priceUnavailable')}
                    </p>
                    {detail.priceNegotiable && (
                      <span className="rounded border-2 border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-800">
                        {t('listing.negotiable')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">/ {t('home.day')} · {t('detail.beforeTaxes')}</p>
                  {detail.weeklyRateRwf != null && (
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">{t('listing.weeklyRate')}</span>
                      <span className="font-black text-brand">{formatCurrencyRwf(detail.weeklyRateRwf)}{t('listing.perWeek')}</span>
                    </div>
                  )}
                  {detail.monthlyRateRwf != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">{t('listing.monthlyRate')}</span>
                      <span className="font-black text-brand">{formatCurrencyRwf(detail.monthlyRateRwf)}{t('listing.perMonth')}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-muted/60 p-3">
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">{t('detail.yourTrip')}</h3>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('detail.tripStart')} / {t('detail.tripEnd')}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {t('listing.setDatesHint')}
                  </p>
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">{t('detail.pickupReturn')}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{detail.locationText}</p>
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
                  <div className="flex items-start gap-2">
                    <Car className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-black text-foreground">{t('detail.distanceIncluded')}</p>
                      <p className="text-xs font-medium text-muted-foreground">{t('detail.unlimitedMiles')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-black text-foreground">Insurance &amp; Protection</p>
                      <p className="text-xs font-medium text-muted-foreground">Coverage included with your booking.</p>
                    </div>
                  </div>
                </div>

                {/* Quick call — most important action */}
                {detail.ownerPhone && (
                  <a
                    href={`tel:${detail.ownerPhone.replace(/\s/g, '')}`}
                    className="flex w-full items-center justify-center gap-2 rounded border-2 border-brand-strong bg-brand py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                  >
                    <Phone className="h-4 w-4" />
                    {detail.ownerPhone}
                  </a>
                )}
                <FavoriteButton
                  kind="car"
                  id={detail.id}
                  favorited={isFavorited}
                  onChanged={setIsFavorited}
                  variant="bar"
                />
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
          exactDailyRate: priceBlock?.exact,
          bookedRanges: bookedRanges,
          instantBooking: detail.instantBooking,
        }}
      />
    </main>
  );
}
