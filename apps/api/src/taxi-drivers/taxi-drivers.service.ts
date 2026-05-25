import { Injectable } from '@nestjs/common';

import { prisma } from '../database/prisma';
import type { RegisterTaxiDriverDto } from './dto/register-taxi-driver.dto';

@Injectable()
export class TaxiDriversService {
  async register(payload: RegisterTaxiDriverDto) {
    const created = await prisma.taxiDriver.create({
      data: {
        fullName: payload.fullName,
        phone: payload.phone,
        city: payload.city,
        seats: payload.seats,
        details: payload.details,
      },
      select: { id: true, fullName: true, phone: true, city: true, seats: true, status: true, createdAt: true },
    });
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
        createdAt: true,
      },
    });
  }
}
