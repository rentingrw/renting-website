import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BookingStatus, ListingStatus, Prisma, SubscriptionKind, type User } from '@prisma/client';

import { prisma } from '../database/prisma';
import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { liveSubscriptionWhere } from '../subscriptions/subscription-tier.util';
import { getContactVisibility } from '../subscriptions/contact-visibility.util';
import { listingIsBookedNow } from '../bookings/booking-desk.util';
import { resolveListingCity } from '../common/listing-city.util';
import type { CreateCarDto } from './dto/create-car.dto';
import type { UpdateCarDto } from './dto/update-car.dto';
import type { OwnerListingMarketplaceStatus } from './dto/set-listing-status.dto';

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

    const listingCity = resolveListingCity(payload.locationText, payload.listingCity);

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
          plateNumber: payload.plateNumber.trim(),
          color: payload.color?.trim() || null,
          listingCity,
          dailyRateInCityRwf: payload.dailyRateInCityRwf,
          dailyRateOutsideCityRwf: payload.dailyRateOutsideCityRwf,
          weeklyRateInCityRwf: payload.weeklyRateInCityRwf,
          weeklyRateOutsideCityRwf: payload.weeklyRateOutsideCityRwf,
          monthlyRateInCityRwf: payload.monthlyRateInCityRwf,
          monthlyRateOutsideCityRwf: payload.monthlyRateOutsideCityRwf,
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

    let listingCity: string | undefined;
    if (payload.locationText !== undefined || payload.listingCity !== undefined) {
      const current = await prisma.carListing.findUnique({
        where: { id: listing.id },
        select: { locationText: true },
      });
      listingCity = resolveListingCity(
        payload.locationText ?? current?.locationText ?? '',
        payload.listingCity,
      );
    }

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
        plateNumber: payload.plateNumber?.trim(),
        color: payload.color?.trim() || null,
        ...(listingCity !== undefined ? { listingCity } : {}),
        dailyRateInCityRwf: payload.dailyRateInCityRwf,
        dailyRateOutsideCityRwf: payload.dailyRateOutsideCityRwf,
        weeklyRateInCityRwf: payload.weeklyRateInCityRwf,
        weeklyRateOutsideCityRwf: payload.weeklyRateOutsideCityRwf,
        monthlyRateInCityRwf: payload.monthlyRateInCityRwf,
        monthlyRateOutsideCityRwf: payload.monthlyRateOutsideCityRwf,
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
      listing.status !== ListingStatus.inactive &&
      listing.status !== ListingStatus.paused &&
      listing.status !== ListingStatus.rejected
    ) {
      throw new BadRequestException('Only draft, inactive, or rejected listings can be submitted for approval.');
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
    return this.setListingStatus(authUser, listingId, 'inactive');
  }

  async setListingStatus(
    authUser: AuthenticatedUser,
    listingId: string,
    target: OwnerListingMarketplaceStatus,
  ) {
    const owner = await this.requireCarOwner(authUser.clerkUserId);
    const listing = await this.requireOwnerListing(listingId, owner.id);

    if (this.isSoftDeletedStatus(listing.status)) {
      throw new BadRequestException('This listing is no longer available.');
    }

    if (listing.status === ListingStatus.pending_approval) {
      throw new BadRequestException('This listing is awaiting admin approval.');
    }

    if (listing.status === ListingStatus.draft || listing.status === ListingStatus.rejected) {
      if (target === 'active') {
        return this.publish(authUser, listingId);
      }
      throw new BadRequestException('Publish the listing for approval before changing visibility.');
    }

    if (target === 'active') {
      await this.assertHostCanActivateListing(owner.id, listing.id);
    } else if (
      listing.status !== ListingStatus.active &&
      listing.status !== ListingStatus.inactive &&
      listing.status !== ListingStatus.booked &&
      listing.status !== ListingStatus.paused
    ) {
      throw new BadRequestException('Only visible listings can be set to inactive or booked.');
    }

    const updated = await prisma.carListing.update({
      where: { id: listing.id },
      data: { status: this.toPrismaMarketplaceStatus(target) },
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
            trustScore: true,
            driverProfile: { select: { id: true } },
          },
        },
      },
    });

    if (!listing || this.isSoftDeletedStatus(listing.status)) {
      throw new NotFoundException('Listing not found.');
    }

    const includeExactRates = Boolean(user);
    const caller = user
      ? await prisma.user.findUnique({ where: { clerkId: user.clerkUserId }, select: { id: true } })
      : null;
    const isOwner = caller?.id === listing.ownerId;
    if (!isOwner && listing.status !== ListingStatus.active) {
      throw new NotFoundException('Listing not found.');
    }
    let bookingConfirmed = false;
    if (caller && !isOwner) {
      const confirmed = await prisma.carBooking.findFirst({
        where: {
          listingId: listing.id,
          renterId: caller.id,
          status: { in: [BookingStatus.confirmed, BookingStatus.active, BookingStatus.completed, BookingStatus.auto_completed] },
        },
        select: { id: true },
      });
      bookingConfirmed = confirmed !== null;
    }
    const hosterSub = await prisma.subscription.findFirst({
      where: { userId: listing.ownerId, ...liveSubscriptionWhere(SubscriptionKind.hoster) },
      orderBy: { startsAt: 'desc' },
    });
    const visibility = getContactVisibility({
      kind: SubscriptionKind.hoster,
      storedTier: hosterSub?.tier,
      productTier: hosterSub ? undefined : 'enterprise',
      bookingConfirmed,
    });
    return this.mapListing(listing, includeExactRates, {
      showContact: isOwner || visibility.publicContact,
      verified: visibility.verified,
      instantBooking: visibility.instantBooking,
      isBookedNow: await listingIsBookedNow(listing.id),
    });
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

  async getByOwner(userId: string, excludeId?: string, viewer?: AuthenticatedUser) {
    let viewerUserId: string | undefined;
    if (viewer) {
      const viewerUser = await prisma.user.findUnique({
        where: { clerkId: viewer.clerkUserId },
        select: { id: true },
      });
      viewerUserId = viewerUser?.id;
    }

    const isOwnerViewingSelf = viewerUserId === userId;

    const listings = await prisma.carListing.findMany({
      where: {
        ownerId: userId,
        ...(isOwnerViewingSelf
          ? { status: { notIn: [ListingStatus.deleted, ListingStatus.archived] } }
          : { status: ListingStatus.active }),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: isOwnerViewingSelf ? 100 : 6,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            trustScore: true,
          },
        },
      },
    });
    return listings.map((l) => this.mapListing(l, isOwnerViewingSelf, { showContact: false }));
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

  private mapListing(
    listing: CarListingWithOwner,
    includeExactRates: boolean,
    extras?: { showContact?: boolean; verified?: boolean; instantBooking?: boolean; isBookedNow?: boolean },
  ) {
    const inCityDailyApproximation = this.getApproximatePriceRange(listing.dailyRateInCityRwf);
    const outsideCityDailyApproximation = this.getApproximatePriceRange(listing.dailyRateOutsideCityRwf);
    const showContact = extras?.showContact ?? includeExactRates;
    return {
      id: listing.id,
      ownerId: listing.ownerId,
      ownerName: listing.owner.fullName,
      ownerPhone: showContact ? listing.owner.phone ?? null : null,
      ownerDriverProfileId: (listing.owner as { driverProfile?: { id: string } | null }).driverProfile?.id ?? null,
      ownerTrustScore: Number((listing.owner as { trustScore?: unknown }).trustScore ?? 100),
      verified: extras?.verified ?? false,
      instantBooking: extras?.instantBooking ?? false,
      isBookedNow: extras?.isBookedNow ?? false,
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
      plateNumber: includeExactRates ? listing.plateNumber : null,
      color: listing.color,
      listingCity: listing.listingCity,
      locationText: listing.locationText,
      photos: listing.photos,
      features: listing.features,
      status: listing.status,
      priceNegotiable: listing.priceNegotiable,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      ...(includeExactRates
        ? {
            dailyRateInCityRwf: listing.dailyRateInCityRwf,
            dailyRateOutsideCityRwf: listing.dailyRateOutsideCityRwf,
            weeklyRateInCityRwf: listing.weeklyRateInCityRwf,
            weeklyRateOutsideCityRwf: listing.weeklyRateOutsideCityRwf,
            monthlyRateInCityRwf: listing.monthlyRateInCityRwf,
            monthlyRateOutsideCityRwf: listing.monthlyRateOutsideCityRwf,
          }
        : {
            approximateDailyRateRangeRwf: {
              inCity: inCityDailyApproximation,
              outsideCity: outsideCityDailyApproximation,
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

  private toPrismaMarketplaceStatus(target: OwnerListingMarketplaceStatus): ListingStatus {
    if (target === 'active') return ListingStatus.active;
    if (target === 'booked') return ListingStatus.booked;
    return ListingStatus.inactive;
  }

  private async assertHostCanActivateListing(_ownerId: string, _listingId: string): Promise<void> {
    // Subscriptions disabled — hosts may activate listings without a paid plan.
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
