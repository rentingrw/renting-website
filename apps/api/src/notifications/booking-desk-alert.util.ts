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

export function adminBookingsDeskUrl(): string {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';
  return `${base.replace(/\/$/, '')}/en/bookings?status=pending`;
}
