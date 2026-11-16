'use client';

import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@rentingi/ui';
import { CalendarDays, CheckCircle2, ChevronRight, Clock, Mail, Phone } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { AvailabilityCalendar, type CalendarStatusLabels } from '@/components/web/availability-calendar';
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
  /** Driver user id — used when creating the booking */
  id: string;
  /** Driver profile id — used for availability calendar */
  calendarProfileId: string;
  title: string;
  ownerLabel: string;
  defaultCategory: DriverCategory;
  exactDailyRate?: number;
  bookedRanges?: Array<{ startDate: string; endDate: string }>;
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

function toDateInputValue(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayDateInputValue() {
  return toDateInputValue(new Date());
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
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

const LAST_PHONE_KEY = 'rentingi_last_renter_phone';

function driverServiceTypeForCategory(_category: DriverCategory): ServiceType {
  return 'private_driver';
}

function formatTripDay(date: Date | null, locale: string) {
  if (!date) return null;
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTripDayFromInput(value: string, locale: string) {
  if (!value) return null;
  return formatTripDay(parseDateInput(value), locale);
}

type TripDateColumnProps = {
  kind: 'pickup' | 'return';
  title: string;
  dateDisplay: string | null;
  emptyHint: string;
  active: boolean;
  complete: boolean;
  timeLabel: string;
  timeValue: string;
  onTimeChange: (value: string) => void;
  timeDisabled?: boolean;
  children?: ReactNode;
};

function TripDateColumn({
  kind,
  title,
  dateDisplay,
  emptyHint,
  active,
  complete,
  timeLabel,
  timeValue,
  onTimeChange,
  timeDisabled,
  children,
}: TripDateColumnProps) {
  const accent = kind === 'pickup' ? 'border-brand' : 'border-foreground';
  return (
    <div
      className={`flex flex-col border-2 bg-card shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
        active ? `${accent} ring-2 ring-brand/25` : complete ? 'border-border' : 'border-neutral-300'
      }`}
    >
      <div className="border-b-2 border-border bg-neutral-50 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className={`mt-0.5 text-sm font-black ${dateDisplay ? 'text-foreground' : 'text-muted-foreground'}`}>
          {dateDisplay ?? emptyHint}
        </p>
      </div>
      {children ? <div className="border-b border-border px-2 py-2">{children}</div> : null}
      <div className="px-3 py-2">
        <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeLabel}
        </label>
        <input
          type="time"
          value={timeValue}
          disabled={timeDisabled}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-2 text-base font-semibold outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  );
}

export function BookingRequestDialog({ open, onOpenChange, target }: BookingRequestDialogProps) {
  const t = useTranslations('web');
  const locale = useLocale();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const defaultStart = getDefaultStart();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(getDefaultEnd(defaultStart));
  const [tripStartDay, setTripStartDay] = useState(toDateInputValue(defaultStart));
  const [tripEndDay, setTripEndDay] = useState(toDateInputValue(getDefaultEnd(defaultStart)));

  const [notes, setNotes] = useState('');
  const [renterPhone, setRenterPhone] = useState('');
  const [calStart, setCalStart] = useState<Date | null>(null);
  const [calEnd, setCalEnd] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:00');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [created, setCreated] = useState<CreatedBookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const instantBooking = Boolean(target.instantBooking);

  useEffect(() => {
    if (!open) return;
    const savedPhone = localStorage.getItem(LAST_PHONE_KEY);
    const clerkPhone = user?.primaryPhoneNumber?.phoneNumber ?? user?.phoneNumbers?.[0]?.phoneNumber ?? '';
    if (savedPhone) setRenterPhone(savedPhone);
    else if (clerkPhone) setRenterPhone(clerkPhone);
    const start = getDefaultStart();
    const end = getDefaultEnd(start);
    setStartDate(start);
    setEndDate(end);
    setTripStartDay(toDateInputValue(start));
    setTripEndDay(toDateInputValue(end));
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

  const useCalendar = Array.isArray(target.bookedRanges);

  const availabilityEntityId =
    target.mode === 'car' ? target.id : target.calendarProfileId;

  const pickupDayDisplay = useCalendar
    ? formatTripDay(calStart, locale)
    : formatTripDayFromInput(tripStartDay, locale);
  const returnDayDisplay = useCalendar
    ? formatTripDay(calEnd, locale)
    : formatTripDayFromInput(tripEndDay, locale);

  const calendarStepMessage = useMemo(() => {
    if (!useCalendar) return null;
    if (!calStart) return t('booking.calendarStepStart');
    if (!calEnd) return t('booking.calendarStepEnd');
    return t('booking.calendarStepDone');
  }, [useCalendar, calStart, calEnd, t]);

  const calendarStatusLabels = useMemo((): CalendarStatusLabels => ({
    pickStart: t('booking.calendarStatusPickStart'),
    pickReturn: (date) => t('booking.calendarStatusPickReturn', { date }),
    rangeSummary: (start, end, days) => t('booking.calendarStatusRange', { start, end, days }),
    clear: t('booking.calendarClear'),
    selected: t('booking.calendarLegendSelected'),
    booked: t('booking.calendarLegendBooked'),
    unavailable: t('booking.calendarLegendUnavailable'),
  }), [t]);

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

  function syncPlainDates(startDay: string, startT: string, endDay: string, endT: string) {
    if (!startDay || !endDay) return;
    const s = combineDateAndTime(parseDateInput(startDay), startT);
    const e = combineDateAndTime(parseDateInput(endDay), endT);
    setStartDate(toLocalDatetimeValue(s));
    setEndDate(toLocalDatetimeValue(e));
  }

  function handlePlainStartDay(value: string) {
    setTripStartDay(value);
    let endDay = tripEndDay;
    if (value && endDay && parseDateInput(endDay).getTime() < parseDateInput(value).getTime()) {
      const d = parseDateInput(value);
      d.setDate(d.getDate() + 1);
      endDay = toDateInputValue(d);
      setTripEndDay(endDay);
    }
    syncPlainDates(value, startTime, endDay, endTime);
  }

  function handlePlainEndDay(value: string) {
    setTripEndDay(value);
    syncPlainDates(tripStartDay, startTime, value, endTime);
  }

  const renterEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? '';

  const pickupPlaceholder = t('booking.pickupArranged');

  async function handleSubmit() {
    setError(null);
    if (useCalendar && (!calStart || !calEnd)) {
      setError(t('booking.datesRequired'));
      return;
    }
    if (!startDate || !endDate || !renterPhone.trim()) {
      setError(t('booking.validation'));
      return;
    }
    if (!duration.valid) {
      setError(t('booking.datesOrder'));
      return;
    }
    if (renterPhone.replace(/\D/g, '').length < 10) {
      setError(t('booking.phoneRequired'));
      return;
    }
    const bookingNotes = notes.trim() || undefined;
    const driverServiceType =
      target.mode === 'driver' ? driverServiceTypeForCategory(target.defaultCategory) : undefined;
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
            pickupAddress: pickupPlaceholder,
            totalAmountRwf: target.exactDailyRate ?? 0,
            notes: bookingNotes,
            renterPhone: renterPhone.trim(),
          });
        }
        return createDriverBooking(t2, {
          driverId: target.id,
          serviceType: driverServiceType!,
          startAt: new Date(startDate).toISOString(),
          endAt: new Date(endDate).toISOString(),
          pickupAddress: pickupPlaceholder,
          totalAmountRwf: target.exactDailyRate ?? 0,
          notes: bookingNotes,
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
                    <span className="text-muted-foreground">{t('booking.selectDatesShort')}</span>
                  )}
                </div>
                <p className="text-xl font-black text-brand">
                  {estimatedTotal ?? t('booking.dynamicAmount')}
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-black text-foreground">{t('booking.datesSection')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {useCalendar ? t('booking.datesHintCalendar') : t('booking.datesHintFields')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TripDateColumn
                  kind="pickup"
                  title={t('booking.pickUpDate')}
                  dateDisplay={pickupDayDisplay}
                  emptyHint={t('booking.pickUpNotSet')}
                  active={useCalendar ? !calStart : false}
                  complete={Boolean(pickupDayDisplay)}
                  timeLabel={t('booking.pickUpTime')}
                  timeValue={startTime}
                  onTimeChange={(value) => {
                    setStartTime(value);
                    if (useCalendar && calStart) {
                      setStartDate(toLocalDatetimeValue(combineDateAndTime(calStart, value)));
                    } else {
                      syncPlainDates(tripStartDay, value, tripEndDay, endTime);
                    }
                  }}
                  timeDisabled={useCalendar && !calStart}
                >
                  {useCalendar ? null : (
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {t('booking.pickUpDate')}
                      </label>
                      <input
                        type="date"
                        value={tripStartDay}
                        min={todayDateInputValue()}
                        onChange={(e) => handlePlainStartDay(e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-2.5 text-base font-semibold outline-none focus:border-brand"
                      />
                    </div>
                  )}
                </TripDateColumn>

                <TripDateColumn
                  kind="return"
                  title={t('booking.returnDate')}
                  dateDisplay={returnDayDisplay}
                  emptyHint={t('booking.returnNotSet')}
                  active={useCalendar ? Boolean(calStart && !calEnd) : false}
                  complete={Boolean(returnDayDisplay)}
                  timeLabel={t('booking.returnTime')}
                  timeValue={endTime}
                  onTimeChange={(value) => {
                    setEndTime(value);
                    if (useCalendar && calEnd) {
                      setEndDate(toLocalDatetimeValue(combineDateAndTime(calEnd, value)));
                    } else {
                      syncPlainDates(tripStartDay, startTime, tripEndDay, value);
                    }
                  }}
                  timeDisabled={useCalendar ? !calEnd : !tripEndDay}
                >
                  {useCalendar ? null : (
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {t('booking.returnDate')}
                      </label>
                      <input
                        type="date"
                        value={tripEndDay}
                        min={tripStartDay || todayDateInputValue()}
                        onChange={(e) => handlePlainEndDay(e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-2.5 text-base font-semibold outline-none focus:border-brand"
                      />
                    </div>
                  )}
                </TripDateColumn>
              </div>

              {useCalendar && calendarStepMessage ? (
                <p className="rounded border-2 border-brand/30 bg-brand-soft px-3 py-2 text-center text-xs font-bold text-foreground">
                  {calendarStepMessage}
                </p>
              ) : null}

              {useCalendar ? (
                <div className="border-2 border-border bg-card p-3">
                  <AvailabilityCalendar
                    kind={target.mode === 'car' ? 'car' : 'driver'}
                    entityId={availabilityEntityId}
                    initialBookedRanges={target.bookedRanges ?? []}
                    selectedStart={calStart}
                    selectedEnd={calEnd}
                    statusLabels={calendarStatusLabels}
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
              ) : null}

              {endDate && startDate && !duration.valid ? (
                <p className="text-xs font-medium text-red-600">{t('booking.datesOrder')}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('booking.phone')}
              </label>
              <p className="mb-2 text-xs text-muted-foreground">{t('booking.phoneHint')}</p>
              <div className="space-y-2">
                <div className="border-2 border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                    <Phone className="h-3.5 w-3.5 text-brand" />
                    <span className="text-xs font-bold text-muted-foreground">{t('booking.phone')}</span>
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
                {renterEmail ? (
                  <div className="border-2 border-border bg-muted/40">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                      <Mail className="h-3.5 w-3.5 text-brand" />
                      <span className="text-xs font-bold text-muted-foreground">{t('booking.emailOnAccount')}</span>
                    </div>
                    <p className="px-3 py-2.5 text-sm font-medium text-foreground">{renterEmail}</p>
                  </div>
                ) : null}
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
                rows={2}
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
