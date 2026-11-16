export function formatAdminDeskWhatsAppMessage(params: {
  kind: 'car' | 'driver';
  title: string;
  renterName: string;
  renterPhone: string;
  providerName: string;
  providerPhone?: string | null;
  start: Date;
  end: Date;
  pickup: string;
  notes?: string | null;
  bookingId: string;
  adminDeskUrl: string;
}): string {
  const fmt = (d: Date) =>
    d.toLocaleString('en-RW', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Kigali' });
  const lines = [
    params.kind === 'car' ? '🚗 New car booking request' : '🧑‍✈️ New driver booking request',
    '',
    params.title,
    `Client: ${params.renterName}`,
    `Client phone: ${params.renterPhone}`,
    `Provider: ${params.providerName}${params.providerPhone ? ` (${params.providerPhone})` : ''}`,
    `From: ${fmt(params.start)}`,
    `To: ${fmt(params.end)}`,
    `Pickup: ${params.pickup}`,
  ];
  if (params.notes?.trim()) {
    lines.push(`Notes: ${params.notes.trim()}`);
  }
  lines.push('', `Open desk: ${params.adminDeskUrl}`);
  lines.push(`Ref: ${params.bookingId.slice(0, 8)}`);
  return lines.join('\n');
}

export function adminCareersApplicationsUrl(): string {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';
  return `${base.replace(/\/$/, '')}/en/jobs`;
}

export function adminBookingsDeskUrl(): string {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';
  return `${base.replace(/\/$/, '')}/en/bookings?status=pending`;
}

export type BookingDeskRequestEmailInput = {
  title: string;
  kind: 'car' | 'driver';
  renterName: string;
  renterPhone: string;
  renterEmail?: string | null;
  startDate: Date;
  endDate: Date;
  pickup: string;
  dropoff?: string | null;
  notes?: string | null;
  providerName: string;
  providerPhone?: string | null;
  providerWhatsapp?: string | null;
  assetDetail?: string | null;
  amountRwf?: number;
};

export function formatCarListingDeskDetail(listing: {
  title: string;
  brand: string;
  model: string;
  year: number;
  plateNumber?: string | null;
  listingCity: string;
  vehicleType: string;
  locationText?: string;
}): string {
  return [
    listing.title,
    `${listing.brand} ${listing.model} (${listing.year})`,
    listing.vehicleType.replace(/_/g, ' '),
    listing.locationText || listing.listingCity,
    listing.plateNumber ? `Plate ${listing.plateNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function formatDriverDeskDetail(
  driverName: string,
  profile: { primaryCity: string; driverCategory: string } | null | undefined,
): string {
  if (!profile) return driverName;
  return `${driverName} · ${profile.driverCategory.replace(/_/g, ' ')} · ${profile.primaryCity}`;
}
