'use client';

import React from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@rentingi/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { MediaImage } from '@/components/web/media-image';
import {
  cancelBooking,
  createCarListing,
  createReview,
  flagBookingIssue,
  getCarBookingsMine,
  getCarsMine,
  getDriverBookingsMine,
  getDriverProfileFull,
  getMe,
  getTaxiDriverMe,
  markBookingComplete,
  patchLanguagePreference,
  setCarListingStatus,
  type CarMarketplaceVisibility,
  publishCar,
  syncUser,
  updateCarListing,
  type CarBooking,
  type CarListingPayload,
  type DriverBooking,
  type DriverProfileFull,
  type MeResponse,
  type OwnerCar,
  type TaxiDriverMe,
} from '@/lib/api';
import { formatCurrencyRwf } from '@/lib/format';
import { setLocaleCookie } from '@/lib/locale';
import { stockImages } from '@/lib/stock-images';
import { connectSocket, socket } from '@/lib/socket';
import { useStore } from '@/lib/store';
import { DashboardHeader } from '@/components/web/dashboard-header';
import {
  DashboardNav,
  filterOwnerCars,
  parseCarListingFilter,
  resolveDashboardNavKey,
} from '@/components/web/dashboard-nav';
import { AppLoadingSkeleton, LoadingSpinner } from '@/components/web/loading-states';
import { DashboardOverview } from '@/components/web/dashboard-overview';
import { OwnerDashboardCarList } from '@/components/web/owner-dashboard-car-card';
import { OwnerListingWizard } from '@/components/web/owner-listing-wizard';
import Link from 'next/link';

type AppPageProps = {
  params: Promise<{ locale: string }>;
};

type BookingType = 'car' | 'driver';
type DashboardSection = 'overview' | 'cars' | 'bookings';

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
  const pathname = usePathname();
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
  const [driverProfileFull, setDriverProfileFull] = useState<DriverProfileFull | null>(null);
  const [taxiProfile, setTaxiProfile] = useState<TaxiDriverMe | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
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
  const [listingWizardOpen, setListingWizardOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<OwnerCar | null>(null);
  const storeLocale = useStore((state) => state.locale);
  const storeSetLocale = useStore((state) => state.setLocale);
  const tokenRef = useRef<string | null>(null); // socket only; API calls always use fresh getToken()

  const sectionFromQuery = useMemo<DashboardSection | null>(() => {
    const section = searchParams.get('section');
    if (section === 'overview' || section === 'cars' || section === 'bookings') {
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
      const loadDriver = profile.roles.includes('driver') || profile.hasDriverProfile;
      const loadTaxi = Boolean(profile.hasTaxiProfile);

      const [carData, driverData, carMine, driverFull, taxiMe] = await Promise.all([
        getCarBookingsMine(token),
        getDriverBookingsMine(token),
        profile.roles.includes('car_owner') ? getCarsMine(token) : Promise.resolve([]),
        loadDriver ? getDriverProfileFull(token).catch(() => null) : Promise.resolve(null),
        loadTaxi ? getTaxiDriverMe(token).catch(() => null) : Promise.resolve(null),
      ]);
      setCarBookings(carData);
      setDriverBookings(driverData);
      setCars(carMine);
      setDriverProfileFull(driverFull);
      setTaxiProfile(taxiMe);
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
    socket.on('booking:new_request', bookingNewRequestHandler);
    socket.on('booking:confirmed', bookingConfirmedHandler);
    socket.on('booking:declined', bookingDeclinedHandler);
    socket.on('booking:auto_cancelled', bookingAutoCancelledHandler);
    socket.on('booking:mark_complete_received', refreshHandler);
    socket.on('review:prompt', reviewHandler);
    socket.on('trust_score:updated', trustHandler);

    return () => {
      socket.off('booking:new_request', bookingNewRequestHandler);
      socket.off('booking:confirmed', bookingConfirmedHandler);
      socket.off('booking:declined', bookingDeclinedHandler);
      socket.off('booking:auto_cancelled', bookingAutoCancelledHandler);
      socket.off('booking:mark_complete_received', refreshHandler);
      socket.off('review:prompt', reviewHandler);
      socket.off('trust_score:updated', trustHandler);
    };
  }, [bookings, profile]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const isHoster = profile.roles.includes('car_owner');
    const isDriver = profile.roles.includes('driver');

    if (sectionFromQuery === 'overview') {
      setActiveSection('overview');
      return;
    }

    if (sectionFromQuery === 'cars' && isHoster) {
      setActiveSection('cars');
      return;
    }

    if (sectionFromQuery === 'bookings') {
      setActiveSection('bookings');
      return;
    }

    setActiveSection('overview');
  }, [profile, sectionFromQuery]);

  function goToDashboardSection(section: DashboardSection) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('section', section);
    if (section !== 'cars') {
      next.delete('filter');
    }
    router.push(`/${currentLocale}/app?${next.toString()}`);
  }

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

  async function changeCarMarketplaceStatus(car: OwnerCar, status: CarMarketplaceVisibility) {
    await withToken(async (token) => {
      try {
        await setCarListingStatus(token, car.id, status);
      } catch (toggleError) {
        const message =
          toggleError instanceof Error ? toggleError.message : 'Unable to update listing status.';
        setError(message);
        return;
      }
      await loadDashboardData(token);
    });
  }

  async function submitCarForApproval(car: OwnerCar) {
    await withToken(async (token) => {
      try {
        await publishCar(token, car.id);
      } catch (toggleError) {
        const message =
          toggleError instanceof Error ? toggleError.message : 'Unable to submit listing.';
        setError(message);
        return;
      }
      await loadDashboardData(token);
    });
  }

  function carMarketplaceSelectValue(car: OwnerCar): CarMarketplaceVisibility | '' {
    if (car.status === 'active') return 'active';
    if (car.status === 'booked') return 'booked';
    if (car.status === 'inactive' || car.status === 'paused') return 'inactive';
    return '';
  }

  function canPickMarketplaceStatus(car: OwnerCar): boolean {
    return (
      car.status === 'active' ||
      car.status === 'inactive' ||
      car.status === 'booked' ||
      car.status === 'paused'
    );
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

  const carListingFilter = parseCarListingFilter(searchParams.get('filter'));
  const navActive = resolveDashboardNavKey(
    pathname,
    searchParams.get('section'),
    searchParams.get('filter'),
    'overview',
  );
  const isCarOwner = profile?.roles.includes('car_owner');
  const displayedCars = isCarOwner ? filterOwnerCars(cars, carListingFilter) : cars;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        locale={currentLocale}
        onLocaleChange={(next) => handleLanguageChange(next)}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
      />

      {profile ? (
        <DashboardNav
          locale={currentLocale}
          roles={profile.roles}
          hasTaxiProfile={profile.hasTaxiProfile}
          hasDriverProfile={profile.hasDriverProfile}
          active={navActive}
        />
      ) : null}

      <main className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {t('app.welcome')}, {profile?.fullName?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {activeSection === 'overview'
                ? t('app.overview.subtitle')
                : activeSection === 'cars' && isCarOwner
                  ? t('app.cars.listingCount', { count: displayedCars.length })
                  : activeSection === 'bookings'
                    ? t('app.nav.bookings')
                    : profile?.primaryRole === 'renter' || profile?.roles?.includes('renter')
                      ? t('app.welcomeSubtitle')
                      : null}
            </p>
          </div>
          {isCarOwner && activeSection === 'cars' ? (
            <Button
              className="shrink-0"
              onClick={() => {
                setEditingCar(null);
                setListingWizardOpen(true);
              }}
            >
              {t('app.cars.newListing')}
            </Button>
          ) : null}
        </div>

      {activeSection === 'overview' && profile ? (
        <DashboardOverview
          locale={currentLocale}
          profile={profile}
          cars={cars}
          bookings={bookings.map((b) => ({
            key: b.key,
            title: b.title,
            status: b.status,
            startAt: b.startAt,
            amountRwf: b.amountRwf,
          }))}
          driverProfile={driverProfileFull}
          taxiProfile={taxiProfile}
          onOpenBookings={() => goToDashboardSection('bookings')}
          onOpenCars={() => goToDashboardSection('cars')}
          onNewListing={
            isCarOwner
              ? () => {
                  setEditingCar(null);
                  setListingWizardOpen(true);
                }
              : undefined
          }
        />
      ) : null}

      {activeSection === 'cars' ? (
        <section className="space-y-3">
          <nav className="flex flex-wrap gap-2" aria-label="Listing filters">
            {(
              [
                ['all', t('app.nav.cars')],
                ['active', t('app.nav.filterActive')],
                ['inactive', t('app.nav.filterInactive')],
                ['booked', t('app.nav.filterBooked')],
              ] as const
            ).map(([filter, label]) => {
              const active = carListingFilter === filter;
              const href =
                filter === 'all'
                  ? `/${currentLocale}/app?section=cars`
                  : `/${currentLocale}/app?section=cars&filter=${filter}`;
              return (
                <Link
                  key={filter}
                  href={href}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    active ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          {displayedCars.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {cars.length === 0 ? t('app.cars.empty') : t('app.cars.emptyFilter')}
              </p>
              {cars.length === 0 ? (
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => {
                    setEditingCar(null);
                    setListingWizardOpen(true);
                  }}
                >
                  {t('app.cars.newListing')}
                </Button>
              ) : null}
            </div>
          ) : (
            <OwnerDashboardCarList
              cars={displayedCars}
              locale={currentLocale}
              labels={{
                edit: t('app.actions.edit'),
                publish: t('app.actions.publish'),
                statusActive: t('app.cars.statusActive'),
                statusInactive: t('app.cars.statusInactive'),
                statusBooked: t('app.cars.statusBooked'),
                pendingApproval: t('app.cars.pendingApproval'),
                viewListing: t('app.cars.viewListing'),
              }}
              marketplaceValueFor={carMarketplaceSelectValue}
              canPickMarketplaceStatus={canPickMarketplaceStatus}
              onEdit={(car) => {
                setEditingCar(car);
                setListingWizardOpen(true);
              }}
              onStatusChange={(car, next) => void changeCarMarketplaceStatus(car, next)}
              onPublish={(car) => void submitCarForApproval(car)}
            />
          )}
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
                        <MediaImage src={imgSrc} alt="" fill sizes="96px" className="object-cover" />
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
        
        onSubmit={handleListingSubmit}
        getToken={async () => (await getToken()) ?? null}
      />
    </main>
    </div>
  );
}
