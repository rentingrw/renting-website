'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getAdminListingDetail, type AdminListingItem, type AdminListingMarketplaceStatus } from '@/lib/api';

import { formatRwfPlain } from '@rentingi/types';

function row(label: string, value: string) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-neutral-200 py-2 text-sm last:border-0">
      <dt className="font-black uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

type ListingReviewModalProps = {
  listingId: string;
  token: string;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onStatusChange?: (id: string, status: AdminListingMarketplaceStatus) => Promise<void>;
  acting: boolean;
};

export function ListingReviewModal({
  listingId,
  token,
  onClose,
  onApprove,
  onReject,
  onStatusChange,
  acting,
}: ListingReviewModalProps) {
  const [detail, setDetail] = useState<AdminListingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getAdminListingDetail(token, listingId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load listing.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, token]);

  const city = detail?.listingCity ?? '—';
  const hostLabel =
    detail?.owner.hostType === 'company'
      ? detail.owner.companyName || detail.owner.fullName
      : detail?.owner.fullName ?? '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col admin-panel">
        <div className="flex items-center justify-between border-b border-border bg-brand px-5 py-3">
          <div>
            <h2 className="font-black text-white">Listing review</h2>
            <p className="text-xs font-medium text-muted-foreground">{detail?.title ?? listingId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 p-1.5 text-muted-foreground hover:border-white hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm font-semibold text-muted-foreground">Loading listing…</p>
          ) : error ? (
            <p className="text-sm font-semibold text-red-700">{error}</p>
          ) : detail ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Photos</p>
                {detail.photos.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {detail.photos.map((url, index) => (
                      <div key={url} className="relative aspect-[4/3] overflow-hidden rounded border border-border">
                        <Image src={url} alt={`Car photo ${index + 1}`} fill className="object-cover" sizes="200px" />
                        {index === 0 ? (
                          <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-black text-white">
                            Cover
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No photos
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded border border-border bg-[#fbf4e0] p-3">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-xs font-black capitalize ${
                      detail.status === 'pending_approval'
                        ? 'border-amber-600 bg-sun text-ink'
                        : 'border-neutral-600 bg-white text-ink'
                    }`}
                  >
                    {detail.status.replace(/_/g, ' ')}
                  </span>
                  <p className="mt-2 text-lg font-black text-ink">{detail.title}</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {detail.year} {detail.brand} {detail.model}
                    {detail.color ? ` · ${detail.color}` : ''}
                  </p>
                </div>

                <dl className="rounded-xl border border-border bg-card px-3">
                  {row('Plate', detail.plateNumber ?? '—')}
                  {row('Vehicle', `${detail.vehicleType.replace(/_/g, ' ')} · ${detail.seats} seats`)}
                  {row('Service', detail.serviceType.replace(/_/g, ' '))}
                  {row('Transmission', detail.transmission ?? '—')}
                  {row('Fuel', detail.fuelType ?? '—')}
                  {row('Listing city', city)}
                  {row('Address', detail.locationText)}
                </dl>

                <div className="rounded border border-border p-3">
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Host</p>
                  <div className="flex items-start gap-3">
                    {detail.owner.avatarUrl ? (
                      <Image
                        src={detail.owner.avatarUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted text-xs font-bold">
                        Host
                      </div>
                    )}
                    <div className="min-w-0 text-sm">
                      <p className="font-black text-ink">{hostLabel}</p>
                      <p className="text-muted-foreground">
                        {detail.owner.hostType === 'company' ? 'Company' : 'Individual'}
                        {detail.owner.hostType === 'company' && detail.owner.fullName
                          ? ` · contact: ${detail.owner.fullName}`
                          : ''}
                      </p>
                      <p className="text-muted-foreground">{detail.owner.email}</p>
                      <p className="text-muted-foreground">
                        {detail.owner.phone ?? detail.owner.contactPhone ?? 'No phone'}
                      </p>
                      {detail.owner.workAddress ? (
                        <p className="mt-1 text-muted-foreground">{detail.owner.workAddress}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded border border-border p-3">
                    <p className="text-xs font-black uppercase text-muted-foreground">In {city}</p>
                    <ul className="mt-2 space-y-1 text-sm font-semibold">
                      <li>Daily · RWF {formatRwfPlain(detail.dailyRateInCityRwf)}</li>
                      <li>Weekly · RWF {formatRwfPlain(detail.weeklyRateInCityRwf)}</li>
                      <li>Monthly · RWF {formatRwfPlain(detail.monthlyRateInCityRwf)}</li>
                    </ul>
                  </div>
                  <div className="rounded border border-border p-3">
                    <p className="text-xs font-black uppercase text-muted-foreground">Outside {city}</p>
                    <ul className="mt-2 space-y-1 text-sm font-semibold">
                      <li>Daily · RWF {formatRwfPlain(detail.dailyRateOutsideCityRwf)}</li>
                      <li>Weekly · RWF {formatRwfPlain(detail.weeklyRateOutsideCityRwf)}</li>
                      <li>Monthly · RWF {formatRwfPlain(detail.monthlyRateOutsideCityRwf)}</li>
                    </ul>
                  </div>
                </div>

                {detail.description ? (
                  <div>
                    <p className="mb-1 text-xs font-black uppercase text-muted-foreground">Description</p>
                    <p className="rounded-xl border border-border bg-muted p-3 text-sm text-ink">
                      {detail.description}
                    </p>
                  </div>
                ) : null}

                {detail.features.length ? (
                  <div>
                    <p className="mb-1 text-xs font-black uppercase text-muted-foreground">Features</p>
                    <p className="text-sm font-medium text-ink/80">{detail.features.join(' · ')}</p>
                  </div>
                ) : null}

                {detail && onStatusChange && detail.status !== 'deleted' && detail.status !== 'archived' ? (
                  <div className="rounded border border-border bg-muted p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Website visibility</p>
                    <select
                      className="h-9 w-full rounded-xl border border-border bg-card px-2 text-sm font-bold"
                      value={
                        detail.status === 'active' || detail.status === 'booked'
                          ? detail.status
                          : 'inactive'
                      }
                      disabled={acting}
                      onChange={(event) => {
                        void onStatusChange(detail.id, event.target.value as AdminListingMarketplaceStatus).then(() => {
                          void getAdminListingDetail(token, listingId).then(setDetail);
                        });
                      }}
                    >
                      <option value="active">Active — visible on site</option>
                      <option value="inactive">Inactive — hidden</option>
                      <option value="booked">Booked — hidden</option>
                    </select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Only <strong>active</strong> listings appear in public search. Inactive and booked are hidden.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {detail?.status === 'pending_approval' ? (
          <div className="space-y-3 border-t border-border bg-muted p-4">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason (required if rejecting)"
              className="min-h-[72px] w-full rounded border border-border px-3 py-2 text-sm font-medium"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={acting || !rejectReason.trim()}
                onClick={() => void onReject(detail.id, rejectReason.trim())}
                className="rounded border border-red-200 bg-card px-4 py-2 text-sm font-black text-red-700 disabled:opacity-40"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => void onApprove(detail.id)}
                className="rounded border border-border bg-emerald-400 px-4 py-2 text-sm font-black text-ink shadow-brutal-xs disabled:opacity-40"
              >
                Approve
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
