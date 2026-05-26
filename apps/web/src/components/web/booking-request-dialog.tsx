'use client';

import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@rentingi/ui';
import { CalendarDays, Car, CheckCircle2, ChevronRight, Clock, MapPin, ShipWheel, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { AddressInput } from '@/components/web/address-input';
import { AvailabilityCalendar } from '@/components/web/availability-calendar';
import { PickupMapPicker } from '@/components/web/pickup-map-picker';
import {
  createCarBooking,
  createDriverBooking,
  syncUser,
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
};

type DriverTarget = {
  mode: 'driver';
  id: string;
  title: string;
  ownerLabel: string;
  defaultCategory: DriverCategory;
  exactDailyRate?: number;
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

export function BookingRequestDialog({ open, onOpenChange, target }: BookingRequestDialogProps) {
  const t = useTranslations('web');
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const defaultStart = getDefaultStart();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(getDefaultEnd(defaultStart));
  const [pickupAddress, setPickupAddress] = useState('');

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(LAST_PICKUP_KEY);
      if (saved) setPickupAddress(saved);
      setCalStart(null);
      setCalEnd(null);
      setStartTime('09:00');
      setEndTime('09:00');
    }
  }, [open]);
  const [notes, setNotes] = useState('');
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
  const [error, setError] = useState<string | null>(null);

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
    if (!startDate || !endDate || !pickupAddress.trim()) {
      setError(t('booking.validation'));
      return;
    }
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) throw new Error(t('booking.signInRequired'));

      const doBook = async (t2: string) => {
        if (target.mode === 'car') {
          await createCarBooking(t2, {
            listingId: target.id,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            pickupAddress: pickupAddress.trim(),
            totalAmountRwf: target.exactDailyRate ?? 0,
            notes: notes.trim() || undefined,
          });
        } else {
          await createDriverBooking(t2, {
            driverId: target.id,
            serviceType,
            startAt: new Date(startDate).toISOString(),
            endAt: new Date(endDate).toISOString(),
            pickupAddress: pickupAddress.trim(),
            dropoffAddress: dropoffAddress.trim() || undefined,
            totalAmountRwf: target.exactDailyRate ?? 0,
            notes: notes.trim() || undefined,
          });
        }
      };

      try {
        await doBook(token);
      } catch (firstError) {
        const msg = firstError instanceof Error ? firstError.message : '';
        if (msg.toLowerCase().includes('sync') && user) {
          await syncUser(token, {
            email: user.primaryEmailAddress?.emailAddress ?? '',
            fullName: user.fullName ?? user.firstName ?? 'User',
            primaryRole: 'renter',
          });
          await doBook(token);
        } else {
          throw firstError;
        }
      }

      if (pickupAddress.trim()) {
        localStorage.setItem(LAST_PICKUP_KEY, pickupAddress.trim());
      }
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('booking.submitFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md border-2 border-neutral-900 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-teal-600" />
            <h2 className="text-xl font-black">{t('booking.sent')}</h2>
            <p className="text-sm text-neutral-600">{t('booking.countdownNote')}</p>
            <button
              type="button"
              className="border-2 border-neutral-900 bg-teal-500 px-6 py-2 font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-teal-600"
              onClick={() => { setSent(false); onOpenChange(false); }}
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
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto border-2 border-neutral-900 bg-white p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <DialogHeader className="border-b-2 border-neutral-900 px-5 py-4">
          <DialogTitle className="text-lg font-black">{t('booking.title')}</DialogTitle>
          <p className="text-xs text-neutral-500">{t('booking.subtitle')}</p>
        </DialogHeader>

        {/* Target info */}
        <div className="border-b-2 border-neutral-900 bg-neutral-50 px-5 py-3">
          <p className="font-bold">{target.title}</p>
          <p className="text-xs text-neutral-500">{target.ownerLabel}</p>
        </div>

        {isSignedIn ? (
          <div className="space-y-5 px-5 pb-6 pt-4">

            {/* Price summary — prominent, at the top */}
            <div className="rounded-none border-2 border-neutral-900 bg-teal-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-2 border-neutral-900 px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  {t('booking.estimated')}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <CalendarDays className="h-4 w-4" />
                  {duration.valid ? (
                    <span>
                      {duration.days > 0 && `${duration.days}d `}
                      {duration.hours > 0 && `${duration.hours}h`}
                      {' '}· {billableDays} billed {billableDays === 1 ? 'day' : 'days'}
                    </span>
                  ) : (
                    <span className="text-neutral-400">Select dates</span>
                  )}
                </div>
                <p className="text-xl font-black text-teal-700">
                  {estimatedTotal ?? t('booking.dynamicAmount')}
                </p>
              </div>
            </div>

            {/* Service type — cars only */}
            {target.mode === 'car' && (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
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
                          ? 'border-teal-600 bg-teal-50 shadow-[2px_2px_0px_0px_rgba(20,184,166,1)]'
                          : 'border-neutral-300 bg-white hover:border-neutral-900'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${serviceType === value ? 'text-teal-600' : 'text-neutral-500'}`} />
                      <span className="text-sm font-bold">{label}</span>
                      <span className="text-xs text-neutral-500">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            {useCalendar && target.mode === 'car' ? (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Trip dates
                </label>
                <div className="border-2 border-neutral-900 bg-white p-3">
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
                    <div className="border-2 border-neutral-900 bg-white">
                      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-1.5">
                        <Car className="h-3.5 w-3.5 text-teal-600" />
                        <span className="text-xs font-bold text-neutral-500">Pick-up time</span>
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
                    <div className={`border-2 bg-white ${calEnd ? 'border-neutral-900' : 'border-neutral-300 opacity-50'}`}>
                      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-1.5">
                        <Clock className="h-3.5 w-3.5 text-teal-600" />
                        <span className="text-xs font-bold text-neutral-500">Return time</span>
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
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Trip dates
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="border-2 border-neutral-900 bg-white">
                    <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-1.5">
                      <Car className="h-3.5 w-3.5 text-teal-600" />
                      <span className="text-xs font-bold text-neutral-500">{t('booking.start')}</span>
                    </div>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => handleStartChange(e.target.value)}
                      className="w-full bg-transparent px-3 py-2 text-sm font-medium outline-none"
                    />
                  </div>
                  <div className="border-2 border-neutral-900 bg-white">
                    <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-1.5">
                      <Clock className="h-3.5 w-3.5 text-teal-600" />
                      <span className="text-xs font-bold text-neutral-500">{t('booking.end')}</span>
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
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                {t('booking.pickup')}
              </label>
              <div className="border-2 border-neutral-900 bg-white">
                <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-xs font-bold text-neutral-500">Pick-up location</span>
                </div>
                <AddressInput
                  value={pickupAddress}
                  onChange={setPickupAddress}
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400"
                  showLocateMe
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                className="mt-1.5 text-xs font-medium text-teal-600 underline hover:text-teal-700"
              >
                {showMap ? 'Hide map' : 'Pin on map'}
              </button>
              {showMap && (
                <div className="mt-2 border-2 border-neutral-900">
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
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  {t('booking.dropoff')}
                </label>
                <div className="border-2 border-neutral-300 bg-white hover:border-neutral-900 focus-within:border-neutral-900">
                  <AddressInput
                    value={dropoffAddress}
                    onChange={setDropoffAddress}
                    className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                {t('booking.messageOptional')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special requests or instructions..."
                className="w-full border-2 border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 hover:border-neutral-900 focus:border-neutral-900"
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
              className="flex w-full items-center justify-center gap-2 border-2 border-neutral-900 bg-teal-500 px-4 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-teal-600 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span>{t('booking.sending')}</span>
              ) : (
                <>
                  <span>{t('booking.send')}</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-5 py-10 text-center">
            <p className="text-sm font-medium text-neutral-600">{t('booking.signInPrompt')}</p>
            <SignInButton mode="modal">
              <button
                type="button"
                className="border-2 border-neutral-900 bg-teal-500 px-6 py-2.5 font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-teal-600"
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
