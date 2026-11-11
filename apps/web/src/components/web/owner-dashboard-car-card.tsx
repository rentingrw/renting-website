'use client';

import Link from 'next/link';

import { Button } from '@rentingi/ui';

import { MediaImage } from '@/components/web/media-image';
import type { CarMarketplaceVisibility, OwnerCar } from '@/lib/api';
import { formatCurrencyRwf } from '@/lib/format';
import { inCityRateLabel } from '@/lib/listing-city';
import type { SupportedLocale } from '@/i18n/routing';
import { stockImages } from '@/lib/stock-images';

const STATUS_STYLE: Record<string, string> = {
  active: 'text-emerald-700',
  inactive: 'text-neutral-600',
  paused: 'text-neutral-600',
  booked: 'text-blue-700',
  draft: 'text-amber-700',
  pending_approval: 'text-amber-700',
  rejected: 'text-red-700',
};

type OwnerDashboardCarRowProps = {
  car: OwnerCar;
  locale: SupportedLocale;
  labels: {
    edit: string;
    publish: string;
    statusActive: string;
    statusInactive: string;
    statusBooked: string;
    pendingApproval: string;
    viewListing: string;
  };
  marketplaceValue: CarMarketplaceVisibility | '';
  canPickMarketplaceStatus: boolean;
  onEdit: () => void;
  onStatusChange: (status: CarMarketplaceVisibility) => void;
  onPublish: () => void;
  /** Public /cars strip: thumbnail, price, visibility only */
  statusOnly?: boolean;
};

export function OwnerDashboardCarRow({
  car,
  locale,
  labels,
  marketplaceValue,
  canPickMarketplaceStatus,
  onEdit,
  onStatusChange,
  onPublish,
  statusOnly = false,
}: OwnerDashboardCarRowProps) {
  const photo =
    car.photos?.[0] ??
    stockImages.cars[car.vehicleType as keyof typeof stockImages.cars] ??
    stockImages.carPlaceholder;
  const city = car.listingCity || '—';
  const statusLabel = car.status.replace(/_/g, ' ');
  const statusClass = STATUS_STYLE[car.status] ?? 'text-muted-foreground';

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={`/${locale}/cars/${car.id}`}
          className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted"
        >
          <MediaImage src={photo} alt="" fill className="object-cover" sizes="64px" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              href={`/${locale}/cars/${car.id}`}
              className="truncate text-sm font-semibold text-foreground hover:text-brand"
            >
              {car.title}
            </Link>
            {!statusOnly || !canPickMarketplaceStatus ? (
              <span className={`text-xs font-medium capitalize ${statusClass}`}>{statusLabel}</span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {car.plateNumber ? `${car.plateNumber} · ` : ''}
            {car.year} {car.brand} {car.model}
            {car.color ? ` · ${car.color}` : ''}
            {' · '}
            {city}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <div className="text-right sm:min-w-[5.5rem]">
          <p className="text-sm font-bold tabular-nums text-foreground">{formatCurrencyRwf(car.dailyRateInCityRwf)}</p>
          <p className="text-[10px] text-muted-foreground">{inCityRateLabel(city)}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {!statusOnly ? (
            <>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onEdit}>
                {labels.edit}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                <Link href={`/${locale}/cars/${car.id}`}>{labels.viewListing}</Link>
              </Button>
            </>
          ) : null}
          {canPickMarketplaceStatus ? (
            <select
              className="h-8 max-w-[9rem] rounded-md border border-border bg-background px-2 text-xs"
              value={marketplaceValue}
              onChange={(e) => onStatusChange(e.target.value as CarMarketplaceVisibility)}
              aria-label="Listing visibility"
            >
              <option value="active">{labels.statusActive}</option>
              <option value="inactive">{labels.statusInactive}</option>
              <option value="booked">{labels.statusBooked}</option>
            </select>
          ) : car.status === 'pending_approval' ? (
            <span className="text-[11px] font-medium text-amber-700">{labels.pendingApproval}</span>
          ) : !statusOnly && (car.status === 'draft' || car.status === 'rejected') ? (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onPublish}>
              {labels.publish}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type OwnerDashboardCarListProps = {
  cars: OwnerCar[];
  locale: SupportedLocale;
  labels: OwnerDashboardCarRowProps['labels'];
  marketplaceValueFor: (car: OwnerCar) => CarMarketplaceVisibility | '';
  canPickMarketplaceStatus: (car: OwnerCar) => boolean;
  onEdit: (car: OwnerCar) => void;
  onStatusChange: (car: OwnerCar, status: CarMarketplaceVisibility) => void;
  onPublish: (car: OwnerCar) => void;
  statusOnly?: boolean;
};

export function OwnerDashboardCarList({
  cars,
  locale,
  labels,
  marketplaceValueFor,
  canPickMarketplaceStatus,
  onEdit,
  onStatusChange,
  onPublish,
  statusOnly = false,
}: OwnerDashboardCarListProps) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {cars.map((car) => (
        <OwnerDashboardCarRow
          key={car.id}
          car={car}
          locale={locale}
          labels={labels}
          marketplaceValue={marketplaceValueFor(car)}
          canPickMarketplaceStatus={canPickMarketplaceStatus(car)}
          onEdit={() => onEdit(car)}
          onStatusChange={(status) => onStatusChange(car, status)}
          onPublish={() => onPublish(car)}
          statusOnly={statusOnly}
        />
      ))}
    </div>
  );
}

/** @deprecated Use OwnerDashboardCarRow / OwnerDashboardCarList */
export const OwnerDashboardCarCard = OwnerDashboardCarRow;
