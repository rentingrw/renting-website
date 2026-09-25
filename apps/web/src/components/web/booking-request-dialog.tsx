'use client';

import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@rentingi/ui';
import { CalendarDays, Car, CheckCircle2, ChevronRight, Clock, MapPin, Phone, ShipWheel, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { AddressInput } from '@/components/web/address-input';
import { AvailabilityCalendar } from '@/components/web/availability-calendar';
import { PickupMapPicker } from '@/components/web/pickup-map-picker';
import {
  createCarBooking,
  createDriverBooking,
  getMe,
  syncUser,
  type CreatedBookingResponse,
  type DriverCategory,
  type ServiceType,
} from '@/lib/api';
import { formatCurrencyRwf } from '@/lib/format';

type CarTarget = {
  mode: 'car';
  id: string;
  title: string;
  ownerLabel: string;
  defaultServiceType: ServiceType;
  exactDailyRate?: number;
  bookedRanges?: Array<{ startDate: string; endDate: string }>;
  instantBooking?: boolean;
};

type DriverTarget = {
  mode: 'driver';
  id: string;
  title: string;
  ownerLabel: string;
  defaultCategory: DriverCategory;
  exactDailyRate?: number;
  instantBooking?: boolean;
};

type BookingRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CarTarget | DriverTarget;
};

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toLocalDatetimeValue(d);
}

function getDefaultEnd(start: string) {
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  return toLocalDatetimeValue(d);
}

function combineDateAndTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
  return d;
}

function parseDuration(startStr: string, endStr: string): { days: number; hours: number; valid: boolean } {
  if (!startStr || !endStr) return { days: 0, hours: 0, valid: false };
  const from = new Date(startStr);
  const to = new Date(endStr);
  const diffMs = to.getTime() - from.getTime();
  if (diffMs <= 0) return { days: 0, hours: 0, valid: false };
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days, hours, valid: true };
}

const LAST_PICKUP_KEY = 'rentingi_last_pickup_address';
const LAST_PHONE_KEY = 'rentingi_last_renter_phone';

export function BookingRequestDialog({ open, onOpenChange, target }: BookingRequestDialogProps) {
  const t = useTranslations('web');
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const defaultStart = getDefaultStart();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(getDefaultEnd(defaultStart));
  const [pickupAddress, setPickupAddress] = useState('');

  const [notes, setNotes] = useState('');
  const [renterPhone, setRenterPhone] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>(
    target.mode === 'car' ? target.defaultServiceType : 'private_driver',
  );
  const [calStart, setCalStart] = useState<Date | null>(null);
  const [calEnd, setCalEnd] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:00');
  const [showMap, setShowMap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [created, setCreated] = useState<CreatedBookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const instantBooking = Boolean(target.instantBooking);

  useEffect(() => {
    if (!open) return;
    const savedPickup = localStorage.getItem(LAST_PICKUP_KEY);
    if (savedPickup) setPickupAddress(savedPickup);
    const savedPhone = localStorage.getItem(LAST_PHONE_KEY);
    const clerkPhone = user?.primaryPhoneNumber?.phoneNumber ?? user?.phoneNumbers?.[0]?.phoneNumber ?? '';
    if (savedPhone) setRenterPhone(savedPhone);
    else if (clerkPhone) setRenterPhone(clerkPhone);
    setCalStart(null);
    setCalEnd(null);
    setStartTime('09:00');
    setEndTime('09:00');
    setSent(false);
    setCreated(null);
    setError(null);
    void (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const me = await getMe(token);
        if (me?.phone) setRenterPhone(me.phone);
      } catch {
        /* keep clerk/local phone */
      }
    })();
  }, [open, getToken, user]);

  const useCalendar = target.mode === 'car' && Array.isArray(target.bookedRanges);

  const duration = useMemo(() => parseDuration(startDate, endDate), [startDate, endDate]);

  const estimatedTotal = useMemo(() => {
    if (!target.exactDailyRate) return null;
    if (!duration.valid) return formatCurrencyRwf(target.exactDailyRate);
    const billableDays = Math.max(1, duration.days + (duration.hours > 0 ? 1 : 0));
    return formatCurrencyRwf(target.exactDailyRate * billableDays);
  }, [duration, target.exactDailyRate]);

  const billableDays = useMemo(() => {
    if (!duration.valid) return 1;
    return Math.max(1, duration.days + (duration.hours > 0 ? 1 : 0));
  }, [duration]);

  function handleStartChange(val: string) {
    setStartDate(val);
    if (val && new Date(endDate) <= new Date(val)) {
      setEndDate(getDefaultEnd(val));
    }
  }

  async function handleSubmit() {
    setError(null);
    if (useCalendar && (!calStart || !calEnd)) {
      setError('Please select both a pick-up date and return date.');
      return;
    }
    if (!startDate || !endDate || !pickupAddress.trim() || !renterPhone.trim()) {
      setError(t('booking.validation'));
      return;
    }
    if (renterPhone.replace(/\D/g, '').length < 10) {
      setError(t('booking.phoneRequired'));
      return;
    }
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) throw new Error(t('booking.signInRequired'));

      const doBook = async (t2: string) => {
        if (target.mode === 'car') {
          return createCarBooking(t2, {
            listingId: target.id,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            pickupAddress: pickupAddress.trim(),
            totalAmountRwf: target.exactDailyRate ?? 0,
            notes: notes.trim() || undefined,
            renterPhone: renterPhone.trim(),
          });
        }
        return createDriverBooking(t2, {
          driverId: target.id,
          serviceType,
          startAt: new Date(startDate).toISOString(),
          endAt: new Date(endDate).toISOString(),
          pickupAddress: pickupAddress.trim(),
          dropoffAddress: dropoffAddress.trim() || undefined,
          totalAmountRwf: target.exactDailyRate ?? 0,
          notes: notes.trim() || undefined,
          renterPhone: renterPhone.trim(),
        });
      };

      try {
        const result = await doBook(token);
        setCreated(result);
      } catch (firstError) {
        const msg = firstError instanceof Error ? firstError.message : '';
        if (msg.toLowerCase().includes('sync') && user) {
          await syncUser(token, {
            email: user.primaryEmailAddress?.emailAddress ?? '',
            fullName: user.fullName ?? user.firstName ?? 'User',
            primaryRole: 'renter',
          });
          setCreated(await doBook(token));
        } else {
          throw firstError;
        }
      }

      if (pickupAddress.trim()) {
        localStorage.setItem(LAST_PICKUP_KEY, pickupAddress.trim());
      }
      if (renterPhone.trim()) {
        localStorage.setItem(LAST_PHONE_KEY, renterPhone.trim());
      }
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('booking.submitFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    const instant = created?.fulfillment === 'instant';
    const contact = created?.providerContact;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md border-2 border-border bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-brand" />
            <h2 className="text-xl font-black">{instant ? t('booking.sentInstant') : t('booking.sent')}</h2>
            <p className="text-sm text-muted-foreground">{instant ? t('booking.countdownNoteInstant') : t('booking.countdownNote')}</p>
            {instant && contact ? (
              <div className="w-full border-2 border-border bg-neutral-50 p-3 text-left text-sm">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('booking.providerContact')}</p>
                <p className="mt-1 font-bold text-foreground">{contact.name}</p>
                {contact.phone ? (
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="mt-1 block text-brand">
                    {contact.phone}
                  </a>
                ) : null}
                {contact.whatsapp ? (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                    className="mt-1 block text-brand"
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp {contact.whatsapp}
                  </a>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              className="border-2 border-border bg-brand px-6 py-2 font-bold text-white hover:bg-brand-hover"
              onClick={() => { setSent(false); setCreated(null); onOpenChange(false); }}
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto border-2 border-border bg-card p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <DialogHeader className="border-b-2 border-border px-5 py-4">
          <DialogTitle className="text-lg font-black">{instantBooking ? t('booking.titleInstant') : t('booking.title')}</DialogTitle>
          <p className="text-xs text-muted-foreground">{instantBooking ? t('booking.subtitleInstant') : t('booking.subtitle')}</p>
        </DialogHeader>

        {/* Target info */}
        <div className="border-b-2 border-border bg-neutral-50 px-5 py-3">
          <p className="font-bold">{target.title}</p>
          <p className="text-xs text-muted-foreground">{target.ownerLabel}</p>
        </div>

        {isSignedIn ? (
          <div className="space-y-5 px-5 pb-6 pt-4">

            {/* Price summary — prominent, at the top */}
            <div className="rounded-none border-2 border-border bg-brand-soft shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-2 border-border px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t('booking.estimated')}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {duration.valid ? (
                    <span>
                      {duration.days > 0 && `${duration.days}d `}
                      {duration.hours > 0 && `${duration.hours}h`}
                      {' '}· {billableDays} billed {billableDays === 1 ? 'day' : 'days'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select dates</span>
                  )}
                </div>
                <p className="text-xl font-black text-brand">
                  {estimatedTotal ?? t('booking.dynamicAmount')}
                </p>
              </div>
            </div>

            {/* Service type — cars only */}
            {target.mode === 'car' && (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Service type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'self_drive' as ServiceType, label: t('filters.selfDrive'), icon: ShipWheel, desc: 'You drive it yourself' },
                    { value: 'with_driver' as ServiceType, label: t('filters.withDriver'), icon: User, desc: 'Owner drives for you' },
                  ] as const).map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setServiceType(value)}
                      className={`flex flex-col items-start gap-1 border-2 p-3 text-left transition-all ${
                        serviceType === value
                          ? 'border-brand bg-brand-soft shadow-[2px_2px_0px_0px_rgba(20,184,166,1)]'
                          : 'border-neutral-300 bg-card hover:border-border'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${serviceType === value ? 'text-brand' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-bold">{label}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            {useCalendar && target.mode === 'car' ? (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Trip dates
                </label>
                <div className="border-2 border-border bg-card p-3">
                  <AvailabilityCalendar
                    carId={target.id}
                    initialBookedRanges={target.bookedRanges ?? []}
                    selectedStart={calStart}
                    selectedEnd={calEnd}
                    onSelect={(start, end) => {
                      setCalStart(start);
                      setCalEnd(end);
                      const s = combineDateAndTime(start, startTime);
                      setStartDate(toLocalDatetimeValue(s));
                      if (end) {
                        const e = combineDateAndTime(end, endTime);
                        setEndDate(toLocalDatetimeValue(e));
                      }
                    }}
                  />
                </div>

                {/* Time pickers — shown once dates are selected */}
                {calStart && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="border-2 border-border bg-card">
                      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                        <Car className="h-3.5 w-3.5 text-brand" />
                        <span className="text-xs font-bold text-muted-foreground">Pick-up time</span>
                      </div>
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => {
                          setStartTime(e.target.value);
                          if (calStart) setStartDate(toLocalDatetimeValue(combineDateAndTime(calStart, e.target.value)));
                        }}
                        className="w-full bg-transparent px-3 py-2 text-sm font-medium outline-none"
                      />
                    </div>
                    <div className={`border-2 bg-card ${calEnd ? 'border-border' : 'border-neutral-300 opacity-50'}`}>
                      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                        <Clock className="h-3.5 w-3.5 text-brand" />
                        <span className="text-xs font-bold text-muted-foreground">Return time</span>
                      </div>
                      <input
                        type="time"
                        value={endTime}
                        disabled={!calEnd}
                        onChange={e => {
                          setEndTime(e.target.value);
                          if (calEnd) setEndDate(toLocalDatetimeValue(combineDateAndTime(calEnd, e.target.value)));
                        }}
                        className="w-full bg-transparent px-3 py-2 text-sm font-medium outline-none disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}

                {endDate && startDate && !duration.valid && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">Return must be after pick-up.</p>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Trip dates
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="border-2 border-border bg-card">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                      <Car className="h-3.5 w-3.5 text-brand" />
                      <span className="text-xs font-bold text-muted-foreground">{t('booking.start')}</span>
                    </div>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => handleStartChange(e.target.value)}
                      className="w-full bg-transparent px-3 py-2 text-sm font-medium outline-none"
                    />
                  </div>
                  <div className="border-2 border-border bg-card">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                      <Clock className="h-3.5 w-3.5 text-brand" />
                      <span className="text-xs font-bold text-muted-foreground">{t('booking.end')}</span>
                    </div>
                    <input
                      type="datetime-local"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-transparent px-3 py-2 text-sm font-medium outline-none"
                    />
                  </div>
                </div>
                {endDate && startDate && !duration.valid && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">End time must be after start time.</p>
                )}
              </div>
            )}

            {/* Pickup */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('booking.pickup')}
              </label>
              <div className="border-2 border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand" />
                  <span className="text-xs font-bold text-muted-foreground">Pick-up location</span>
                </div>
                <AddressInput
                  value={pickupAddress}
                  onChange={setPickupAddress}
                  placeholder="Street, sector, or city"
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                  showLocateMe
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                className="mt-1.5 text-xs font-medium text-brand underline hover:text-brand"
              >
                {showMap ? 'Hide map' : 'Pin on map'}
              </button>
              {showMap && (
                <div className="mt-2 border-2 border-border">
                  <PickupMapPicker
                    address={pickupAddress}
                    onAddressChange={setPickupAddress}
                    loadingLabel={t('map.loading')}
                    hintLabel={t('booking.mapHint')}
                  />
                </div>
              )}
            </div>

            {/* Drop-off — drivers only */}
            {target.mode === 'driver' && (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t('booking.dropoff')}
                </label>
                <div className="border-2 border-neutral-300 bg-card hover:border-border focus-within:border-border">
                  <AddressInput
                    value={dropoffAddress}
                    onChange={setDropoffAddress}
                    placeholder="Street, sector, or city"
                    className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('booking.phone')}
              </label>
              <div className="border-2 border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                  <Phone className="h-3.5 w-3.5 text-brand" />
                  <span className="text-xs font-bold text-muted-foreground">{t('booking.phoneHint')}</span>
                </div>
                <input
                  type="tel"
                  value={renterPhone}
                  onChange={(e) => setRenterPhone(e.target.value)}
                  placeholder="078 000 0000"
                  required
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('booking.specialRequest')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t('booking.specialRequestPlaceholder')}
                className="w-full border-2 border-neutral-300 bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground hover:border-border focus:border-border"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="border-2 border-red-500 bg-red-50 px-4 py-2.5">
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 font-black text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span>{t('booking.sending')}</span>
              ) : (
                <>
                  <span>{instantBooking ? t('booking.sendInstant') : t('booking.send')}</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-5 py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">{t('booking.signInPrompt')}</p>
            <SignInButton mode="modal">
              <button
                type="button"
                className="border-2 border-border bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-hover"
              >
                {t('auth.signIn')}
              </button>
            </SignInButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
