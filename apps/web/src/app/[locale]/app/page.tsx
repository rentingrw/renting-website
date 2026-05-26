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
  type AppRole,
  cancelBooking,
  confirmBooking,
  createCarListing,
  createReview,
  declineBooking,
  flagBookingIssue,
  getBookingMessages,
  getUnreadMessageCount,
  markConversationRead,
  getCarBookingsMine,
  getCarsMine,
  getDriverBookingsMine,
  getDriverProfileMe,
  getMe,
  getSubscriptionOverview,
  getSubscriptionPaymentHistory,
  getDriverSubscriptionOverview,
  getKycStatus,
  submitKyc,
  initiateDriverSubscription,
  cancelDriverSubscription,
  cancelSubscription,
  initiateSubscription,
  markBookingComplete,
  patchLanguagePreference,
  pauseCar,
  publishCar,
  sendBookingMessage,
  syncUser,
  upgradeSubscription,
  updateCarListing,
  type CarBooking,
  type CarListingPayload,
  type ChatMessage,
  type DriverBooking,
  type DriverProfileMe,
  type MeResponse,
  type OwnerCar,
  type SubscriptionOverview,
  type SubscriptionPayment,
  type KycStatus,
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
type DashboardSection = 'overview' | 'cars' | 'bookings' | 'messages' | 'subscription';

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
      needsYourResponse: booking.status === 'pending' && youAre === 'owner',
      canCancel: booking.status === 'confirmed',
      canMarkComplete: booking.status === 'active',
      canFlagIssue: booking.status === 'confirmed' || booking.status === 'active',
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
      needsYourResponse: booking.status === 'pending' && youAre === 'driver',
      canCancel: booking.status === 'confirmed',
      canMarkComplete: booking.status === 'active',
      canFlagIssue: booking.status === 'confirmed' || booking.status === 'active',
    };
  });

  return [...mappedCars, ...mappedDrivers].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function remainingMinutes(createdAt: string): number {
  const deadline = new Date(createdAt).getTime() + 60 * 60 * 1000;
  return Math.max(0, Math.floor((deadline - Date.now()) / 60000));
}

function isLiveChatStatus(status: string): boolean {
  return status === 'confirmed' || status === 'active';
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
  const [selectedRole, setSelectedRole] = useState<AppRole>('renter');
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
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [selectedBookingKey, setSelectedBookingKey] = useState<string | null>(null);
  const [selectedChatKey, setSelectedChatKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
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
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [kycNationalId, setKycNationalId] = useState('');
  const [kycTin, setKycTin] = useState('');
  const [kycCompanyName, setKycCompanyName] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);
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
      section === 'messages' ||
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
  const chatEligible = useMemo(
    () => bookings.filter((item) => item.chatEligible && isLiveChatStatus(item.status)),
    [bookings],
  );
  const selectedChat = useMemo(
    () => chatEligible.find((item) => item.key === selectedChatKey) ?? null,
    [chatEligible, selectedChatKey],
  );

  async function loadDashboardData(token: string) {
    if (!profile) {
      return;
    }
    setAppBusy(true);
    setError(null);
    try {
      const [carData, driverData, carMine, sub, driverMe, history, driverSub, kyc] = await Promise.all([
        getCarBookingsMine(token),
        getDriverBookingsMine(token),
        profile.roles.includes('car_owner') ? getCarsMine(token) : Promise.resolve([]),
        profile.roles.includes('car_owner') ? getSubscriptionOverview(token) : Promise.resolve(null),
        profile.roles.includes('driver') ? getDriverProfileMe(token) : Promise.resolve(null),
        profile.roles.includes('car_owner') ? getSubscriptionPaymentHistory(token) : Promise.resolve([]),
        profile.roles.includes('driver') ? getDriverSubscriptionOverview(token) : Promise.resolve(null),
        profile.roles.includes('car_owner') ? getKycStatus(token).catch(() => null) : Promise.resolve(null),
      ]);
      setCarBookings(carData);
      setDriverBookings(driverData);
      setCars(carMine);
      setSubscription(sub);
      setDriverProfile(driverMe);
      setSubscriptionHistory(history);
      setDriverSubscription(driverSub);
      setKycStatus(kyc);
      const all = toDashboardBookings(profile, carData, driverData);
      if (!selectedBookingKey && all[0]) {
        setSelectedBookingKey(all[0].key);
      }
      const firstChat = all.find((item) => item.chatEligible);
      if (!selectedChatKey && firstChat) {
        setSelectedChatKey(firstChat.key);
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
    async function loadChat() {
      if (!selectedChat) {
        setMessages([]);
        return;
      }
      try {
        const chatToken = await getToken();
        if (!chatToken) return;
        const history = await getBookingMessages(chatToken, selectedChat.bookingType, selectedChat.id);
        setMessages(history);
        void markConversationRead(chatToken, selectedChat.bookingType, selectedChat.id);
      } catch (chatError) {
        setError(chatError instanceof Error ? chatError.message : 'Unable to load chat history.');
      }
    }
    loadChat();
  }, [selectedChat]);

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
    const messageHandler = (payload: unknown) => {
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'bookingType' in payload &&
        'bookingId' in payload &&
        'message' in payload
      ) {
        const body = payload as {
          bookingType: BookingType;
          bookingId: string;
          message: ChatMessage;
        };
        if (selectedChatKey === `${body.bookingType}:${body.bookingId}`) {
          setMessages((previous) => [...previous, body.message]);
        }
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
    socket.on('message:new', messageHandler);
    socket.on('review:prompt', reviewHandler);
    socket.on('trust_score:updated', trustHandler);
    socket.on('subscription:activated', subscriptionActivatedHandler);

    return () => {
      socket.off('booking:new_request', bookingNewRequestHandler);
      socket.off('booking:confirmed', bookingConfirmedHandler);
      socket.off('booking:declined', bookingDeclinedHandler);
      socket.off('booking:auto_cancelled', bookingAutoCancelledHandler);
      socket.off('booking:mark_complete_received', refreshHandler);
      socket.off('message:new', messageHandler);
      socket.off('review:prompt', reviewHandler);
      socket.off('trust_score:updated', trustHandler);
      socket.off('subscription:activated', subscriptionActivatedHandler);
    };
  }, [bookings, profile, selectedChatKey]);

  // Poll for new messages every 5s when in the messages section
  useEffect(() => {
    if (activeSection !== 'messages' || !selectedChat) return;
    const poll = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const history = await getBookingMessages(token, selectedChat.bookingType, selectedChat.id);
        setMessages(history);
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [activeSection, selectedChat?.key, getToken]);

  // Poll for unread message count every 30s and surface a notification
  useEffect(() => {
    if (!profile) return;
    let prev = 0;
    const poll = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const count = await getUnreadMessageCount(token);
        if (count > prev && activeSection !== 'messages') {
          setNotifications((n) => [`You have ${count} unread message${count !== 1 ? 's' : ''}.`, ...n].slice(0, 6));
        }
        prev = count;
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [profile?.id, activeSection, getToken]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (sectionFromQuery === 'cars' || sectionFromQuery === 'subscription') {
      if (profile.roles.includes('car_owner')) {
        setActiveSection(sectionFromQuery);
      } else {
        setActiveSection('bookings');
      }
      return;
    }

    if (sectionFromQuery === 'bookings' || sectionFromQuery === 'messages' || sectionFromQuery === 'overview') {
      setActiveSection(sectionFromQuery);
      return;
    }

    if (profile.roles.includes('car_owner') || profile.roles.includes('driver')) {
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
        primaryRole: selectedRole,
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

  async function runBookingAction(action: 'confirm' | 'decline' | 'cancel' | 'complete' | 'flag') {
    if (!selectedBooking) {
      return;
    }
    await withToken(async (token) => {
      if (action === 'confirm') {
        await confirmBooking(token, selectedBooking.bookingType, selectedBooking.id);
      } else if (action === 'decline') {
        await declineBooking(token, selectedBooking.bookingType, selectedBooking.id);
      } else if (action === 'cancel') {
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

  async function handleSendMessage() {
    if (!selectedChat || !chatInput.trim()) {
      return;
    }
    await withToken(async (token) => {
      const message = await sendBookingMessage(token, {
        bookingType: selectedChat.bookingType,
        bookingId: selectedChat.id,
        content: chatInput.trim(),
      });
      setMessages((previous) => [...previous, message]);
      setChatInput('');
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
      };
      const result =
        mode === 'initiate'
          ? await initiateSubscription(token, payload)
          : await upgradeSubscription(token, payload);
      if (result.redirectUrl) {
        window.open(result.redirectUrl, '_blank', 'noopener,noreferrer');
      }
      setNotifications((previous) => ['Subscription payment request sent.', ...previous].slice(0, 6));
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

  async function handleKycSubmit() {
    if (!kycNationalId.trim() && !kycTin.trim()) {
      setError('Provide at least a National ID number or TIN number.');
      return;
    }
    setKycSubmitting(true);
    setError(null);
    try {
      await withToken(async (token) => {
        await submitKyc(token, {
          nationalIdNumber: kycNationalId.trim() || undefined,
          tinNumber: kycTin.trim() || undefined,
          companyName: kycCompanyName.trim() || undefined,
        });
        setNotifications((prev) => ['KYC information submitted. Awaiting admin review.', ...prev].slice(0, 6));
        const updated = await getKycStatus(token);
        setKycStatus(updated);
        setKycNationalId('');
        setKycTin('');
        setKycCompanyName('');
      });
    } catch (kycError) {
      setError(kycError instanceof Error ? kycError.message : 'Failed to submit KYC.');
    } finally {
      setKycSubmitting(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Complete onboarding</h1>
        <p className="mt-3 text-gray-600">
          Choose your primary role to finish account setup before entering the app.
        </p>
        <div className="mt-6 grid gap-3">
          {(['renter', 'car_owner', 'driver'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`rounded-md border p-4 text-left ${selectedRole === role ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <p className="font-semibold">{role.replace('_', ' ')}</p>
            </button>
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={handleCompleteOnboarding}
          disabled={syncingProfile}
          className="mt-6 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {syncingProfile ? 'Completing...' : 'Continue'}
        </button>
      </main>
    );
  }

  const pendingRequests = bookings.filter((item) => item.needsYourResponse);
  const activeBookings = bookings.filter((item) => item.status === 'active');
  const completedBookings = bookings.filter(
    (item) => item.status === 'completed' || item.status === 'auto_completed',
  );

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
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
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 md:text-3xl">
              {t('app.welcome')}, {profile?.fullName?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
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
                        <Badge key={role} className="bg-gray-200 text-gray-700 text-xs font-medium">
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                  </div>
                  {trustScore !== null ? (
                    <>
                      <span className="text-gray-500">·</span>
                      <Badge className="bg-teal-50 text-teal-700 text-xs font-medium">
                        {t('trust.score')}: {trustScore.toFixed(1)}
                      </Badge>
                    </>
                  ) : null}
                </>
              ) : trustScore !== null ? (
                <Badge className="bg-teal-50 text-teal-700 text-xs font-medium">
                  {t('trust.score')}: {trustScore.toFixed(1)}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

      <div className="-mx-4 flex overflow-x-auto border-b-2 border-neutral-900 bg-white px-4 md:mx-0 md:px-0">
        <nav className="flex gap-1 py-2" aria-label="Dashboard navigation">
          {profile?.roles.includes('car_owner') ? (
            <>
              <Link
                href={`/${currentLocale}/app`}
                className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                  activeSection === 'overview' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {t('app.nav.overview')}
              </Link>
              <Link
                href={`/${currentLocale}/app/cars`}
                className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                  activeSection === 'cars' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {t('app.nav.cars')}
              </Link>
              <Link
                href={`/${currentLocale}/app/subscription`}
                className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                  activeSection === 'subscription' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {t('app.nav.subscription')}
              </Link>
            </>
          ) : null}
          <Link
            href={`/${currentLocale}/app/bookings`}
            className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
              activeSection === 'bookings' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            {t('app.nav.bookings')}
          </Link>
          <Link
            href={`/${currentLocale}/app/messages`}
            className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
              activeSection === 'messages' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            {t('app.nav.messages')}
          </Link>
          <Link
            href={`/${currentLocale}/app/settings`}
            className={`shrink-0 rounded border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
              activeSection === 'settings' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            {t('app.nav.settings')}
          </Link>
        </nav>
      </div>

      {activeSection === 'overview' ? (
        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">{t('app.stats.pendingRequests')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-neutral-900">{pendingRequests.length}</p>
          </div>
          <div className="rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">{t('app.stats.activeBookings')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-neutral-900">{activeBookings.length}</p>
          </div>
          <div className="rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">{t('app.stats.completedBookings')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-neutral-900">{completedBookings.length}</p>
          </div>
          <div className="rounded-md border-2 border-neutral-900 bg-white p-5 shadow-brutal">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">{t('app.stats.activeListingsJobs')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-neutral-900">
              {profile?.roles.includes('car_owner')
                ? cars.filter((car) => car.status === 'active').length
                : driverProfile?.bookingStats.active ?? 0}
            </p>
          </div>

          {profile?.roles.includes('driver') && driverProfile?.categories?.length ? (
            <Card className="overflow-hidden border-gray-200 bg-white shadow-sm sm:col-span-2 md:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t('app.driver.categories')}</CardTitle>
                <a
                  href={`/${locale}/app/driver-profile`}
                  className="rounded border-2 border-neutral-900 bg-white px-3 py-1 text-xs font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
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
              <p className="font-black text-neutral-900">Complete Your Driver Profile</p>
              <p className="mt-1 text-sm font-medium text-neutral-600">
                Set up your driver profile to start receiving booking requests from customers.
              </p>
              <a
                href={`/${locale}/app/driver-profile`}
                className="mt-3 inline-block rounded border-2 border-teal-800 bg-teal-600 px-4 py-2 text-sm font-black text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
              >
                Set Up Driver Profile →
              </a>
            </div>
          ) : null}

          {pendingRequests.map((booking) => (
            <Card key={booking.key} className="overflow-hidden border-gray-200 bg-white shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{booking.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{t('app.booking.from')}: {booking.counterpartyName}</p>
                <p>{t('app.booking.status')}: {booking.status.replaceAll('_', ' ')}</p>
                <p className="text-xs text-gray-500">
                  {new Date(booking.startAt).toLocaleString()} - {new Date(booking.endAt).toLocaleString()}
                </p>
                <p>
                  {t('app.booking.respondWithin')}: <span className="font-semibold">{remainingMinutes(booking.createdAt)} {t('app.booking.minutes')}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      setSelectedBookingKey(booking.key);
                      await runBookingAction('confirm');
                    }}
                  >
                    {t('app.actions.confirm')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setSelectedBookingKey(booking.key);
                      await runBookingAction('decline');
                    }}
                  >
                    {t('app.actions.decline')}
                  </Button>
                </div>
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
                  <p className="text-sm text-gray-500">
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
          {cars.length === 0 ? <p className="text-sm text-gray-500">{t('app.cars.empty')}</p> : null}
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
                      <div className="flex items-center justify-between rounded-lg bg-teal-50 px-4 py-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-teal-600">Plan</p>
                          <p className="text-lg font-bold capitalize text-teal-800">
                            {subscription.subscription.tier}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          subscription.subscription.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : subscription.subscription.status === 'cancelled'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {subscription.subscription.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg border border-gray-100 px-3 py-2 text-center">
                          <p className="text-xs text-gray-500">Active cars</p>
                          <p className="font-semibold">{subscription.activeCars}</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 px-3 py-2 text-center">
                          <p className="text-xs text-gray-500">Limit</p>
                          <p className="font-semibold">{subscription.maxCars ?? '∞'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 px-3 py-2 text-center">
                          <p className="text-xs text-gray-500">Can publish</p>
                          <p className="font-semibold">{subscription.canPublish ? '✓' : '✗'}</p>
                        </div>
                      </div>
                      {subscription.subscription.renewsAt && (
                        <p className="text-xs text-gray-500">
                          Renews {new Date(subscription.subscription.renewsAt).toLocaleDateString('en-RW', { dateStyle: 'medium' })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
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
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    value={subscriptionTier}
                    onChange={(event) => setSubscriptionTier(event.target.value as 'basic' | 'premium' | 'enterprise')}
                  >
                    <option value="basic">Basic — 10,000 RWF (1 car)</option>
                    <option value="premium">Premium — 30,000 RWF (5 cars)</option>
                    <option value="enterprise">Enterprise — 60,000 RWF (unlimited)</option>
                  </select>
                  <select
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    value={subscriptionPaymentMethod}
                    onChange={(event) => setSubscriptionPaymentMethod(event.target.value as 'mtn_momo' | 'airtel_money')}
                  >
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                  </select>
                  <input
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                    value={subscriptionPhone}
                    onChange={(event) => setSubscriptionPhone(event.target.value)}
                    placeholder={t('app.subscription.mobilePlaceholder')}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
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
                              : payment.status === 'expired' ? 'bg-gray-100 text-gray-500'
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
                      <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-blue-600">Driver Plan</p>
                          <p className="text-lg font-bold text-blue-800">5,000 RWF / month</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          driverSubscription.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {driverSubscription.isActive ? 'Active' : driverSubscription.subscription.status}
                        </span>
                      </div>
                      {driverSubscription.subscription.renewsAt && (
                        <p className="text-xs text-gray-500">
                          Renews {new Date(driverSubscription.subscription.renewsAt).toLocaleDateString('en-RW', { dateStyle: 'medium' })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
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
                  <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <strong>5,000 RWF / month</strong> — be visible to customers searching for drivers.
                  </div>
                  <select
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    value={driverSubPaymentMethod}
                    onChange={(e) => setDriverSubPaymentMethod(e.target.value as 'mtn_momo' | 'airtel_money')}
                  >
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                  </select>
                  <input
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                    value={driverSubPhone}
                    onChange={(e) => setDriverSubPhone(e.target.value)}
                    placeholder="Mobile number (e.g. 07XXXXXXXX)"
                  />
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => withToken(async (token) => {
                      const result = await initiateDriverSubscription(token, {
                        paymentMethod: driverSubPaymentMethod,
                        mobileNumber: driverSubPhone,
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

          {/* KYC / Identity Verification */}
          {profile?.roles.includes('car_owner') ? (
            <Card>
              <CardHeader className="border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Identity Verification (KYC)</CardTitle>
                  {kycStatus?.isVerified ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">✓ Verified</span>
                  ) : kycStatus?.hasSubmittedKyc ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Pending Review</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Not Submitted</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {kycStatus?.isVerified ? (
                  <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-800">
                    <p className="font-semibold">Your identity has been verified.</p>
                    {kycStatus.verifiedAt && (
                      <p className="mt-1 text-xs text-green-600">
                        Verified on {new Date(kycStatus.verifiedAt).toLocaleDateString('en-RW', { dateStyle: 'medium' })}
                      </p>
                    )}
                  </div>
                ) : kycStatus?.hasSubmittedKyc ? (
                  <div className="rounded-lg bg-amber-50 px-4 py-4 text-sm text-amber-800">
                    <p className="font-semibold">Your KYC documents are under review.</p>
                    <p className="mt-1 text-xs text-amber-600">
                      {kycStatus.nationalIdSubmitted ? '✓ National ID submitted' : ''}
                      {kycStatus.tinSubmitted ? (kycStatus.nationalIdSubmitted ? ' · ' : '') + '✓ TIN submitted' : ''}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      Submit your National ID or TIN to get verified and build trust with renters.
                    </p>
                    <input
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                      value={kycNationalId}
                      onChange={(e) => setKycNationalId(e.target.value)}
                      placeholder="National ID number"
                    />
                    <input
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                      value={kycTin}
                      onChange={(e) => setKycTin(e.target.value)}
                      placeholder="TIN number (optional)"
                    />
                    <input
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                      value={kycCompanyName}
                      onChange={(e) => setKycCompanyName(e.target.value)}
                      placeholder="Company name (optional)"
                    />
                    <Button
                      className="w-full bg-teal-600 hover:bg-teal-700"
                      onClick={handleKycSubmit}
                      disabled={kycSubmitting}
                    >
                      {kycSubmitting ? 'Submitting...' : 'Submit KYC'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}

      {activeSection === 'bookings' ? (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-neutral-900">{t('app.bookings.title')}</h2>
          {bookings.length === 0 ? (
            <div className="rounded-md border-2 border-neutral-200 bg-white py-16 text-center">
              <p className="text-sm font-medium text-neutral-500">{t('app.bookings.empty')}</p>
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
                      ? 'border-teal-200 bg-teal-50 text-teal-700'
                      : booking.status === 'confirmed'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : booking.status === 'pending'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-600';
                const counterpartyLabel = booking.youAre === 'renter'
                  ? (booking.bookingType === 'driver' ? t('app.bookings.driver') : t('app.bookings.owner'))
                  : t('app.bookings.renter');
                const statusLabel = booking.status === 'auto_cancelled' || booking.status === 'cancelled_by_renter' || booking.status === 'cancelled_by_owner' || booking.status === 'cancelled_admin' ? 'Cancelled' : booking.status.replaceAll('_', ' ');
                return (
                  <div
                    key={booking.key}
                    className={`overflow-hidden rounded-md border-2 bg-white transition-all ${
                      isExpanded ? 'border-teal-600 shadow-brutal-xs' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {/* Compact row */}
                    <button
                      type="button"
                      onClick={() => setSelectedBookingKey(isExpanded ? null : booking.key)}
                      className="flex w-full items-center gap-4 p-4 text-left"
                    >
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border-2 border-neutral-200 bg-neutral-100">
                        <Image src={imgSrc} alt="" fill sizes="96px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-black text-neutral-900">{booking.title}</p>
                          <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-bold capitalize ${statusColors}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500">
                          {new Date(booking.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(booking.endAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-neutral-600">
                          {counterpartyLabel}: <span className="text-neutral-800">{booking.counterpartyName}</span>
                          <span className="mx-2 text-neutral-300">·</span>
                          <span className="font-black text-teal-700">{formatCurrencyRwf(booking.amountRwf)}</span>
                        </p>
                      </div>
                      <div className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="border-t-2 border-neutral-100 bg-neutral-50 px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Booking Details</p>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-neutral-700">
                                <span className="font-black text-neutral-900">Start:</span>{' '}
                                {new Date(booking.startAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </p>
                              <p className="font-medium text-neutral-700">
                                <span className="font-black text-neutral-900">End:</span>{' '}
                                {new Date(booking.endAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </p>
                              <p className="font-medium text-neutral-700">
                                <span className="font-black text-neutral-900">Amount:</span>{' '}
                                <span className="text-teal-700">{formatCurrencyRwf(booking.amountRwf)}</span>
                              </p>
                              {booking.status === 'pending' && (
                                <p className="font-medium text-amber-700">
                                  <span className="font-black">Expires in:</span>{' '}
                                  {remainingMinutes(booking.createdAt)} {t('app.booking.minutes')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Actions</p>
                            <div className="flex flex-wrap gap-2">
                              {isLiveChatStatus(booking.status) && (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedChatKey(booking.key); setActiveSection('messages'); }}
                                  className="rounded border-2 border-teal-800 bg-teal-600 px-3 py-1.5 text-xs font-black text-white hover:bg-teal-700"
                                >
                                  {t('app.bookings.manageBooking')}
                                </button>
                              )}
                              {booking.needsYourResponse && (
                                <>
                                  <button type="button" onClick={() => runBookingAction('confirm')} className="rounded border-2 border-teal-800 bg-teal-600 px-3 py-1.5 text-xs font-black text-white hover:bg-teal-700">
                                    {t('app.actions.confirm')}
                                  </button>
                                  <button type="button" onClick={() => runBookingAction('decline')} className="rounded border-2 border-neutral-900 bg-white px-3 py-1.5 text-xs font-black text-neutral-900 hover:bg-neutral-100">
                                    {t('app.actions.decline')}
                                  </button>
                                </>
                              )}
                              {booking.canCancel && (
                                <button type="button" onClick={() => runBookingAction('cancel')} className="rounded border-2 border-neutral-900 bg-white px-3 py-1.5 text-xs font-black text-neutral-900 hover:bg-neutral-100">
                                  {t('app.actions.cancel')}
                                </button>
                              )}
                              {booking.canMarkComplete && (
                                <button type="button" onClick={() => runBookingAction('complete')} className="rounded border-2 border-neutral-900 bg-white px-3 py-1.5 text-xs font-black text-neutral-900 hover:bg-neutral-100">
                                  {t('app.actions.markComplete')}
                                </button>
                              )}
                              {booking.canFlagIssue && (
                                <button type="button" onClick={() => runBookingAction('flag')} className="rounded border-2 border-neutral-900 bg-white px-3 py-1.5 text-xs font-black text-neutral-900 hover:bg-neutral-100">
                                  {t('app.actions.flagIssue')}
                                </button>
                              )}
                              {(booking.status === 'completed' || booking.status === 'auto_completed') && (
                                <button
                                  type="button"
                                  onClick={() => setReviewTarget({ open: true, bookingType: booking.bookingType, bookingId: booking.id, toUserId: booking.counterpartyId, toName: booking.counterpartyName })}
                                  className="rounded border-2 border-neutral-900 bg-white px-3 py-1.5 text-xs font-black text-neutral-900 hover:bg-neutral-100"
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

      {activeSection === 'messages' ? (
        <section className="grid gap-4 md:grid-cols-[320px_1fr]">
          <Card className="overflow-hidden border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-900">{t('app.messages.threadsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              {chatEligible.map((booking) => (
                <button
                  key={booking.key}
                  type="button"
                  onClick={() => setSelectedChatKey(booking.key)}
                    className={`flex w-full flex-col items-start gap-0.5 border-l-2 px-4 py-3 text-left transition ${
                    selectedChatKey === booking.key
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium">{booking.title}</p>
                  <p className="text-xs text-gray-500">{booking.counterpartyName}</p>
                </button>
              ))}
              {chatEligible.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">{t('app.messages.empty')}</p>
              ) : null}
            </CardContent>
          </Card>
          <Card className="flex flex-col overflow-hidden border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-200 py-4">
              <CardTitle className="text-base text-gray-900">
                {selectedChat ? (
                  <span>
                    {t('app.messages.chatWith')}{' '}
                    {selectedChat.bookingType === 'car' && selectedChat.listingId ? (
                      <Link
                        href={`/${currentLocale}/cars/${selectedChat.listingId}`}
                        className="text-teal-700 underline hover:text-teal-900"
                      >
                        {selectedChat.counterpartyName}
                      </Link>
                    ) : (
                      selectedChat.counterpartyName
                    )}
                  </span>
                ) : t('app.messages.selectThread')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-[400px] flex-1 flex-col gap-4 p-0">
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => {
                  const isMe = message.senderId === profile?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMe ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        {!isMe && <p className="mb-0.5 text-xs font-medium opacity-90">{message.sender.fullName}</p>}
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <p className={`mt-1 text-[10px] ${isMe ? 'opacity-80' : 'text-gray-500'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">{t('app.messages.noMessages')}</p>
                ) : null}
              </div>
              <div className="flex gap-2 border-t p-4">
                <input
                  className="min-w-0 flex-1 rounded border-2 border-neutral-900 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={t('app.messages.inputPlaceholder')}
                />
                <Button onClick={handleSendMessage} disabled={!selectedChat} className="shrink-0 rounded-xl">
                  {t('app.actions.send')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {(error || appBusy) ? (
        <div className={`flex items-center gap-2 rounded border-2 px-4 py-3 text-sm font-semibold ${error ? 'border-red-600 bg-red-50 text-red-700' : 'border-neutral-300 bg-neutral-100 text-neutral-600'}`}>
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
