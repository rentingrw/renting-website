import { Injectable } from '@nestjs/common';

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

@Injectable()
export class TaxiDriversService {
  async register(payload: RegisterTaxiDriverDto) {
    const created = await prisma.taxiDriver.create({
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        city: payload.city,
        seats: payload.seats,
        details: payload.details,
        photoUrl: payload.photoUrl,
        profilePhotoUrl: payload.profilePhotoUrl,
      },
      select: { id: true, fullName: true, phone: true, email: true, city: true, seats: true, status: true, createdAt: true },
    });

    // Notify the driver (if they gave an email)
    if (payload.email) {
      void sendEmail(
        payload.email,
        'Registration received — renting.rw',
        taxiDriverRegisteredEmailHtml(payload.fullName),
      ).catch(() => undefined);
    }

    // Alert admin
    void sendEmail(
      ADMIN_EMAIL,
      `New taxi driver registration: ${payload.fullName}`,
      taxiDriverAdminAlertEmailHtml(payload.fullName, payload.phone, payload.city, payload.seats, payload.email, payload.details),
    ).catch(() => undefined);

    return created;
  }

  async list(city?: string) {
    return prisma.taxiDriver.findMany({
      where: {
        status: 'approved',
        ...(city?.trim() ? { city: { contains: city.trim(), mode: 'insensitive' as const } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        city: true,
        seats: true,
        details: true,
        photoUrl: true,
        profilePhotoUrl: true,
        createdAt: true,
      },
    });
  }
}
