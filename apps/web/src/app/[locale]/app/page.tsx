'use client';

import React from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@rentingi/ui';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  cancelBooking,
  createCarListing,
  createReview,
  flagBookingIssue,
  getCarBookingsMine,
  getCarsMine,
  getDriverBookingsMine,
  getDriverProfileMe,
  getMe,
  getSubscriptionOverview,
  getSubscriptionPaymentHistory,
  getDriverSubscriptionOverview,
  initiateDriverSubscription,
  cancelDriverSubscription,
  getTaxiSubscriptionOverview,
  initiateTaxiSubscription,
  cancelTaxiSubscription,
  cancelSubscription,
  initiateSubscription,
  markBookingComplete,
  patchLanguagePreference,
  pauseCar,
  publishCar,
  syncUser,
  upgradeSubscription,
  updateCarListing,
  type CarBooking,
  type CarListingPayload,
  type DriverBooking,
  type DriverProfileMe,
  type MeResponse,
  type OwnerCar,
  type SubscriptionOverview,
  type SubscriptionPayment,
} from '@/lib/api';
import { formatCurrencyRwf } from '@/lib/format';
import { setLocaleCookie } from '@/lib/locale';
import { stockImages } from '@/lib/stock-images';
import { connectSocket, socket } from '@/lib/socket';
import { useStore } from '@/lib/store';
import { DashboardHeader } from '@/components/web/dashboard-header';
import { AppLoadingSkeleton, LoadingSpinner } from '@/components/web/loading-states';
import { OwnerListingWizard } from '@/components/web/owner-listing-wizard';

type AppPageProps = {
  params: Promise<{ locale: string }>;
};

type BookingType = 'car' | 'driver';
type DashboardSection = 'overview' | 'cars' | 'bookings' | 'subscription';

type DashboardBooking = {
  key: string;
  id: string;
  bookingType: BookingType;
  title: string;
  listingId?: string;
  status: string;
  amountRwf: number;
  createdAt: string;
  startAt: string;
  endAt: string;
  chatEligible: boolean;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyAvatarUrl: string | null;
  photoUrl: string | null;
  youAre: 'renter' | 'owner' | 'driver';
  needsYourResponse: boolean;
  canCancel: boolean;
  canMarkComplete: boolean;
  canFlagIssue: boolean;
  counterpartyPhone: string | null;
  counterpartyWhatsapp: string | null;
};

function toDashboardBookings(
  me: MeResponse | null,
  carBookings: CarBooking[],
  driverBookings: DriverBooking[],
): DashboardBooking[] {
  if (!me) {
    return [];
  }

  const mappedCars: DashboardBooking[] = carBookings.map((booking) => {
    const youAre = booking.renterId === me.id ? 'renter' : 'owner';
    const counterparty = youAre === 'renter' ? booking.owner : booking.renter;
    return {
      key: `car:${booking.id}`,
      id: booking.id,
      bookingType: 'car',
      title: booking.listing.title,
      listingId: booking.listingId,
      status: booking.status,
      amountRwf: booking.totalAmountRwf,
      createdAt: booking.createdAt,
      startAt: booking.startDate,
      endAt: booking.endDate,
      chatEligible: booking.chatEligible,
      counterpartyId: counterparty.id,
      counterpartyName: counterparty.fullName,
      counterpartyAvatarUrl: counterparty.avatarUrl,
      photoUrl: booking.listing.photos?.[0] ?? null,
      youAre,
      needsYourResponse: false,
      canCancel: booking.status === 'confirmed',
      canMarkComplete: booking.status === 'active',
      canFlagIssue: booking.status === 'confirmed' || booking.status === 'active',
      counterpartyPhone: counterparty.phone ?? null,
      counterpartyWhatsapp: counterparty.whatsapp ?? null,
    };
  });

  const mappedDrivers: DashboardBooking[] = driverBookings.map((booking) => {
    const youAre = booking.renterId === me.id ? 'renter' : 'driver';
    const counterparty = youAre === 'renter' ? booking.driver : booking.renter;
    return {
      key: `driver:${booking.id}`,
      id: booking.id,
      bookingType: 'driver',
      title: `Driver booking (${booking.serviceType.replaceAll('_', ' ')})`,
      status: booking.status,
      amountRwf: booking.totalAmountRwf,
      createdAt: booking.createdAt,
      startAt: booking.startAt,
      endAt: booking.endAt,
      chatEligible: booking.chatEligible,
      counterpartyId: counterparty.id,
      counterpartyName: counterparty.fullName,
      counterpartyAvatarUrl: counterparty.avatarUrl,
      photoUrl: null,
      youAre,
      needsYourResponse: false,
      canCancel: booking.status === 'confirmed',
      canMarkComplete: booking.status === 'active',
      canFlagIssue: booking.status === 'confirmed' || booking.status === 'active',
      counterpartyPhone: counterparty.phone ?? null,
      counterpartyWhatsapp: counterparty.whatsapp ?? null,
    };
  });

  return [...mappedCars, ...mappedDrivers].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export default function AppPage({ params }: AppPageProps) {
  const t = useTranslations('web');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);
  const [, setUpdatingLanguage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appBusy, setAppBusy] = useState(false);
  const [carBookings, setCarBookings] = useState<CarBooking[]>([]);
  const [driverBookings, setDriverBookings] = useState<DriverBooking[]>([]);
  const [cars, setCars] = useState<OwnerCar[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionOverview | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionPayment[]>([]);
  const [driverSubscription, setDriverSubscription] = useState<{ subscription: null | { id: string; status: string; renewsAt: string | null; amountRwf: number; paymentMethod: string | null }; isActive: boolean; planPriceRwf: number } | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfileMe | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSection>('bookings');
  const [selectedBookingKey, setSelectedBookingKey] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    open: boolean;
    bookingType: BookingType;
    bookingId: string;
    toUserId: string;
    toName: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<'basic' | 'premium' | 'enterprise'>('basic');
  const [subscriptionPaymentMethod, setSubscriptionPaymentMethod] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo');
  const [subscriptionPhone, setSubscriptionPhone] = useState('');
  const [driverSubPaymentMethod, setDriverSubPaymentMethod] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo');
  const [driverSubPhone, setDriverSubPhone] = useState('');
  const [subscriptionPromo, setSubscriptionPromo] = useState('');
  const [driverSubPromo, setDriverSubPromo] = useState('');
  const [taxiSubscription, setTaxiSubscription] = useState<{ subscription: null | { id: string; status: string; renewsAt: string | null; amountRwf: number; paymentMethod: string | null }; isActive: boolean; planPriceRwf: number } | null>(null);
  const [taxiSubPaymentMethod, setTaxiSubPaymentMethod] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo');
  const [taxiSubPhone, setTaxiSubPhone] = useState('');
  const [taxiSubPromo, setTaxiSubPromo] = useState('');
  const [listingWizardOpen, setListingWizardOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<OwnerCar | null>(null);
  const storeLocale = useStore((state) => state.locale);
  const storeSetLocale = useStore((state) => state.setLocale);
  const tokenRef = useRef<string | null>(null); // socket only; API calls always use fresh getToken()

  const sectionFromQuery = useMemo<DashboardSection | null>(() => {
    const section = searchParams.get('section');
    if (
      section === 'overview' ||
      section === 'cars' ||
      section === 'bookings' ||
      section === 'subscription'
    ) {
      return section;
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      const candidate = routeParams.locale;
      if (isSupportedLocale(candidate) && !cancelled) {
        setLocale(candidate);
      }
    }
    resolveParams();
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!isLoaded) {
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Session is missing. Please sign in again.');
        }
        tokenRef.current = token;

        const me = await getMe(token);
        if (!me) {
          if (!cancelled) {
            setLoading(false);
            setNeedsOnboarding(true);
          }
          return;
        }

        if (!cancelled) {
          const preferredLocale = isSupportedLocale(me.languagePreference)
            ? me.languagePreference
            : routing.defaultLocale;
          setNeedsOnboarding(false);
          setProfile(me);
          setLoading(false);
          storeSetLocale(preferredLocale);
          if (preferredLocale !== locale) {
            router.replace(`/${preferredLocale}/app`);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setLoading(false);
          setError(loadError instanceof Error ? loadError.message : 'Unable to load account profile.');
        }
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, locale, router, storeSetLocale]);

  const currentLocale = useMemo(() => {
    if (profile && isSupportedLocale(profile.languagePreference)) {
      return profile.languagePreference;
    }
    return storeLocale ?? locale;
  }, [locale, profile, storeLocale]);

  const bookings = useMemo(() => toDashboardBookings(profile, carBookings, driverBookings), [profile, carBookings, driverBookings]);
  const selectedBooking = useMemo(
    () => bookings.find((item) => item.key === selectedBookingKey) ?? null,
    [bookings, selectedBookingKey],
  );

  async function loadDashboardData(token: string) {
    if (!profile) {
      return;
    }
    setAppBusy(true);
    setError(null);
    try {
      const [carData, driverData, carMine, sub, driverMe, history, driverSub, taxiSub] = await Promise.all([
        getCarBookingsMine(token),
        getDriverBookingsMine(token),
        profile.roles.includes('car_owner') ? getCarsMine(token) : Promise.resolve([]),
        profile.roles.includes('car_owner') ? getSubscriptionOverview(token) : Promise.resolve(null),
        profile.roles.includes('driver') ? getDriverProfileMe(token) : Promise.resolve(null),
        profile.roles.includes('car_owner') ? getSubscriptionPaymentHistory(token) : Promise.resolve([]),
        profile.roles.includes('driver') ? getDriverSubscriptionOverview(token) : Promise.resolve(null),
        profile.hasTaxiProfile ? getTaxiSubscriptionOverview(token) : Promise.resolve(null),
      ]);
      setCarBookings(carData);
      setDriverBookings(driverData);
      setCars(carMine);
      setSubscription(sub);
      setDriverProfile(driverMe);
      setSubscriptionHistory(history);
      setDriverSubscription(driverSub);
      setTaxiSubscription(taxiSub);
      const all = toDashboardBookings(profile, carData, driverData);
      if (!selectedBookingKey && all[0]) {
        setSelectedBookingKey(all[0].key);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
    } finally {
      setAppBusy(false);
    }
  }

  useEffect(() => {
    async function bootstrapDashboard() {
      if (!profile || !isLoaded) {
        return;
      }
      const token = await getToken();
      if (!token) {
        return;
      }
      tokenRef.current = token;
      await loadDashboardData(token);
      connectSocket(token);
    }
    bootstrapDashboard();
  }, [profile?.id, isLoaded]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    function notify(text: string) {
      setNotifications((previous) => [text, ...previous].slice(0, 6));
    }

    const refreshHandler = async () => {
      const token = await getToken();
      if (token) {
        await loadDashboardData(token);
      }
    };
    const reviewHandler = (payload: unknown) => {
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'bookingType' in payload &&
        'booking' in payload
      ) {
        const body = payload as { bookingType: BookingType; booking: { id: string } };
        const match = bookings.find((item) => item.key === `${body.bookingType}:${body.booking.id}`);
        if (match) {
          setReviewTarget({
            open: true,
            bookingType: match.bookingType,
            bookingId: match.id,
            toUserId: match.counterpartyId,
            toName: match.counterpartyName,
          });
        }
      }
    };
    const trustHandler = (payload: unknown) => {
      if (typeof payload === 'object' && payload !== null && 'trustScore' in payload) {
        const score = (payload as { trustScore: number }).trustScore;
        setTrustScore(score);
      }
    };

    const bookingNewRequestHandler = async () => {
      notify('New booking request.');
      await refreshHandler();
    };
    const bookingConfirmedHandler = async () => {
      notify('A booking was confirmed.');
      await refreshHandler();
    };
    const bookingDeclinedHandler = async () => {
      notify('A booking was declined.');
      await refreshHandler();
    };
    const bookingAutoCancelledHandler = async () => {
      notify('A booking was auto-cancelled.');
      await refreshHandler();
    };
    const subscriptionActivatedHandler = async () => {
      notify('Subscription activated.');
      await refreshHandler();
    };

    socket.on('booking:new_request', bookingNewRequestHandler);
    socket.on('booking:confirmed', bookingConfirmedHandler);
    socket.on('booking:declined', bookingDeclinedHandler);
    socket.on('booking:auto_cancelled', bookingAutoCancelledHandler);
    socket.on('booking:mark_complete_received', refreshHandler);
    socket.on('review:prompt', reviewHandler);
    socket.on('trust_score:updated', trustHandler);
    socket.on('subscription:activated', subscriptionActivatedHandler);

    return () => {
      socket.off('booking:new_request', bookingNewRequestHandler);
      socket.off('booking:confirmed', bookingConfirmedHandler);
      socket.off('booking:declined', bookingDeclinedHandler);
      socket.off('booking:auto_cancelled', bookingAutoCancelledHandler);
      socket.off('booking:mark_complete_received', refreshHandler);
      socket.off('review:prompt', reviewHandler);
      socket.off('trust_score:updated', trustHandler);
      socket.off('subscription:activated', subscriptionActivatedHandler);
    };
  }, [bookings, profile]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const isHoster = profile.roles.includes('car_owner');
    const isDriver = profile.roles.includes('driver');

    if (sectionFromQuery === 'cars' && isHoster) {
      setActiveSection('cars');
      return;
    }

    if (sectionFromQuery === 'subscription' && (isHoster || isDriver)) {
      setActiveSection('subscription');
      return;
    }

    if (sectionFromQuery === 'bookings') {
      setActiveSection('bookings');
      return;
    }

    if (sectionFromQuery === 'overview' && isDriver) {
      setActiveSection('overview');
      return;
    }

    if (isHoster) {
      setActiveSection('cars');
    } else if (isDriver) {
      setActiveSection('overview');
    } else {
      setActiveSection('bookings');
    }
  }, [profile, sectionFromQuery]);

  async function handleLanguageChange(nextLocale: SupportedLocale) {
    setUpdatingLanguage(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Session is missing. Please sign in again.');
      }
      await patchLanguagePreference(token, nextLocale);
      setLocaleCookie(nextLocale);
      storeSetLocale(nextLocale);
      setProfile((previous) => (previous ? { ...previous, languagePreference: nextLocale } : previous));
      router.replace(`/${nextLocale}/app`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update language preference.');
    } finally {
      setUpdatingLanguage(false);
    }
  }

  async function handleCompleteOnboarding() {
    setSyncingProfile(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Session is missing. Please sign in again.');
      }
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) {
        throw new Error('Missing email address in your auth profile.');
      }
          const fullName =
            user?.fullName ??
            ([user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              user?.username ||
              email.split('@')[0]);

      await syncUser(token, {
        email,
        phone: user?.primaryPhoneNumber?.phoneNumber,
        fullName,
        profilePhotoUrl: user?.imageUrl,
        primaryRole: 'renter',
        languagePreference: locale,
      });

      const refreshed = await getMe(token);
      setProfile(refreshed);
      setNeedsOnboarding(false);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Unable to complete onboarding.');
    } finally {
      setSyncingProfile(false);
    }
  }

  async function withToken<T>(handler: (token: string) => Promise<T>): Promise<T | null> {
    const token = await getToken();
    if (!token) {
      setError('Session is missing. Please sign in again.');
      return null;
    }
    return handler(token);
  }

  async function runBookingAction(action: 'cancel' | 'complete' | 'flag') {
    if (!selectedBooking) {
      return;
    }
    await withToken(async (token) => {
      if (action === 'cancel') {
        const lessThan24Hours = new Date(selectedBooking.startAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
        const proceed = window.confirm(
          lessThan24Hours
            ? 'This booking starts in less than 24 hours and may affect trust score. Continue?'
            : 'Cancel this booking?',
        );
        if (!proceed) {
          return;
        }
        await cancelBooking(token, selectedBooking.bookingType, selectedBooking.id);
      } else if (action === 'complete') {
        await markBookingComplete(token, selectedBooking.bookingType, selectedBooking.id);
      } else {
        const reason = window.prompt('Issue details');
        if (!reason) {
          return;
        }
        await flagBookingIssue(token, selectedBooking.bookingType, selectedBooking.id, reason);
      }
      await loadDashboardData(token);
    });
  }

  async function handleReviewSubmit() {
    if (!reviewTarget) {
      return;
    }
    await withToken(async (token) => {
      await createReview(token, {
        toUserId: reviewTarget.toUserId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
        carBookingId: reviewTarget.bookingType === 'car' ? reviewTarget.bookingId : undefined,
        driverBookingId: reviewTarget.bookingType === 'driver' ? reviewTarget.bookingId : undefined,
      });
      setReviewTarget(null);
      setReviewRating(5);
      setReviewComment('');
      setNotifications((previous) => ['Review submitted.', ...previous].slice(0, 6));
    });
  }

  async function handleSubscription(mode: 'initiate' | 'upgrade') {
    await withToken(async (token) => {
      const payload = {
        tier: subscriptionTier,
        paymentMethod: subscriptionPaymentMethod,
        mobileNumber: subscriptionPhone,
        ...(subscriptionPromo.trim() ? { promoCode: subscriptionPromo.trim() } : {}),
      };
      const result =
        mode === 'initiate'
          ? await initiateSubscription(token, payload)
          : await upgradeSubscription(token, payload);
      if (result.redirectUrl) {
        window.open(result.redirectUrl, '_blank', 'noopener,noreferrer');
      }
      setNotifications((previous) => [
        result.status === 'active' ? 'Promo applied. Your plan is live.' : 'Subscription payment request sent.',
        ...previous,
      ].slice(0, 6));
      await loadDashboardData(token);
    });
  }

  async function toggleCarStatus(car: OwnerCar) {
    await withToken(async (token) => {
      try {
        if (car.status === 'active') {
          await pauseCar(token, car.id);
        } else if (car.status === 'paused' || car.status === 'draft') {
          await publishCar(token, car.id);
        }
      } catch (toggleError) {
        const message =
          toggleError instanceof Error ? toggleError.message : 'Unable to update listing status.';
        setError(message);
        if (message.toLowerCase().includes('subscription')) {
          setNotifications((previous) => ['A subscription is required before publishing.', ...previous].slice(0, 6));
          setActiveSection('subscription');
        }
        return;
      }
      await loadDashboardData(token);
    });
  }

  async function handleListingSubmit(payload: CarListingPayload, publishNow: boolean) {
    await withToken(async (token) => {
      const listing = editingCar
        ? await updateCarListing(token, editingCar.id, payload)
        : await createCarListing(token, payload);
      if (publishNow) {
        await publishCar(token, listing.id);
      }
      setListingWizardOpen(false);
      setEditingCar(null);
      await loadDashboardData(token);
    });
  }

  if (loading) {
    return <AppLoadingSkeleton />;
  }

  if (needsOnboarding) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-bold text-foreground">Complete onboarding</h1>
        <p className="mt-3 text-muted-foreground">
          Finish account setup to enter the app. You can become a hoster, driver, or taxi driver later from the menu.
        </p>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={handleCompleteOnboarding}
          disabled={syncingProfile}
          className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {syncingProfile ? 'Completing...' : 'Continue'}
        </button>
      </main>
    );
  }

  const pendingRequests = bookings.filter((item) => item.status === 'pending' && item.youAre === 'renter');
  const activeBookings = bookings.filter((item) => item.status === 'active');
  const completedBookings = bookings.filter(
    (item) => item.status === 'completed' || item.status === 'auto_completed',
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        locale={currentLocale}
        onLocaleChange={(next) => handleLanguageChange(next)}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
      />

      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
        {/* Welcome + Search & Book (VELOCITY reference: button top-right of welcome) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
              {t('app.welcome')}, {profile?.fullName?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile?.primaryRole.replace('_', ' ')}
              {profile?.primaryRole === 'renter' || profile?.roles?.includes('renter')
                ? ` • ${t('app.welcomeSubtitle')}`
                : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 gap-y-1">
              {profile && profile.roles.length > 1 ? (
                <>
                  <div className="flex gap-1.5">
                    {profile.roles
                      .filter((r) => r !== profile.primaryRole)
                      .map((role) => (
                        <Badge key={role} className="bg-gray-200 text-muted-foreground text-xs font-medium">
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                  </div>
                  {trustScore !== null ? (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <Badge className="bg-brand-soft text-brand text-xs font-medium">
                        {t('trust.score')}: {trustScore.toFixed(1)}
                      </Badge>
                    </>
                  ) : null}
                </>
              ) : trustScore !== null ? (
                <Badge className="bg-brand-soft text-brand text-xs font-medium">
                  {t('trust.score')}: {trustScore.toFixed(1)}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

      <div className="-mx-4 flex overflow-x-auto border-b-2 border-border bg-card px-4 md:mx-0 md:px-0">
        <nav className="flex gap-1 py-2" aria-label="Dashboard navigation">
          {profile?.roles.includes('car_owner') ? (
            <>
              <Link
                href={`/${currentLocale}/app/cars`}
                className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                  activeSection === 'cars' ? 'border-brand bg-brand text-white' : 'border-transparent text-muted-foreground hover:border-neutral-300 hover:bg-muted hover:text-foreground'
                }`}
              >
                {t('app.nav.cars')}
              </Link>
              <Link
                href={`/${currentLocale}/app/subscription`}
                className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                  activeSection === 'subscription' ? 'border-brand bg-brand text-white' : 'border-transparent text-muted-foreground hover:border-neutral-300 hover:bg-muted hover:text-foreground'
                }`}
              >
                {t('app.nav.subscription')}
              </Link>
            </>
          ) : null}
          {profile?.roles.includes('driver') ? (
            <>
              <Link
                href={`/${currentLocale}/app?section=overview`}
                className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                  activeSection === 'overview' ? 'border-brand bg-brand text-white' : 'border-transparent text-muted-foreground hover:border-neutral-300 hover:bg-muted hover:text-foreground'
                }`}
              >
                {t('app.nav.status')}
              </Link>
              {!profile.roles.includes('car_owner') ? (
                <Link
                  href={`/${currentLocale}/app/subscription`}
                  className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                    activeSection === 'subscription' ? 'border-brand bg-brand text-white' : 'border-transparent text-muted-foreground hover:border-neutral-300 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {t('app.nav.subscription')}
                </Link>
              ) : null}
              <Link
                href={`/${currentLocale}/app/driver-profile`}
                className="shrink-0 rounded border-2 border-transparent px-3 py-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground transition-all hover:border-neutral-300 hover:bg-muted hover:text-foreground"
              >
                {t('app.nav.availability')}
              </Link>
            </>
          ) : null}
          <Link
            href={`/${currentLocale}/app/bookings`}
            className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
              activeSection === 'bookings' ? 'border-brand bg-brand text-white' : 'border-transparent text-muted-foreground hover:border-neutral-300 hover:bg-muted hover:text-foreground'
            }`}
          >
            {t('app.nav.bookings')}
          </Link>
          <Link
            href={`/${currentLocale}/app/settings`}
            className="shrink-0 rounded border-2 border-transparent px-3 py-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground transition-all hover:border-neutral-300 hover:bg-muted hover:text-foreground"
          >
            {t('app.nav.settings')}
          </Link>
        </nav>
      </div>

      {activeSection === 'overview' && profile?.roles.includes('driver') ? (
        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('app.stats.pendingRequests')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-foreground">{pendingRequests.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('app.stats.activeBookings')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-foreground">{activeBookings.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('app.stats.completedBookings')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-foreground">{completedBookings.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('app.stats.activeListingsJobs')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-foreground">
              {profile?.roles.includes('car_owner')
                ? cars.filter((car) => car.status === 'active').length
                : driverProfile?.bookingStats.active ?? 0}
            </p>
          </div>

          {profile?.roles.includes('driver') ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Live status</p>
                <p className="mt-2 text-2xl font-black text-foreground">
                  {driverProfile && driverSubscription?.isActive ? 'Live' : 'Hidden'}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {driverProfile && driverSubscription?.isActive
                    ? 'Visible in driver search.'
                    : 'Complete your profile and subscribe to appear in search.'}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subscription</p>
                <p className="mt-2 text-2xl font-black text-foreground">
                  {driverSubscription?.isActive ? 'Active' : 'None'}
                </p>
                <Link
                  href={`/${currentLocale}/app/subscription`}
                  className="mt-2 inline-block text-xs font-black uppercase tracking-wide text-brand"
                >
                  Manage plan →
                </Link>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:col-span-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Availability</p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  Set when you work and which services you offer.
                </p>
                <Link
                  href={`/${currentLocale}/app/driver-profile`}
                  className="mt-3 inline-block rounded border-2 border-border bg-card px-3 py-1.5 text-xs font-black uppercase tracking-wide text-foreground shadow-brutal-xs"
                >
                  Edit availability
                </Link>
              </div>
            </>
          ) : null}

          {profile?.roles.includes('driver') && driverProfile?.categories?.length ? (
            <Card className="overflow-hidden border-border bg-card shadow-sm sm:col-span-2 md:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t('app.driver.categories')}</CardTitle>
                <a
                  href={`/${locale}/app/driver-profile`}
                  className="rounded border-2 border-border bg-card px-3 py-1 text-xs font-black text-foreground shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  Edit Profile
                </a>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {driverProfile.categories.map((category) => (
                  <Badge key={category} variant="secondary" className="font-medium">
                    {category.replaceAll('_', ' ')}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : profile?.roles.includes('driver') && !driverProfile ? (
            <div className="overflow-hidden rounded-md border-2 border-amber-500 bg-amber-50 p-5 shadow-brutal-xs sm:col-span-2 md:col-span-4">
              <p className="font-black text-foreground">Complete Your Driver Profile</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Set up your driver profile to start receiving booking requests from customers.
              </p>
              <a
                href={`/${locale}/app/driver-profile`}
                className="mt-3 inline-block rounded border-2 border-brand-strong bg-brand px-4 py-2 text-sm font-black text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
              >
                Set Up Driver Profile →
              </a>
            </div>
          ) : null}

          {pendingRequests.map((booking) => (
            <Card key={booking.key} className="overflow-hidden border-border bg-card shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{booking.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{t('app.booking.status')}: {booking.status.replaceAll('_', ' ')}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(booking.startAt).toLocaleString()} to {new Date(booking.endAt).toLocaleString()}
                </p>
                <p className="font-medium text-amber-200">{t('app.booking.deskConfirming')}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {activeSection === 'cars' ? (
        <section className="space-y-3">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingCar(null);
                setListingWizardOpen(true);
              }}
            >
              {t('app.cars.newListing')}
            </Button>
          </div>
          {cars.map((car) => (
            <Card key={car.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{car.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {car.brand} {car.model} • {car.locationText}
                  </p>
                  <div className="mt-2 flex gap-2 text-xs">
                    <Badge variant="secondary">{car.status.replaceAll('_', ' ')}</Badge>
                    <Badge variant="secondary">Pending: {car.bookingCounts.pending}</Badge>
                    <Badge variant="secondary">Active: {car.bookingCounts.active}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{formatCurrencyRwf(car.dailyRateKigaliRwf)}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCar(car);
                      setListingWizardOpen(true);
                    }}
                  >
                    {t('app.actions.edit')}
                  </Button>
                  <Button variant="outline" onClick={() => toggleCarStatus(car)}>
                    {car.status === 'active' ? t('app.actions.pause') : t('app.actions.publish')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {cars.length === 0 ? <p className="text-sm text-muted-foreground">{t('app.cars.empty')}</p> : null}
        </section>
      ) : null}

      {activeSection === 'subscription' ? (
        <section className="space-y-6">
          {/* Car Owner Subscription */}
          {profile?.roles.includes('car_owner') ? (
            <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
              <Card>
                <CardHeader className="border-b border-gray-100 pb-3">
                  <CardTitle className="text-base">{t('app.subscription.currentTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {subscription?.subscription ? (
                    <>
                      <div className="flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-brand">Plan</p>
                          <p className="text-lg font-bold capitalize text-brand-strong">
                            {subscription.subscription.tier === 'enterprise' ? 'Extra Premium' : subscription.subscription.tier}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          subscription.subscription.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : subscription.subscription.status === 'cancelled'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-muted-foreground'
                        }`}>
                          {subscription.subscription.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg border border-gray-100 px-3 py-2 text-center">
                          <p className="text-xs text-muted-foreground">Active cars</p>
                          <p className="font-semibold">{subscription.activeCars}</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 px-3 py-2 text-center">
                          <p className="text-xs text-muted-foreground">Limit</p>
                          <p className="font-semibold">{subscription.maxCars ?? '∞'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 px-3 py-2 text-center">
                          <p className="text-xs text-muted-foreground">Can publish</p>
                          <p className="font-semibold">{subscription.canPublish ? '✓' : '✗'}</p>
                        </div>
                      </div>
                      {subscription.subscription.renewsAt && (
                        <p className="text-xs text-muted-foreground">
                          Renews {new Date(subscription.subscription.renewsAt).toLocaleDateString('en-RW', { dateStyle: 'medium' })}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {[
                          subscription.locationBoost ? 'Location boost' : null,
                          subscription.verified ? 'Verified badge' : null,
                          subscription.instantBooking ? 'Instant booking' : null,
                          subscription.publicContact ? 'Public contact' : 'Contact after confirmation',
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-muted-foreground">
                      No active subscription. Start one to publish your cars.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b border-gray-100 pb-3">
                  <CardTitle className="text-base">{t('app.subscription.upgradeTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <select
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground"
                    value={subscriptionTier}
                    onChange={(event) => setSubscriptionTier(event.target.value as 'basic' | 'premium' | 'enterprise')}
                  >
                    <option value="basic">Basic 10,000 RWF (1 car)</option>
                    <option value="premium">Premium 25,000 RWF (5 cars + location boost)</option>
                    <option value="enterprise">Extra Premium 50,000 RWF (unlimited, verified, instant booking, public contact)</option>
                  </select>
                  <select
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground"
                    value={subscriptionPaymentMethod}
                    onChange={(event) => setSubscriptionPaymentMethod(event.target.value as 'mtn_momo' | 'airtel_money')}
                  >
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                  </select>
                  <input
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    value={subscriptionPhone}
                    onChange={(event) => setSubscriptionPhone(event.target.value)}
                    placeholder={t('app.subscription.mobilePlaceholder')}
                  />
                  <input
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    value={subscriptionPromo}
                    onChange={(event) => setSubscriptionPromo(event.target.value)}
                    placeholder="Promo code (optional)"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-brand hover:bg-brand-hover"
                      onClick={() => handleSubscription(subscription?.subscription ? 'upgrade' : 'initiate')}
                    >
                      {subscription?.subscription ? t('app.subscription.upgrade') : t('app.subscription.startPayment')}
                    </Button>
                    {subscription?.subscription?.status === 'active' ? (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => withToken(async (token) => {
                          await cancelSubscription(token);
                          setNotifications((prev) => ['Subscription cancelled. Active until renewal date.', ...prev].slice(0, 6));
                          await loadDashboardData(token);
                        })}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* Payment history */}
              {subscriptionHistory.length > 0 ? (
                <Card className="md:col-span-2">
                  <CardHeader className="border-b border-gray-100 pb-3">
                    <CardTitle className="text-base">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {subscriptionHistory.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div>
                            <span className="font-medium capitalize">{payment.tier ?? 'Driver'} plan</span>
                            <span className="ml-2 text-xs text-gray-400">
                              {new Date(payment.createdAt).toLocaleDateString('en-RW', { dateStyle: 'medium' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              payment.status === 'active' ? 'bg-green-100 text-green-700'
                              : payment.status === 'expired' ? 'bg-gray-100 text-muted-foreground'
                              : 'bg-amber-100 text-amber-600'
                            }`}>{payment.status}</span>
                            <span className="font-semibold text-gray-800">
                              {formatCurrencyRwf(payment.amountRwf)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          {/* Driver Subscription */}
          {profile?.roles.includes('driver') ? (
            <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
              <Card>
                <CardHeader className="border-b border-gray-100 pb-3">
                  <CardTitle className="text-base">Driver Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {driverSubscription?.subscription ? (
                    <>
                      <div className="flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-brand">Driver Plan</p>
          <p className="text-lg font-bold text-brand-strong">{formatCurrencyRwf(driverSubscription.planPriceRwf)} / month</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          driverSubscription.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-muted-foreground'
                        }`}>
                          {driverSubscription.isActive ? 'Active' : driverSubscription.subscription.status}
                        </span>
                      </div>
                      {driverSubscription.subscription.renewsAt && (
                        <p className="text-xs text-muted-foreground">
                          Renews {new Date(driverSubscription.subscription.renewsAt).toLocaleDateString('en-RW', { dateStyle: 'medium' })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-muted-foreground">
                      No active driver subscription. Subscribe to appear in search results.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b border-gray-100 pb-3">
                  <CardTitle className="text-base">Subscribe as Driver</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-strong">
                    <strong>{formatCurrencyRwf(driverSubscription?.planPriceRwf ?? 10000)} / month</strong> so customers can find you.
                  </div>
                  <select
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground"
                    value={driverSubPaymentMethod}
                    onChange={(e) => setDriverSubPaymentMethod(e.target.value as 'mtn_momo' | 'airtel_money')}
                  >
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                  </select>
                  <input
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    value={driverSubPhone}
                    onChange={(e) => setDriverSubPhone(e.target.value)}
                    placeholder="Mobile number (e.g. 07XXXXXXXX)"
                  />
                  <input
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    value={driverSubPromo}
                    onChange={(e) => setDriverSubPromo(e.target.value)}
                    placeholder="Promo code (optional)"
                  />
                  <Button
                    className="w-full bg-brand hover:bg-brand-hover"
                    onClick={() => withToken(async (token) => {
                      const result = await initiateDriverSubscription(token, {
                        paymentMethod: driverSubPaymentMethod,
                        mobileNumber: driverSubPhone,
                        ...(driverSubPromo.trim() ? { promoCode: driverSubPromo.trim() } : {}),
                      });
                      if (result.redirectUrl) window.open(result.redirectUrl, '_blank', 'noopener,noreferrer');
                      setNotifications((prev) => ['Driver subscription payment request sent.', ...prev].slice(0, 6));
                      await loadDashboardData(token);
                    })}
                  >
                    {driverSubscription?.isActive ? 'Renew Subscription' : 'Start Subscription'}
                  </Button>
                  {driverSubscription?.isActive ? (
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:bg-red-50"
                      onClick={() => withToken(async (token) => {
                        await cancelDriverSubscription(token);
                        setNotifications((prev) => ['Driver subscription cancelled.', ...prev].slice(0, 6));
                        await loadDashboardData(token);
                      })}
                    >
                      Cancel Subscription
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {profile?.hasTaxiProfile ? (
            <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
              <Card>
                <CardHeader className="border-b border-gray-100 pb-3">
                  <CardTitle className="text-base">Taxi Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {taxiSubscription?.subscription ? (
                    <>
                      <div className="flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-brand">Taxi Plan</p>
                          <p className="text-lg font-bold text-brand-strong">{formatCurrencyRwf(taxiSubscription.planPriceRwf)} / month</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          taxiSubscription.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-muted-foreground'
                        }`}>
                          {taxiSubscription.isActive ? 'Active' : taxiSubscription.subscription.status}
                        </span>
                      </div>
                      {taxiSubscription.subscription.renewsAt && (
                        <p className="text-xs text-muted-foreground">
                          Renews {new Date(taxiSubscription.subscription.renewsAt).toLocaleDateString('en-RW', { dateStyle: 'medium' })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-muted-foreground">
                      No active taxi subscription. Subscribe to appear in search. Phone stays public.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b border-gray-100 pb-3">
                  <CardTitle className="text-base">Subscribe as Taxi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-strong">
                    <strong>{formatCurrencyRwf(taxiSubscription?.planPriceRwf ?? 10000)} / month</strong> to go live. Contacts stay public.
                  </div>
                  <select
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground"
                    value={taxiSubPaymentMethod}
                    onChange={(e) => setTaxiSubPaymentMethod(e.target.value as 'mtn_momo' | 'airtel_money')}
                  >
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                  </select>
                  <input
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    value={taxiSubPhone}
                    onChange={(e) => setTaxiSubPhone(e.target.value)}
                    placeholder="Mobile number (e.g. 07XXXXXXXX)"
                  />
                  <input
                    className="w-full rounded border border-gray-300 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    value={taxiSubPromo}
                    onChange={(e) => setTaxiSubPromo(e.target.value)}
                    placeholder="Promo code (optional)"
                  />
                  <Button
                    className="w-full bg-brand hover:bg-brand-hover"
                    onClick={() => withToken(async (token) => {
                      const result = await initiateTaxiSubscription(token, {
                        paymentMethod: taxiSubPaymentMethod,
                        mobileNumber: taxiSubPhone,
                        ...(taxiSubPromo.trim() ? { promoCode: taxiSubPromo.trim() } : {}),
                      });
                      if (result.redirectUrl) window.open(result.redirectUrl, '_blank', 'noopener,noreferrer');
                      setNotifications((prev) => [
                        result.status === 'active' ? 'Taxi promo applied. You are live.' : 'Taxi subscription payment request sent.',
                        ...prev,
                      ].slice(0, 6));
                      await loadDashboardData(token);
                    })}
                  >
                    {taxiSubscription?.isActive ? 'Renew Subscription' : 'Start Subscription'}
                  </Button>
                  {taxiSubscription?.isActive ? (
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:bg-red-50"
                      onClick={() => withToken(async (token) => {
                        await cancelTaxiSubscription(token);
                        setNotifications((prev) => ['Taxi subscription cancelled.', ...prev].slice(0, 6));
                        await loadDashboardData(token);
                      })}
                    >
                      Cancel Subscription
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeSection === 'bookings' ? (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-foreground">{t('app.bookings.title')}</h2>
          {bookings.length === 0 ? (
            <div className="rounded-md border-2 border-border bg-card py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">{t('app.bookings.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const imgSrc = booking.photoUrl ?? (booking.bookingType === 'driver' ? stockImages.carInterior : stockImages.carPlaceholder);
                const isExpanded = selectedBookingKey === booking.key;
                const statusColors =
                  booking.status === 'cancelled' || booking.status === 'auto_cancelled'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : booking.status === 'active'
                      ? 'border-brand/25 bg-brand-soft text-brand'
                      : booking.status === 'confirmed'
                        ? 'border-brand/20 bg-brand-soft text-brand-strong'
                        : booking.status === 'pending'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-border bg-neutral-50 text-muted-foreground';
                const counterpartyLabel = booking.youAre === 'renter'
                  ? (booking.bookingType === 'driver' ? t('app.bookings.driver') : t('app.bookings.owner'))
                  : t('app.bookings.renter');
                const statusLabel = booking.status === 'auto_cancelled' || booking.status === 'cancelled_by_renter' || booking.status === 'cancelled_by_owner' || booking.status === 'cancelled_admin' ? 'Cancelled' : booking.status.replaceAll('_', ' ');
                return (
                  <div
                    key={booking.key}
                    className={`overflow-hidden rounded-md border-2 bg-card transition-all ${
                      isExpanded ? 'border-brand shadow-brutal-xs' : 'border-border hover:border-neutral-400'
                    }`}
                  >
                    {/* Compact row */}
                    <button
                      type="button"
                      onClick={() => setSelectedBookingKey(isExpanded ? null : booking.key)}
                      className="flex w-full items-center gap-4 p-4 text-left"
                    >
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border-2 border-border bg-muted">
                        <Image src={imgSrc} alt="" fill sizes="96px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-black text-foreground">{booking.title}</p>
                          <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-bold capitalize ${statusColors}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {new Date(booking.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(booking.endAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                          {counterpartyLabel}: <span className="text-foreground">{booking.counterpartyName}</span>
                          <span className="mx-2 text-neutral-300">·</span>
                          <span className="font-black text-brand">{formatCurrencyRwf(booking.amountRwf)}</span>
                        </p>
                      </div>
                      <div className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="border-t-2 border-neutral-100 bg-neutral-50 px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Booking Details</p>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-muted-foreground">
                                <span className="font-black text-foreground">Start:</span>{' '}
                                {new Date(booking.startAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </p>
                              <p className="font-medium text-muted-foreground">
                                <span className="font-black text-foreground">End:</span>{' '}
                                {new Date(booking.endAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </p>
                              <p className="font-medium text-muted-foreground">
                                <span className="font-black text-foreground">Amount:</span>{' '}
                                <span className="text-brand">{formatCurrencyRwf(booking.amountRwf)}</span>
                              </p>
                              {booking.status === 'pending' && (
                                <p className="font-medium text-amber-700">
                                  {t('app.booking.deskConfirming')}
                                </p>
                              )}
                              {booking.youAre === 'renter' && booking.counterpartyPhone && (booking.status === 'confirmed' || booking.status === 'active') && (
                                <p className="font-medium text-muted-foreground">
                                  <span className="font-black text-foreground">{t('app.booking.providerContact')}:</span>{' '}
                                  <a href={`tel:${booking.counterpartyPhone.replace(/\s/g, '')}`} className="text-brand">
                                    {booking.counterpartyName} · {booking.counterpartyPhone}
                                  </a>
                                  {booking.counterpartyWhatsapp ? (
                                    <>
                                      {' · '}
                                      <a
                                        href={`https://wa.me/${booking.counterpartyWhatsapp.replace(/\D/g, '')}`}
                                        className="text-brand"
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        WhatsApp
                                      </a>
                                    </>
                                  ) : null}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Actions</p>
                            <div className="flex flex-wrap gap-2">
                              {booking.canCancel && (
                                <button type="button" onClick={() => runBookingAction('cancel')} className="rounded border-2 border-border bg-card px-3 py-1.5 text-xs font-black text-foreground hover:bg-muted">
                                  {t('app.actions.cancel')}
                                </button>
                              )}
                              {booking.canMarkComplete && (
                                <button type="button" onClick={() => runBookingAction('complete')} className="rounded border-2 border-border bg-card px-3 py-1.5 text-xs font-black text-foreground hover:bg-muted">
                                  {t('app.actions.markComplete')}
                                </button>
                              )}
                              {booking.canFlagIssue && (
                                <button type="button" onClick={() => runBookingAction('flag')} className="rounded border-2 border-border bg-card px-3 py-1.5 text-xs font-black text-foreground hover:bg-muted">
                                  {t('app.actions.flagIssue')}
                                </button>
                              )}
                              {(booking.status === 'completed' || booking.status === 'auto_completed') && (
                                <button
                                  type="button"
                                  onClick={() => setReviewTarget({ open: true, bookingType: booking.bookingType, bookingId: booking.id, toUserId: booking.counterpartyId, toName: booking.counterpartyName })}
                                  className="rounded border-2 border-border bg-card px-3 py-1.5 text-xs font-black text-foreground hover:bg-muted"
                                >
                                  {t('app.actions.leaveReview')}
                                </button>
                              )}
                            </div>
                            {booking.canCancel && new Date(booking.startAt).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
                              <p className="text-xs font-medium text-amber-600">{t('app.booking.cancelWarning')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {(error || appBusy) ? (
        <div className={`flex items-center gap-2 rounded border-2 px-4 py-3 text-sm font-semibold ${error ? 'border-red-600 bg-red-50 text-red-700' : 'border-neutral-300 bg-muted text-muted-foreground'}`}>
          {appBusy && !error ? <LoadingSpinner className="h-4 w-4 shrink-0" /> : null}
          {error ?? 'Refreshing dashboard...'}
        </div>
      ) : null}

      <Dialog open={Boolean(reviewTarget?.open)} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('app.review.title')} {reviewTarget?.toName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm">
              {t('app.review.rating')}
              <input
                type="number"
                min={1}
                max={5}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={reviewRating}
                onChange={(event) => setReviewRating(Number(event.target.value))}
              />
            </label>
            <label className="block text-sm">
              {t('app.review.comment')}
              <textarea
                className="mt-1 min-h-24 w-full rounded border p-3 text-sm"
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
              />
            </label>
            <Button onClick={handleReviewSubmit}>{t('app.review.submit')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <OwnerListingWizard
        open={listingWizardOpen}
        onOpenChange={(open) => {
          setListingWizardOpen(open);
          if (!open) {
            setEditingCar(null);
          }
        }}
        initialCar={editingCar}
        canPublish={Boolean(subscription?.canPublish)}
        onSubmit={handleListingSubmit}
        getToken={async () => (await getToken()) ?? null}
      />
    </main>
    </div>
  );
}
