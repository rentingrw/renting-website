import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TaxiDriverStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { taxiDriverRegisteredEmailHtml, taxiDriverAdminAlertEmailHtml } from '../notifications/email-templates';
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
  workLocationText: true,
  languages: true,
  contactPhoneEnabled: true,
  contactWhatsappEnabled: true,
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

function assertContactPayload(payload: RegisterTaxiDriverDto) {
  const phoneOn = payload.contactPhoneEnabled !== false;
  const whatsappOn = payload.contactWhatsappEnabled !== false;
  if (!phoneOn && !whatsappOn) {
    throw new BadRequestException('Enable at least one contact method: phone call or WhatsApp.');
  }
  if (phoneOn && !payload.phone?.trim()) {
    throw new BadRequestException('Phone number is required when phone calls are enabled.');
  }
  if (whatsappOn && !payload.whatsapp?.trim()) {
    throw new BadRequestException('WhatsApp number is required when WhatsApp is enabled.');
  }
}

function normalizePayload(payload: RegisterTaxiDriverDto) {
  const photos = (payload.photos?.filter(Boolean) ?? []).slice(0, 5);
  const photoUrl = payload.photoUrl ?? photos[0];
  if (!photoUrl) {
    throw new BadRequestException('Add at least one car photo.');
  }
  if (!payload.profilePhotoUrl?.trim()) {
    throw new BadRequestException('Profile photo is required.');
  }
  assertContactPayload(payload);
  return {
    photos,
    photoUrl,
    seats: payload.seats,
    contactPhoneEnabled: payload.contactPhoneEnabled !== false,
    contactWhatsappEnabled: payload.contactWhatsappEnabled !== false,
    workLocationText: payload.workLocationText?.trim() || payload.city.trim(),
  };
}

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

    const normalized = normalizePayload(payload);

    const created = await prisma.taxiDriver.create({
      data: {
        userId: user.id,
        fullName: payload.fullName.trim(),
        phone: payload.phone.trim(),
        whatsapp: payload.whatsapp?.trim() || null,
        city: payload.city.trim(),
        workLocationText: normalized.workLocationText,
        languages: payload.languages,
        contactPhoneEnabled: normalized.contactPhoneEnabled,
        contactWhatsappEnabled: normalized.contactWhatsappEnabled,
        seats: payload.seats,
        details: payload.details?.trim(),
        carModel: payload.carModel.trim(),
        plate: payload.plate.trim(),
        vehicleType: payload.vehicleType,
        features: payload.features ?? [],
        photos: normalized.photos.length ? normalized.photos : [normalized.photoUrl],
        photoUrl: normalized.photoUrl,
        profilePhotoUrl: payload.profilePhotoUrl.trim(),
        status: TaxiDriverStatus.active,
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
        ...(phoneTaken ? {} : { phone: payload.phone.trim() }),
        ...(payload.whatsapp?.trim() ? { whatsapp: payload.whatsapp.trim() } : {}),
        avatarUrl: payload.profilePhotoUrl.trim(),
      },
    });

    void sendEmail(
      ADMIN_EMAIL,
      `New taxi driver registration: ${payload.fullName}`,
      taxiDriverAdminAlertEmailHtml(
        payload.fullName,
        payload.phone,
        payload.city,
        normalized.seats,
        undefined,
        payload.details,
      ),
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
    const normalized = normalizePayload(payload);
    return prisma.taxiDriver.update({
      where: { id: existing.id },
      data: {
        fullName: payload.fullName.trim(),
        phone: payload.phone.trim(),
        whatsapp: payload.whatsapp?.trim() || null,
        city: payload.city.trim(),
        workLocationText: normalized.workLocationText,
        languages: payload.languages,
        contactPhoneEnabled: normalized.contactPhoneEnabled,
        contactWhatsappEnabled: normalized.contactWhatsappEnabled,
        seats: payload.seats,
        details: payload.details?.trim(),
        carModel: payload.carModel.trim(),
        plate: payload.plate.trim(),
        vehicleType: payload.vehicleType,
        features: payload.features ?? existing.features,
        photos: normalized.photos,
        photoUrl: normalized.photoUrl,
        profilePhotoUrl: payload.profilePhotoUrl.trim(),
      },
      select: taxiSelect,
    });
  }

  async setMineStatus(authUser: AuthenticatedUser, status: 'active' | 'inactive' | 'booked') {
    const user = await this.requireUser(authUser);
    const existing = await prisma.taxiDriver.findUnique({ where: { userId: user.id } });
    if (!existing) throw new NotFoundException('Taxi profile not found.');
    return prisma.taxiDriver.update({
      where: { id: existing.id },
      data: { status: status as TaxiDriverStatus },
      select: taxiSelect,
    });
  }

  async approveForUser(userId: string) {
    await prisma.taxiDriver.updateMany({
      where: { userId },
      data: { status: TaxiDriverStatus.active },
    });
  }

  async list(city?: string) {
    return prisma.taxiDriver.findMany({
      where: {
        status: TaxiDriverStatus.active,
        ...(city?.trim() ? { city: { contains: city.trim(), mode: 'insensitive' as const } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: taxiSelect,
    });
  }

  async getPublicById(id: string) {
    const taxi = await prisma.taxiDriver.findUnique({
      where: { id },
      select: taxiSelect,
    });
    if (!taxi || taxi.status !== TaxiDriverStatus.active) {
      throw new NotFoundException('Taxi driver not found.');
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
