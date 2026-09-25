import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SubscriptionKind, TaxiDriverStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { taxiDriverRegisteredEmailHtml, taxiDriverAdminAlertEmailHtml } from '../notifications/email-templates';
import { liveSubscriptionWhere } from '../subscriptions/subscription-tier.util';
import type { RegisterTaxiDriverDto } from './dto/register-taxi-driver.dto';

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL ?? 'renting.rw@gmail.com';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'renting.rw <noreply@renting.rw>';

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  });
}

const taxiSelect = {
  id: true,
  userId: true,
  fullName: true,
  phone: true,
  whatsapp: true,
  city: true,
  seats: true,
  details: true,
  carModel: true,
  plate: true,
  vehicleType: true,
  features: true,
  photos: true,
  photoUrl: true,
  profilePhotoUrl: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class TaxiDriversService {
  async register(payload: RegisterTaxiDriverDto, authUser: AuthenticatedUser) {
    if (!authUser?.clerkUserId) {
      throw new UnauthorizedException('Sign in to register as a taxi driver.');
    }
    const user = await prisma.user.findUnique({
      where: { clerkId: authUser.clerkUserId },
      select: { id: true, taxiDriver: { select: { id: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found. Sync your account first.');
    if (user.taxiDriver) {
      throw new ConflictException('You already have a taxi driver profile.');
    }

    const photos = payload.photos?.filter(Boolean) ?? [];
    const photoUrl = payload.photoUrl ?? photos[0];
    if (!photoUrl) {
      throw new BadRequestException('Add at least one full-car photo.');
    }

    const created = await prisma.taxiDriver.create({
      data: {
        userId: user.id,
        fullName: payload.fullName,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        city: payload.city,
        seats: payload.seats,
        details: payload.details,
        carModel: payload.carModel,
        plate: payload.plate,
        vehicleType: payload.vehicleType,
        features: payload.features ?? [],
        photos: photos.length ? photos : photoUrl ? [photoUrl] : [],
        photoUrl,
        profilePhotoUrl: payload.profilePhotoUrl,
        status: TaxiDriverStatus.pending,
      },
      select: taxiSelect,
    });

    const phoneTaken = await prisma.user.findFirst({
      where: { phone: payload.phone, id: { not: user.id } },
      select: { id: true },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(phoneTaken ? {} : { phone: payload.phone }),
        ...(payload.whatsapp ? { whatsapp: payload.whatsapp } : {}),
        ...(payload.profilePhotoUrl ? { avatarUrl: payload.profilePhotoUrl } : {}),
      },
    });

    void sendEmail(
      ADMIN_EMAIL,
      `New taxi driver registration: ${payload.fullName}`,
      taxiDriverAdminAlertEmailHtml(payload.fullName, payload.phone, payload.city, payload.seats, undefined, payload.details),
    ).catch(() => undefined);

    return created;
  }

  async getMine(authUser: AuthenticatedUser) {
    const user = await this.requireUser(authUser);
    const taxi = await prisma.taxiDriver.findUnique({
      where: { userId: user.id },
      select: taxiSelect,
    });
    if (!taxi) throw new NotFoundException('Taxi profile not found.');
    return taxi;
  }

  async updateMine(authUser: AuthenticatedUser, payload: RegisterTaxiDriverDto) {
    const user = await this.requireUser(authUser);
    const existing = await prisma.taxiDriver.findUnique({ where: { userId: user.id } });
    if (!existing) throw new NotFoundException('Taxi profile not found. Register first.');
    const photos = payload.photos?.filter(Boolean) ?? existing.photos;
    return prisma.taxiDriver.update({
      where: { id: existing.id },
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        city: payload.city,
        seats: payload.seats,
        details: payload.details,
        carModel: payload.carModel,
        plate: payload.plate,
        vehicleType: payload.vehicleType,
        features: payload.features ?? existing.features,
        photos,
        photoUrl: payload.photoUrl ?? photos[0] ?? existing.photoUrl,
        profilePhotoUrl: payload.profilePhotoUrl ?? existing.profilePhotoUrl,
      },
      select: taxiSelect,
    });
  }

  async approveForUser(userId: string) {
    await prisma.taxiDriver.updateMany({
      where: { userId },
      data: { status: TaxiDriverStatus.approved },
    });
  }

  async list(city?: string) {
    const now = new Date();
    const liveTaxiSubs = await prisma.subscription.findMany({
      where: liveSubscriptionWhere(SubscriptionKind.taxi, now),
      select: { userId: true },
    });
    const liveUserIds = liveTaxiSubs.map((s) => s.userId);

    return prisma.taxiDriver.findMany({
      where: {
        status: TaxiDriverStatus.approved,
        ...(city?.trim() ? { city: { contains: city.trim(), mode: 'insensitive' as const } } : {}),
        OR: [
          { userId: null },
          { userId: { in: liveUserIds } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        ...taxiSelect,
      },
    });
  }

  async getPublicById(id: string) {
    const taxi = await prisma.taxiDriver.findUnique({
      where: { id },
      select: taxiSelect,
    });
    if (!taxi || taxi.status !== TaxiDriverStatus.approved) {
      throw new NotFoundException('Taxi driver not found.');
    }

    if (taxi.userId) {
      const live = await prisma.subscription.findFirst({
        where: {
          userId: taxi.userId,
          ...liveSubscriptionWhere(SubscriptionKind.taxi),
        },
        select: { id: true },
      });
      if (!live) throw new NotFoundException('Taxi driver not found.');
    }

    return taxi;
  }

  private async requireUser(authUser: AuthenticatedUser) {
    const user = await prisma.user.findUnique({
      where: { clerkId: authUser.clerkUserId },
      select: { id: true },
    });
    if (!user) throw new UnauthorizedException('User not found. Sync your account first.');
    return user;
  }
}
