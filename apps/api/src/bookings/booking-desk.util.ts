import { BadRequestException } from '@nestjs/common';
import { BookingStatus, SubscriptionKind } from '@prisma/client';

import { prisma } from '../database/prisma';
import { getContactVisibility } from '../subscriptions/contact-visibility.util';
import { liveSubscriptionWhere } from '../subscriptions/subscription-tier.util';

export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.confirmed,
  BookingStatus.active,
  BookingStatus.disputed,
];

export function normalizeBookingPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new BadRequestException('Enter a valid phone number.');
  }
  return trimmed;
}

export async function maybeStoreRenterPhone(userId: string, phone: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
  if (existing?.phone) return;
  const taken = await prisma.user.findFirst({
    where: { phone, id: { not: userId } },
    select: { id: true },
  });
  if (taken) return;
  await prisma.user.update({
    where: { id: userId },
    data: { phone },
  });
}

export async function hosterHasInstantBooking(ownerId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId: ownerId, ...liveSubscriptionWhere(SubscriptionKind.hoster) },
    orderBy: { startsAt: 'desc' },
  });
  return getContactVisibility({
    kind: SubscriptionKind.hoster,
    storedTier: sub?.tier,
  }).instantBooking;
}

export async function listingIsBookedNow(listingId: string, now = new Date()) {
  const hit = await prisma.carBooking.findFirst({
    where: {
      listingId,
      status: { in: BLOCKING_BOOKING_STATUSES },
      startDate: { lte: now },
      endDate: { gt: now },
    },
    select: { id: true },
  });
  return Boolean(hit);
}

export async function driverIsBookedNow(driverUserId: string, now = new Date()) {
  const hit = await prisma.driverBooking.findFirst({
    where: {
      driverId: driverUserId,
      status: { in: BLOCKING_BOOKING_STATUSES },
      startAt: { lte: now },
      endAt: { gt: now },
    },
    select: { id: true },
  });
  return Boolean(hit);
}

export function formatContactLine(name: string, phone?: string | null, whatsapp?: string | null) {
  const parts = [name];
  if (phone) parts.push(`phone ${phone}`);
  if (whatsapp) parts.push(`WhatsApp ${whatsapp}`);
  return parts.join(', ');
}
