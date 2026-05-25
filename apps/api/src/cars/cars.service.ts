import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingStatus, ListingStatus, Prisma, type User } from '@prisma/client';
import { createHash } from 'node:crypto';

import { prisma } from '../database/prisma';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import {
  getTierPlan,
  storedTierToProductTier,
} from '../subscriptions/subscription-tier.util';
import type { CreateCarDto } from './dto/create-car.dto';
import type { UpdateCarDto } from './dto/update-car.dto';

type CarListingWithOwner = Prisma.CarListingGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        fullName: true;
        phone: true;
      };
    };
  };
}>;

@Injectable()
export class CarsService {
  async create(authUser: AuthenticatedUser, payload: CreateCarDto) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    this.validateCoordinatePair(payload.latitude, payload.longitude);

    const created = await prisma.$transaction(async (tx) => {
      const listing = await tx.carListing.create({
        data: {
          ownerId: owner.id,
          title: payload.title,
          description: payload.description,
          vehicleType: payload.vehicleType,
          serviceType: payload.serviceType,
          brand: payload.brand,
          model: payload.model,
          year: payload.year,
          seats: payload.seats,
          transmission: payload.transmission,
          fuelType: payload.fuelType,
          dailyRateKigaliRwf: payload.dailyRateKigaliRwf,
          dailyRateCountrysideRwf: payload.dailyRateCountrysideRwf,
          weeklyRateRwf: payload.weeklyRateRwf,
          monthlyRateRwf: payload.monthlyRateRwf,
          priceNegotiable: payload.priceNegotiable ?? false,
          locationText: payload.locationText,
          photos: payload.photos,
          features: payload.features,
          status: ListingStatus.draft,
        },
      });

      if (payload.latitude !== undefined && payload.longitude !== undefined) {
        await this.setPickupLocation(listing.id, payload.latitude, payload.longitude, tx);
      }

      return tx.carListing.findUnique({
        where: { id: listing.id },
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      });
    });

    if (!created) {
      throw new NotFoundException('Failed to create listing.');
    }

    return this.mapListing(created, true);
  }

  async update(authUser: AuthenticatedUser, listingId: string, payload: UpdateCarDto) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const listing = await this.requireOwnerListing(listingId, owner.id);
    this.validateCoordinatePair(payload.latitude, payload.longitude);

    await prisma.carListing.update({
      where: { id: listing.id },
      data: {
        title: payload.title,
        description: payload.description,
        vehicleType: payload.vehicleType,
        serviceType: payload.serviceType,
        brand: payload.brand,
        model: payload.model,
        year: payload.year,
        seats: payload.seats,
        transmission: payload.transmission,
        fuelType: payload.fuelType,
        dailyRateKigaliRwf: payload.dailyRateKigaliRwf,
        dailyRateCountrysideRwf: payload.dailyRateCountrysideRwf,
        weeklyRateRwf: payload.weeklyRateRwf,
        monthlyRateRwf: payload.monthlyRateRwf,
        priceNegotiable: payload.priceNegotiable,
        locationText: payload.locationText,
        photos: payload.photos,
        features: payload.features,
      },
    });

    if (payload.latitude !== undefined && payload.longitude !== undefined) {
      await this.setPickupLocation(listing.id, payload.latitude, payload.longitude);
    }

    const updated = await prisma.carListing.findUnique({
      where: { id: listing.id },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!updated) {
      throw new NotFoundException('Listing not found after update.');
    }

    return this.mapListing(updated, true);
  }

  async remove(authUser: AuthenticatedUser, listingId: string) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const listing = await this.requireOwnerListing(listingId, owner.id);

    await prisma.carListing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.deleted },
    });

    return {
      id: listing.id,
      status: ListingStatus.deleted,
    };
  }

  async publish(authUser: AuthenticatedUser, listingId: string) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const listing = await this.requireOwnerListing(listingId, owner.id);

    if (listing.status === ListingStatus.active) {
      return { id: listing.id, status: listing.status };
    }

    if (
      listing.status !== ListingStatus.draft &&
      listing.status !== ListingStatus.paused &&
      listing.status !== ListingStatus.rejected
    ) {
      throw new BadRequestException('Only draft, paused, or rejected listings can be submitted for approval.');
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: owner.id,
        OR: [
          { status: 'active' },
          {
            status: 'cancelled',
            renewsAt: { gt: new Date() },
          },
        ],
      },
      orderBy: {
        startsAt: 'desc',
      },
    });

    if (!subscription) {
      throw new ForbiddenException('An active subscription is required before publishing a listing.');
    }

    const productTier = storedTierToProductTier(subscription.tier);
    const plan = getTierPlan(productTier);
    const limit = plan.maxCars ?? Number.POSITIVE_INFINITY;
    if (Number.isFinite(limit)) {
      const activeCount = await prisma.carListing.count({
        where: {
          ownerId: owner.id,
          status: ListingStatus.active,
          id: { not: listing.id },
        },
      });

      if (activeCount >= limit) {
        throw new ForbiddenException(
          `Your ${productTier} listing plan allows up to ${limit} active car listings.`,
        );
      }
    }

    const updated = await prisma.carListing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.pending_approval },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    return this.mapListing(updated, true);
  }

  async pause(authUser: AuthenticatedUser, listingId: string) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const listing = await this.requireOwnerListing(listingId, owner.id);

    if (listing.status !== ListingStatus.active) {
      throw new BadRequestException('Only active listings can be paused.');
    }

    const updated = await prisma.carListing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.paused },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    return this.mapListing(updated, true);
  }

  async getById(listingId: string, user?: AuthenticatedUser) {
    const listing = await prisma.carListing.findUnique({
      where: { id: listingId },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!listing || this.isSoftDeletedStatus(listing.status)) {
      throw new NotFoundException('Listing not found.');
    }

    const includeExactRates = Boolean(user);
    return this.mapListing(listing, includeExactRates);
  }

  async getMine(authUser: AuthenticatedUser) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const listings = await prisma.carListing.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    const listingIds = listings.map((item) => item.id);
    const bookingGroups =
      listingIds.length === 0
        ? []
        : await prisma.carBooking.groupBy({
            by: ['listingId', 'status'],
            where: {
              listingId: { in: listingIds },
            },
            _count: { _all: true },
          });

    const counters = new Map<
      string,
      {
        total: number;
        pending: number;
        confirmed: number;
        active: number;
      }
    >();

    for (const group of bookingGroups) {
      const current = counters.get(group.listingId) ?? {
        total: 0,
        pending: 0,
        confirmed: 0,
        active: 0,
      };
      const count = group._count._all;
      current.total += count;

      if (group.status === BookingStatus.pending) {
        current.pending += count;
      } else if (group.status === BookingStatus.confirmed) {
        current.confirmed += count;
      } else if (group.status === BookingStatus.active) {
        current.active += count;
      }

      counters.set(group.listingId, current);
    }

    return listings.map((listing) => ({
      ...this.mapListing(listing, true),
      bookingCounts: counters.get(listing.id) ?? {
        total: 0,
        pending: 0,
        confirmed: 0,
        active: 0,
      },
    }));
  }

  async getByOwner(userId: string, excludeId?: string) {
    const listings = await prisma.carListing.findMany({
      where: {
        ownerId: userId,
        status: ListingStatus.active,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });
    return listings.map((l) => this.mapListing(l, false));
  }

  async getAvailability(listingId: string, month: string) {
    const listing = await prisma.carListing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true },
    });

    if (!listing || this.isSoftDeletedStatus(listing.status)) {
      throw new NotFoundException('Listing not found.');
    }

    const [yearPart, monthPart] = month.split('-');
    const year = Number(yearPart);
    const monthIndex = Number(monthPart) - 1;
    const monthStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

    const bookings = await prisma.carBooking.findMany({
      where: {
        listingId,
        status: { in: [BookingStatus.confirmed, BookingStatus.active] },
        startDate: { lt: monthEnd },
        endDate: { gt: monthStart },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return {
      listingId,
      month,
      bookedRanges: bookings.map((booking) => ({
        bookingId: booking.id,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
      })),
    };
  }

  getSignedUploadUrl(folder?: string) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Cloudinary configuration is incomplete.');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const safeFolder = (folder ?? 'rentingi/cars').trim() || 'rentingi/cars';
    const allowedFormats = 'jpg,jpeg,png,webp,heic,heif';

    // Only include params Cloudinary signs — max_file_size is not a signable param
    const signaturePayload = `allowed_formats=${allowedFormats}&folder=${safeFolder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signaturePayload).digest('hex');

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      fields: {
        api_key: apiKey,
        timestamp,
        folder: safeFolder,
        allowed_formats: allowedFormats,
        signature,
      },
    };
  }

  private mapListing(listing: CarListingWithOwner, includeExactRates: boolean) {
    const kigaliPriceApproximation = this.getApproximatePriceRange(listing.dailyRateKigaliRwf);
    const countrysidePriceApproximation = this.getApproximatePriceRange(listing.dailyRateCountrysideRwf);
    return {
      id: listing.id,
      ownerId: listing.ownerId,
      ownerName: listing.owner.fullName,
      ownerPhone: listing.owner.phone ?? null,
      title: listing.title,
      description: listing.description,
      vehicleType: listing.vehicleType,
      serviceType: listing.serviceType,
      brand: listing.brand,
      model: listing.model,
      year: listing.year,
      seats: listing.seats,
      transmission: listing.transmission,
      fuelType: listing.fuelType,
      locationText: listing.locationText,
      photos: listing.photos,
      features: listing.features,
      status: listing.status,
      priceNegotiable: listing.priceNegotiable,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      ...(includeExactRates
        ? {
            dailyRateKigaliRwf: listing.dailyRateKigaliRwf,
            dailyRateCountrysideRwf: listing.dailyRateCountrysideRwf,
            weeklyRateRwf: listing.weeklyRateRwf ?? null,
            monthlyRateRwf: listing.monthlyRateRwf ?? null,
          }
        : {
            approximateDailyRateRangeRwf: {
              kigali: kigaliPriceApproximation,
              countryside: countrysidePriceApproximation,
            },
          }),
    };
  }

  private getApproximatePriceRange(rate: number) {
    const min = Math.max(1000, Math.floor(rate * 0.9));
    const max = Math.max(min, Math.ceil(rate * 1.1));
    return { min, max };
  }

  private async requireCarOwner(clerkUserId: string): Promise<User> {
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

    const hasOwnerRole =
      user.primaryRole === 'car_owner' || user.roles.some((item) => item.role === 'car_owner');

    if (!hasOwnerRole) {
      throw new ForbiddenException('Only car owners can manage listings.');
    }

    return user;
  }

  private async requireOwnerListing(listingId: string, ownerId: string) {
    const listing = await prisma.carListing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true, status: true },
    });

    if (!listing || this.isSoftDeletedStatus(listing.status)) {
      throw new NotFoundException('Listing not found.');
    }

    if (listing.ownerId !== ownerId) {
      throw new ForbiddenException('You can only modify your own listings.');
    }

    return listing;
  }

  private validateCoordinatePair(latitude?: number, longitude?: number): void {
    const hasLat = latitude !== undefined;
    const hasLng = longitude !== undefined;

    if (hasLat !== hasLng) {
      throw new BadRequestException('latitude and longitude must be provided together.');
    }
  }

  private isSoftDeletedStatus(status: ListingStatus): boolean {
    return status === ListingStatus.deleted || status === ListingStatus.archived;
  }

  private async setPickupLocation(
    listingId: string,
    latitude: number,
    longitude: number,
    db: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    await db.$executeRaw(Prisma.sql`
      UPDATE car_listings
      SET pickup_location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      WHERE id = ${listingId}::uuid
    `);
  }
}
