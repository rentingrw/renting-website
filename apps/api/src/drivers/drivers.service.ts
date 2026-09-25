import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingStatus, Prisma, type User } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { driverIsBookedNow } from '../bookings/booking-desk.util';
import { CreateDriverProfileDto, UpdateDriverProfileDto } from './dto/upsert-driver-profile.dto';

type DriverProfileWithUser = Prisma.DriverProfileGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        fullName: true;
        avatarUrl: true;
        trustScore: true;
        phone: true;
      };
    };
  };
}>;

const COMPLETED_DRIVER_BOOKING_STATUSES = new Set<BookingStatus>([
  BookingStatus.completed,
  BookingStatus.auto_completed,
  BookingStatus.disputed,
]);

@Injectable()
export class DriversService {
  async createProfile(authUser: AuthenticatedUser, payload: CreateDriverProfileDto) {
    const user = await this.requireDriver(authUser.clerkUserId);
    this.validateAvailabilityCalendar(payload.availabilityCalendar);

    const existing = await prisma.driverProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Driver profile already exists. Use PATCH /drivers/profile to update it.');
    }

    const coordinates = await this.geocodePrimaryCity(payload.primaryCity);

    const created = await prisma.$transaction(async (tx) => {
      const profile = await tx.driverProfile.create({
        data: {
          userId: user.id,
          driverCategory: payload.driverCategory,
          yearsExperience: payload.yearsExperience,
          biography: payload.biography,
          dailyRateRwf: new Prisma.Decimal(payload.dailyRateRwf),
          hourlyRateRwf:
            payload.hourlyRateRwf === undefined ? undefined : new Prisma.Decimal(payload.hourlyRateRwf),
          weeklyRateRwf:
            payload.weeklyRateRwf === undefined ? undefined : new Prisma.Decimal(payload.weeklyRateRwf),
          primaryCity: payload.primaryCity.trim(),
          languages: payload.languages,
          categories: payload.categories,
          vehicleTypes: payload.vehicleTypes,
          certifications: payload.certifications,
          serviceAreas: payload.serviceAreas,
          licenseCategories: payload.licenseCategories ?? [],
          transmission: payload.transmission,
          addressText: payload.addressText ?? payload.primaryCity.trim(),
          idDocumentUrl: payload.idDocumentUrl,
          licenseDocumentUrl: payload.licenseDocumentUrl,
          availabilityCalendar: payload.availabilityCalendar as unknown as Prisma.JsonArray,
        },
      });

      await this.setPrimaryCityLocation(profile.id, coordinates.latitude, coordinates.longitude, tx);

      if (payload.phone || payload.profilePhotoUrl) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            ...(payload.phone ? { phone: payload.phone } : {}),
            ...(payload.profilePhotoUrl ? { avatarUrl: payload.profilePhotoUrl } : {}),
          },
        });
      }

      return tx.driverProfile.findUnique({
        where: { id: profile.id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              trustScore: true,
              phone: true,
            },
          },
        },
      });
    });

    if (!created) {
      throw new NotFoundException('Failed to create driver profile.');
    }

    return this.mapProfile(created, true);
  }

  async updateProfile(authUser: AuthenticatedUser, payload: UpdateDriverProfileDto) {
    const user = await this.requireDriver(authUser.clerkUserId);
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            trustScore: true,
            phone: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found. Create one first.');
    }

    if (payload.availabilityCalendar) {
      this.validateAvailabilityCalendar(payload.availabilityCalendar);
    }

    const updateData: Prisma.DriverProfileUpdateInput = {};
    if (payload.driverCategory !== undefined) updateData.driverCategory = payload.driverCategory;
    if (payload.yearsExperience !== undefined) updateData.yearsExperience = payload.yearsExperience;
    if (payload.biography !== undefined) updateData.biography = payload.biography;
    if (payload.dailyRateRwf !== undefined) updateData.dailyRateRwf = new Prisma.Decimal(payload.dailyRateRwf);
    if (payload.hourlyRateRwf !== undefined) updateData.hourlyRateRwf = new Prisma.Decimal(payload.hourlyRateRwf);
    if (payload.weeklyRateRwf !== undefined) updateData.weeklyRateRwf = new Prisma.Decimal(payload.weeklyRateRwf);
    if (payload.primaryCity !== undefined) updateData.primaryCity = payload.primaryCity.trim();
    if (payload.languages !== undefined) updateData.languages = payload.languages;
    if (payload.categories !== undefined) updateData.categories = payload.categories;
    if (payload.vehicleTypes !== undefined) updateData.vehicleTypes = payload.vehicleTypes;
    if (payload.certifications !== undefined) updateData.certifications = payload.certifications;
    if (payload.serviceAreas !== undefined) updateData.serviceAreas = payload.serviceAreas;
    if (payload.licenseCategories !== undefined) updateData.licenseCategories = payload.licenseCategories;
    if (payload.transmission !== undefined) updateData.transmission = payload.transmission;
    if (payload.addressText !== undefined) updateData.addressText = payload.addressText;
    if (payload.idDocumentUrl !== undefined) updateData.idDocumentUrl = payload.idDocumentUrl;
    if (payload.licenseDocumentUrl !== undefined) updateData.licenseDocumentUrl = payload.licenseDocumentUrl;
    if (payload.availabilityCalendar !== undefined) {
      updateData.availabilityCalendar = payload.availabilityCalendar as unknown as Prisma.JsonArray;
    }

    const shouldUpdateCityLocation = payload.primaryCity !== undefined;
    const coordinates = shouldUpdateCityLocation
      ? await this.geocodePrimaryCity(payload.primaryCity ?? profile.primaryCity)
      : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.driverProfile.update({
        where: { id: profile.id },
        data: updateData,
      });

      if (coordinates) {
        await this.setPrimaryCityLocation(profile.id, coordinates.latitude, coordinates.longitude, tx);
      }

      if (payload.phone || payload.profilePhotoUrl) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            ...(payload.phone ? { phone: payload.phone } : {}),
            ...(payload.profilePhotoUrl ? { avatarUrl: payload.profilePhotoUrl } : {}),
          },
        });
      }

      return tx.driverProfile.findUnique({
        where: { id: profile.id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              trustScore: true,
              phone: true,
            },
          },
        },
      });
    });

    if (!updated) {
      throw new NotFoundException('Driver profile not found after update.');
    }

    return this.mapProfile(updated, true);
  }

  async getMyProfile(authUser: AuthenticatedUser) {
    const user = await this.requireDriver(authUser.clerkUserId);
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            trustScore: true,
            phone: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found.');
    }

    const bookingGroups = await prisma.driverBooking.groupBy({
      by: ['status'],
      where: {
        driverId: user.id,
      },
      _count: { _all: true },
    });

    const bookingStats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      active: 0,
      completed: 0,
    };

    for (const group of bookingGroups) {
      const count = group._count._all;
      bookingStats.total += count;
      if (group.status === BookingStatus.pending) bookingStats.pending += count;
      if (group.status === BookingStatus.confirmed) bookingStats.confirmed += count;
      if (group.status === BookingStatus.active) bookingStats.active += count;
      if (COMPLETED_DRIVER_BOOKING_STATUSES.has(group.status)) bookingStats.completed += count;
    }

    return {
      ...this.mapProfile(profile, true),
      bookingStats,
    };
  }

  async getById(profileId: string, authUser?: AuthenticatedUser) {
    const profile = await prisma.driverProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            trustScore: true,
            phone: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Driver profile not found.');
    }

    const caller = authUser
      ? await prisma.user.findUnique({ where: { clerkId: authUser.clerkUserId }, select: { id: true } })
      : null;
    const isSelf = caller?.id === profile.userId;
    let bookingConfirmed = false;
    if (caller && !isSelf) {
      const confirmed = await prisma.driverBooking.findFirst({
        where: {
          driverId: profile.userId,
          renterId: caller.id,
          status: { in: [BookingStatus.confirmed, BookingStatus.active, BookingStatus.completed, BookingStatus.auto_completed] },
        },
        select: { id: true },
      });
      bookingConfirmed = confirmed !== null;
    }
    return this.mapProfile(profile, Boolean(authUser), {
      showContact: isSelf || bookingConfirmed,
      isBookedNow: await driverIsBookedNow(profile.userId),
    });
  }

  private async requireDriver(clerkUserId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: {
        roles: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found. Sync your account first.');
    }

    const hasDriverRole = user.primaryRole === 'driver' || user.roles.some((item) => item.role === 'driver');
    if (!hasDriverRole) {
      throw new ForbiddenException('Only users with the driver role can manage driver profiles.');
    }

    return user;
  }

  private mapProfile(
    profile: DriverProfileWithUser,
    includeExactRates: boolean,
    extras?: { showContact?: boolean; isBookedNow?: boolean },
  ) {
    const dailyRate = Number(profile.dailyRateRwf);
    const hourlyRate = profile.hourlyRateRwf ? Number(profile.hourlyRateRwf) : null;
    const weeklyRate = profile.weeklyRateRwf ? Number(profile.weeklyRateRwf) : null;
    const showContact = extras?.showContact ?? includeExactRates;

    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.user.fullName,
      phone: showContact ? profile.user.phone ?? null : null,
      isBookedNow: extras?.isBookedNow ?? false,
      profilePhotoUrl: profile.user.avatarUrl,
      trustScore: Number(profile.user.trustScore),
      driverCategory: profile.driverCategory,
      yearsExperience: profile.yearsExperience,
      biography: profile.biography,
      primaryCity: profile.primaryCity,
      languages: profile.languages,
      categories: profile.categories,
      vehicleTypes: profile.vehicleTypes,
      certifications: profile.certifications,
      serviceAreas: profile.serviceAreas,
      licenseCategories: profile.licenseCategories,
      transmission: profile.transmission,
      addressText: profile.addressText,
      idDocumentUrl: extras?.showContact ? profile.idDocumentUrl : null,
      licenseDocumentUrl: extras?.showContact ? profile.licenseDocumentUrl : null,
      availabilityCalendar: profile.availabilityCalendar,
      rating: profile.rating ? Number(profile.rating) : null,
      completedTrips: profile.completedTrips,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      ...(includeExactRates
        ? {
            dailyRateRwf: dailyRate,
            hourlyRateRwf: hourlyRate,
            weeklyRateRwf: weeklyRate,
          }
        : {
            approximateRateRangeRwf: {
              daily: this.getApproximatePriceRange(dailyRate),
              ...(hourlyRate ? { hourly: this.getApproximatePriceRange(hourlyRate) } : {}),
              ...(weeklyRate ? { weekly: this.getApproximatePriceRange(weeklyRate) } : {}),
            },
          }),
    };
  }

  private getApproximatePriceRange(rate: number) {
    const min = Math.max(1000, Math.floor(rate * 0.9));
    const max = Math.max(min, Math.ceil(rate * 1.1));
    return { min, max };
  }

  private validateAvailabilityCalendar(value: unknown) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('availabilityCalendar must be an array.');
    }

    for (const range of value) {
      const from = (range as { from?: string })?.from;
      const to = (range as { to?: string })?.to;

      if (!from || !to) {
        throw new BadRequestException('Each unavailable range must include from and to values.');
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new BadRequestException('availabilityCalendar ranges must contain valid ISO date strings.');
      }
      if (fromDate >= toDate) {
        throw new BadRequestException('availabilityCalendar range "to" must be after "from".');
      }
    }
  }

  private async geocodePrimaryCity(city: string): Promise<{ latitude: number; longitude: number }> {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      throw new BadRequestException('primaryCity is required.');
    }
    const { geocode } = await import('../geocoding/nominatim.service');
    return geocode(trimmedCity);
  }

  private async setPrimaryCityLocation(
    profileId: string,
    latitude: number,
    longitude: number,
    db: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    await db.$executeRaw(Prisma.sql`
      UPDATE driver_profiles
      SET primary_city_location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      WHERE id = ${profileId}::uuid
    `);
  }
}
