'use client';

import type { ReactNode } from 'react';

import { BriefcaseBusiness, CalendarClock, Car, FileBadge, Home, Languages, MapPinned } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { DriverDetail } from '@/lib/api';
import { formatDriverLanguages } from '@/lib/driver-languages';
import {
  driverProfileFactGroups,
  formatDriverHomeAddress,
} from '@/lib/driver-profile-display';

function DetailTile({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-border/80 bg-card px-2.5 py-1 text-xs font-bold text-ink"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

type DriverDetailProfileProps = {
  detail: DriverDetail;
  bookedRanges: Array<{ startDate: string; endDate: string }>;
};

export function DriverDetailProfile({ detail, bookedRanges }: DriverDetailProfileProps) {
  const t = useTranslations('web');

  const languageLine = detail.languages?.length ? formatDriverLanguages(detail.languages) : '';
  const homeAddress = formatDriverHomeAddress(detail.addressText);
  const { districts, availabilityModes, licenses, drive } = driverProfileFactGroups(detail);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft-sm sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailTile
            icon={<BriefcaseBusiness className="h-3.5 w-3.5 text-sun" />}
            label={t('driver.experienceLabel')}
          >
            {t('listing.yearsExp', { count: detail.yearsExperience })}
          </DetailTile>

          {languageLine ? (
            <DetailTile icon={<Languages className="h-3.5 w-3.5 text-brand" />} label={t('driver.languagesHeading')}>
              {languageLine}
            </DetailTile>
          ) : null}

          <DetailTile icon={<MapPinned className="h-3.5 w-3.5 text-brand" />} label={t('driver.serviceAreas')}>
            <ChipList items={districts.length ? districts : [detail.primaryCity].filter(Boolean)} />
          </DetailTile>

          {homeAddress ? (
            <DetailTile icon={<Home className="h-3.5 w-3.5 text-brand" />} label={t('driver.homeArea')}>
              {homeAddress}
            </DetailTile>
          ) : null}

          <DetailTile icon={<FileBadge className="h-3.5 w-3.5 text-brand" />} label={t('driver.licenseCategories')}>
            <ChipList items={licenses} />
          </DetailTile>

          {drive ? (
            <DetailTile icon={<Car className="h-3.5 w-3.5 text-brand" />} label={t('driver.drivingCapability')}>
              {drive}
            </DetailTile>
          ) : null}

          <DetailTile icon={<CalendarClock className="h-3.5 w-3.5 text-brand" />} label={t('driver.availabilityModes')}>
            <ChipList items={availabilityModes} />
          </DetailTile>
        </div>
      </section>

      {bookedRanges.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft-sm sm:p-6">
          <h2 className="text-sm font-black text-foreground">{t('detail.availability')}</h2>
          <ul className="mt-3 space-y-2">
            {bookedRanges.map((range) => (
              <li
                key={`${range.startDate}-${range.endDate}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5 text-sm font-medium text-foreground"
              >
                <CalendarClock className="h-4 w-4 shrink-0 text-brand" />
                {new Date(range.startDate).toLocaleDateString()} – {new Date(range.endDate).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}