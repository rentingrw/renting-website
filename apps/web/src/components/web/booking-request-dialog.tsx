'use client';

import { SignInButton, useAuth } from '@clerk/nextjs';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from '@rentingi/ui';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { AddressInput } from '@/components/web/address-input';
import { PickupMapPicker } from '@/components/web/pickup-map-picker';
import {
  createCarBooking,
  createDriverBooking,
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

export function BookingRequestDialog({ open, onOpenChange, target }: BookingRequestDialogProps) {
  const t = useTranslations('web');
  const { isSignedIn, getToken } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>(
    target.mode === 'car' ? target.defaultServiceType : 'private_driver',
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estimatedTotal = useMemo(() => {
    if (!target.exactDailyRate || !startDate || !endDate) {
      return target.exactDailyRate ? formatCurrencyRwf(target.exactDailyRate) : t('booking.dynamicAmount');
    }
    const from = new Date(startDate);
    const to = new Date(endDate);
    const diffMs = to.getTime() - from.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return formatCurrencyRwf(target.exactDailyRate * days);
  }, [endDate, startDate, t, target.exactDailyRate]);

  async function handleSubmit() {
    setError(null);
    setStatus(null);

    if (!startDate || !endDate || !pickupAddress.trim()) {
      setError(t('booking.validation'));
      return;
    }

    try {
      setBusy(true);
      const token = await getToken();
      if (!token) {
        throw new Error(t('booking.signInRequired'));
      }

      if (target.mode === 'car') {
        await createCarBooking(token, {
          listingId: target.id,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          pickupAddress: pickupAddress.trim(),
          totalAmountRwf: target.exactDailyRate ?? 0,
          notes: notes.trim() || undefined,
        });
      } else {
        await createDriverBooking(token, {
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

      setStatus(t('booking.sent'));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('booking.submitFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('booking.title')}</DialogTitle>
          <DialogDescription>{t('booking.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-semibold">{target.title}</p>
          <p className="text-xs text-muted-foreground">{target.ownerLabel}</p>
        </div>

        {isSignedIn ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>{t('booking.start')}</span>
                <Input type="datetime-local" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span>{t('booking.end')}</span>
                <Input type="datetime-local" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} />
              </label>
            </div>

            {target.mode === 'car' ? (
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-1">
                {(['self_drive', 'with_driver'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setServiceType(value)}
                    className={`rounded-md px-3 py-2 text-sm ${
                      serviceType === value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    {value === 'self_drive' ? t('filters.selfDrive') : t('filters.withDriver')}
                  </button>
                ))}
              </div>
            ) : null}

            <label className="space-y-1 text-sm">
              <span>{t('booking.pickup')}</span>
              <AddressInput
                value={pickupAddress}
                onChange={setPickupAddress}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <PickupMapPicker
              address={pickupAddress}
              onAddressChange={setPickupAddress}
              loadingLabel={t('map.loading')}
              hintLabel={t('booking.mapHint')}
            />

            {target.mode === 'driver' ? (
              <label className="space-y-1 text-sm">
                <span>{t('booking.dropoff')}</span>
                <AddressInput
                  value={dropoffAddress}
                  onChange={setDropoffAddress}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            ) : null}

            <label className="space-y-1 text-sm">
              <span>{t('booking.messageOptional')}</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 w-full rounded-md border p-3 text-sm"
              />
            </label>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p>
                {t('booking.estimated')}: <span className="font-semibold">{estimatedTotal}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('booking.countdownNote')}</p>
            </div>

            {status ? <p className="text-sm text-primary">{status}</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button className="w-full" onClick={handleSubmit} disabled={busy}>
              {busy ? t('booking.sending') : t('booking.send')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm">{t('booking.signInPrompt')}</p>
            <SignInButton mode="modal">
              <Button>{t('auth.signIn')}</Button>
            </SignInButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
