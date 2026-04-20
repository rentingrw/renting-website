'use client';

import { useAuth } from '@clerk/nextjs';
import { Badge, Button, Card, CardContent } from '@rentingi/ui';
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
import { DetailPageSkeleton } from '@/components/web/loading-states';
import { BookingRequestDialog } from '@/components/web/booking-request-dialog';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { getDriverById, getReviewsForUser, type DriverDetail } from '@/lib/api';
import { formatCurrencyRwf, formatRange, trustTierFromScore } from '@/lib/format';
import { stockImages } from '@/lib/stock-images';

type DriverPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

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
    return () => {
      cancelled = true;
    };
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
    return () => {
      cancelled = true;
    };
  }, [driverId, getToken, isSignedIn, t]);

  const dailyRate =
    detail?.dailyRateRwf !== undefined
      ? formatCurrencyRwf(detail.dailyRateRwf)
      : detail?.approximateRateRangeRwf
        ? formatRange(detail.approximateRateRangeRwf.daily.min, detail.approximateRateRangeRwf.daily.max)
        : t('home.priceUnavailable');

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppHeader locale={locale} variant="default" />
        <DetailPageSkeleton />
      </main>
    );
  }

  if (!detail || error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppHeader locale={locale} variant="default" />
        <div className="mx-auto max-w-5xl p-8 text-red-600">{error ?? t('detail.notFound')}</div>
      </main>
    );
  }

  const profilePhoto = detail.profilePhotoUrl ?? stockImages.drivers[0];
  const categories = detail.categories?.length ? detail.categories : [detail.driverCategory?.replace('_', ' ') ?? ''];

  return (
    <main className="min-h-screen bg-gray-50">
      <AppHeader locale={locale} variant="default" />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Hero: profile photo + name + trust badge */}
        <section className="mb-8 flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:text-left">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-gray-100">
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
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{detail.fullName}</h1>
            <p className="mt-1 text-gray-600">{detail.primaryCity}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {reviews && reviews.totalReviews > 0 && (
                <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {reviews.averageRating?.toFixed(1)} ({reviews.totalReviews} {t('detail.trips')})
                </span>
              )}
              <Badge className="bg-teal-50 text-teal-700">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {trustTierFromScore(detail.trustScore)}
              </Badge>
              <Badge className="bg-gray-100 text-gray-700">
                {detail.yearsExperience} {t('driver.yearsExperience')}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge key={cat} variant="outline" className="border-gray-300 text-gray-700">
                  {cat}
                </Badge>
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
                <h2 className="mb-2 text-lg font-semibold text-gray-900">{t('driver.profile')}</h2>
                <p className="text-sm text-gray-600">{detail.biography}</p>
              </div>
            )}

            {/* Specs */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                <BriefcaseBusiness className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{detail.yearsExperience} {t('driver.yearsExperience')}</span>
              </div>
              {detail.languages?.length > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                  <Languages className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{detail.languages.join(', ')}</span>
                </div>
              )}
              {detail.vehicleTypes?.length > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                  <Car className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{detail.vehicleTypes.join(', ')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                <ShieldCheck className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{t('driver.completedTrips', { count: detail.completedTrips })}</span>
              </div>
            </div>

            {/* Service areas */}
            {detail.serviceAreas?.length > 0 && (
              <div>
                <h2 className="mb-2 text-lg font-semibold text-gray-900">Service areas</h2>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <p>{detail.serviceAreas.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Certifications */}
            {detail.certifications?.length > 0 && (
              <div>
                <h2 className="mb-2 text-lg font-semibold text-gray-900">{t('driver.certifications')}</h2>
                <ul className="space-y-2">
                  {detail.certifications.map((cert) => (
                    <li key={cert} className="flex items-center gap-2 text-sm text-gray-600">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                  <p className="text-2xl font-bold text-gray-900">{dailyRate}</p>
                  <p className="text-sm text-gray-500">{t('driver.dailyRate')} · {t('detail.beforeTaxes')}</p>
                </div>

                {detail.hourlyRateRwf != null && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('driver.hourlyRate')}</p>
                    <p className="text-teal-600">{formatCurrencyRwf(detail.hourlyRateRwf)}</p>
                  </div>
                )}
                {detail.weeklyRateRwf != null && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('driver.weeklyRate')}</p>
                    <p className="text-teal-600">{formatCurrencyRwf(detail.weeklyRateRwf)}</p>
                  </div>
                )}

                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('detail.yourTrip')}</h3>
                  <p className="text-sm text-gray-600">{t('detail.tripStart')} / {t('detail.tripEnd')}</p>
                  <p className="mt-1 text-xs text-gray-500">Set dates and pickup when you request a booking.</p>
                </div>

                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('detail.pickupReturn')}</h3>
                  <p className="text-sm text-gray-700">{detail.primaryCity}</p>
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
