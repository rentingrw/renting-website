import { BadRequestException, Injectable } from '@nestjs/common';
import { ListingStatus, Prisma, SubscriptionKind, TaxiDriverStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { liveSubscriptionWhere } from '../subscriptions/subscription-tier.util';
import { SearchSort, SearchType, type SearchQueryDto } from './dto/search-query.dto';
import { coordsForRwandaCity, distanceMeters } from './rwanda-city-coords';

interface SearchCarRow {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  vehicleType: string;
  serviceType: string;
  brand: string;
  model: string;
  year: number;
  seats: number;
  transmission: string | null;
  fuelType: string | null;
  dailyRateKigaliRwf: number;
  dailyRateCountrysideRwf: number;
  locationText: string;
  photos: string[];
  features: string[];
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  distanceMeters: number | null;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  searchRank: number;
  ownerTrustScore: number | null;
  isBookedNow: boolean;
  verified: boolean;
}

interface SearchDriverRow {
  id: string;
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  trustScore: number;
  driverCategory: string;
  yearsExperience: number;
  biography: string | null;
  primaryCity: string;
  languages: string[];
  categories: string[];
  vehicleTypes: string[];
  certifications: string[];
  serviceAreas: string[];
  availabilityCalendar: Prisma.JsonValue;
  rating: number | null;
  completedTrips: number;
  dailyRateRwf: number;
  hourlyRateRwf: number | null;
  weeklyRateRwf: number | null;
  createdAt: Date;
  updatedAt: Date;
  distanceMeters: number | null;
  primaryCityLatitude: number | null;
  primaryCityLongitude: number | null;
  searchRank: number;
  isBookedNow: boolean;
}

@Injectable()
export class SearchService {
  async search(query: SearchQueryDto, user?: AuthenticatedUser) {
    const type = query.type ?? SearchType.all;
    const coordinates = await this.resolveCoordinates(query.latitude, query.longitude, query.location);
    this.validateCoordinates(coordinates.latitude, coordinates.longitude);
    this.validateDateRange(query.from, query.to);
    this.validateSeats(query.seatsMin, query.seatsMax);
    this.validatePrice(query.priceMin, query.priceMax);
    const includeExactRates = Boolean(user);
    const shouldSearchCars = type === SearchType.all || type === SearchType.cars;
    const shouldSearchDrivers = type === SearchType.all || type === SearchType.drivers;
    const shouldSearchTaxis = type === SearchType.all || type === SearchType.taxis;
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [cars, drivers, taxis] = await Promise.all([
      shouldSearchCars ? this.searchCars(query, coordinates, includeExactRates) : Promise.resolve([]),
      shouldSearchDrivers ? this.searchDrivers(query, coordinates, includeExactRates) : Promise.resolve([]),
      shouldSearchTaxis ? this.searchTaxis(query, coordinates) : Promise.resolve([]),
    ]);

    return {
      type,
      cars,
      drivers,
      taxis,
      pagination: {
        limit,
        offset,
        hasMoreCars: shouldSearchCars ? cars.length === limit : false,
        hasMoreDrivers: shouldSearchDrivers ? drivers.length === limit : false,
        hasMoreTaxis: shouldSearchTaxis ? taxis.length === limit : false,
      },
    };
  }

  private async searchCars(
    query: SearchQueryDto,
    coordinates: { latitude?: number; longitude?: number },
    includeExactRates: boolean,
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const conditions: Prisma.Sql[] = [Prisma.sql`cl.status = 'active'::"ListingStatus"`];
    const searchVector = Prisma.sql`
      to_tsvector(
        'simple',
        concat_ws(' ', cl.brand, cl.model, cl.title, coalesce(cl.description, ''))
      )
    `;
    const hasQuery = Boolean(query.query?.trim());

    if (hasQuery) {
      conditions.push(Prisma.sql`${searchVector} @@ plainto_tsquery('simple', ${query.query!.trim()})`);
    }

    const hasGeo = coordinates.latitude !== undefined && coordinates.longitude !== undefined;
    if (hasGeo) {
      const radiusMeters = Math.round((query.radiusKm ?? 25) * 1000);
      conditions.push(Prisma.sql`
        cl.pickup_location IS NOT NULL
        AND ST_DWithin(
          cl.pickup_location,
          ST_SetSRID(ST_MakePoint(${coordinates.longitude!}, ${coordinates.latitude!}), 4326)::geography,
          ${radiusMeters}
        )
      `);
    }

    if (query.vehicleType) {
      conditions.push(Prisma.sql`cl.vehicle_type = ${query.vehicleType}::"VehicleType"`);
    }
    if (query.serviceType) {
      conditions.push(Prisma.sql`cl.service_type = ${query.serviceType}::"ServiceType"`);
    }
    if (query.seatsMin !== undefined) {
      conditions.push(Prisma.sql`cl.seats >= ${query.seatsMin}`);
    }
    if (query.seatsMax !== undefined) {
      conditions.push(Prisma.sql`cl.seats <= ${query.seatsMax}`);
    }
    if (query.transmission) {
      conditions.push(Prisma.sql`lower(coalesce(cl.transmission, '')) = lower(${query.transmission})`);
    }
    if (query.fuelType) {
      conditions.push(Prisma.sql`lower(coalesce(cl.fuel_type, '')) = lower(${query.fuelType})`);
    }
    if (query.brand) {
      conditions.push(Prisma.sql`lower(cl.brand) = lower(${query.brand})`);
    }
    if (query.model) {
      conditions.push(Prisma.sql`lower(cl.model) = lower(${query.model})`);
    }
    if (query.priceMin !== undefined) {
      conditions.push(Prisma.sql`cl.daily_rate_kigali_rwf >= ${query.priceMin}`);
    }
    if (query.priceMax !== undefined) {
      conditions.push(Prisma.sql`cl.daily_rate_kigali_rwf <= ${query.priceMax}`);
    }
    if (query.yearMin !== undefined) {
      conditions.push(Prisma.sql`cl.year >= ${query.yearMin}`);
    }

    if (query.from && query.to) {
      conditions.push(Prisma.sql`
        NOT EXISTS (
          SELECT 1
          FROM car_bookings cb
          WHERE cb.listing_id = cl.id
            AND cb.status IN ('confirmed', 'active')
            AND cb.start_date < ${new Date(query.to)}
            AND cb.end_date > ${new Date(query.from)}
        )
      `);
    }

    if (query.availableNow) {
      conditions.push(Prisma.sql`
        NOT EXISTS (
          SELECT 1
          FROM car_bookings cb_now
          WHERE cb_now.listing_id = cl.id
            AND cb_now.status IN ('confirmed', 'active', 'disputed')
            AND cb_now.start_date <= NOW()
            AND cb_now.end_date > NOW()
        )
      `);
    }

    const whereClause = Prisma.join(conditions, ' AND ');
    const rows = await prisma.$queryRaw<SearchCarRow[]>(Prisma.sql`
      SELECT
        cl.id,
        cl.owner_id AS "ownerId",
        cl.title,
        cl.description,
        cl.vehicle_type AS "vehicleType",
        cl.service_type AS "serviceType",
        cl.brand,
        cl.model,
        cl.year,
        cl.seats,
        cl.transmission,
        cl.fuel_type AS "fuelType",
        cl.daily_rate_kigali_rwf AS "dailyRateKigaliRwf",
        cl.daily_rate_countryside_rwf AS "dailyRateCountrysideRwf",
        cl.location_text AS "locationText",
        cl.photos,
        cl.features,
        cl.status,
        cl.created_at AS "createdAt",
        cl.updated_at AS "updatedAt",
        ${
          hasGeo
            ? Prisma.sql`ST_Distance(
                cl.pickup_location,
                ST_SetSRID(ST_MakePoint(${coordinates.longitude!}, ${coordinates.latitude!}), 4326)::geography
              )`
            : Prisma.sql`NULL`
        } AS "distanceMeters",
        ST_Y(cl.pickup_location::geometry) AS "pickupLatitude",
        ST_X(cl.pickup_location::geometry) AS "pickupLongitude",
        ${
          hasQuery
            ? Prisma.sql`ts_rank_cd(${searchVector}, plainto_tsquery('simple', ${query.query!.trim()}))`
            : Prisma.sql`0`
        } AS "searchRank",
        (SELECT u.trust_score::float8 FROM users u WHERE u.id = cl.owner_id) AS "ownerTrustScore",
        EXISTS (
          SELECT 1 FROM car_bookings cb_now
          WHERE cb_now.listing_id = cl.id
            AND cb_now.status IN ('confirmed', 'active', 'disputed')
            AND cb_now.start_date <= NOW()
            AND cb_now.end_date > NOW()
        ) AS "isBookedNow",
        (live_sub.tier = 'business'::"SubscriptionTier") AS "verified"
      FROM car_listings cl
      INNER JOIN LATERAL (
        SELECT s.tier
        FROM subscriptions s
        WHERE s.user_id = cl.owner_id
          AND s.kind = 'hoster'::"SubscriptionKind"
          AND s.status IN ('active'::"SubscriptionStatus", 'cancelled'::"SubscriptionStatus")
          AND (s.renews_at IS NULL OR s.renews_at > NOW())
        ORDER BY s.starts_at DESC
        LIMIT 1
      ) live_sub ON TRUE
      WHERE ${whereClause}
      ORDER BY
        ${this.orderByPriceOrFallback(
          query.sort,
          Prisma.sql`cl.daily_rate_kigali_rwf`,
          query.sort === SearchSort.score || query.sort === SearchSort.rating
            ? Prisma.sql`"ownerTrustScore" DESC NULLS LAST,`
            : Prisma.sql`CASE WHEN live_sub.tier IN ('premium'::"SubscriptionTier", 'business'::"SubscriptionTier") THEN 0 ELSE 1 END,`,
        )}
        ${hasQuery ? Prisma.sql`"searchRank" DESC,` : Prisma.empty}
        ${hasGeo ? Prisma.sql`"distanceMeters" ASC,` : Prisma.empty}
        cl.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      title: row.title,
      description: row.description,
      vehicleType: row.vehicleType,
      serviceType: row.serviceType,
      brand: row.brand,
      model: row.model,
      year: row.year,
      seats: row.seats,
      transmission: row.transmission,
      fuelType: row.fuelType,
      locationText: row.locationText,
      photos: row.photos,
      features: row.features,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      distanceMeters: row.distanceMeters,
      pickupLatitude: row.pickupLatitude,
      pickupLongitude: row.pickupLongitude,
      ownerTrustScore: row.ownerTrustScore,
      isBookedNow: Boolean(row.isBookedNow),
      verified: Boolean(row.verified),
      ...(includeExactRates
        ? {
            dailyRateKigaliRwf: row.dailyRateKigaliRwf,
            dailyRateCountrysideRwf: row.dailyRateCountrysideRwf,
          }
        : {
            approximateDailyRateRangeRwf: {
              kigali: this.getApproximatePriceRange(row.dailyRateKigaliRwf),
              countryside: this.getApproximatePriceRange(row.dailyRateCountrysideRwf),
            },
          }),
    }));
  }

  private async searchDrivers(
    query: SearchQueryDto,
    coordinates: { latitude?: number; longitude?: number },
    includeExactRates: boolean,
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const conditions: Prisma.Sql[] = [];
    const searchVector = Prisma.sql`
      to_tsvector(
        'simple',
        concat_ws(
          ' ',
          coalesce(u.full_name, ''),
          coalesce(dp.biography, ''),
          array_to_string(dp.categories, ' '),
          array_to_string(dp.service_areas, ' '),
          array_to_string(dp.certifications, ' ')
        )
      )
    `;
    const hasQuery = Boolean(query.query?.trim());
    if (hasQuery) {
      conditions.push(Prisma.sql`${searchVector} @@ plainto_tsquery('simple', ${query.query!.trim()})`);
    }

    const hasGeo = coordinates.latitude !== undefined && coordinates.longitude !== undefined;
    if (hasGeo) {
      const radiusMeters = Math.round((query.radiusKm ?? 25) * 1000);
      conditions.push(Prisma.sql`
        dp.primary_city_location IS NOT NULL
        AND ST_DWithin(
          dp.primary_city_location,
          ST_SetSRID(ST_MakePoint(${coordinates.longitude!}, ${coordinates.latitude!}), 4326)::geography,
          ${radiusMeters}
        )
      `);
    }

    if (query.driverCategory) {
      conditions.push(Prisma.sql`${query.driverCategory}::"DriverCategory" = ANY(dp.categories)`);
    }

    if (query.driverHasVehicle === true) {
      conditions.push(Prisma.sql`array_length(dp.vehicle_types, 1) > 0`);
    } else if (query.driverHasVehicle === false) {
      conditions.push(Prisma.sql`(dp.vehicle_types IS NULL OR array_length(dp.vehicle_types, 1) IS NULL OR array_length(dp.vehicle_types, 1) = 0)`);
    }

    if (query.driverTransmission) {
      const certValue = `Driving: ${query.driverTransmission}`;
      conditions.push(Prisma.sql`${certValue} = ANY(dp.certifications)`);
    }

    if (query.driverLicenseCategory) {
      const certValue = `License: ${query.driverLicenseCategory}`;
      conditions.push(Prisma.sql`${certValue} = ANY(dp.certifications)`);
    }
    if (query.priceMin !== undefined) {
      conditions.push(Prisma.sql`dp.daily_rate_rwf >= ${query.priceMin}`);
    }
    if (query.priceMax !== undefined) {
      conditions.push(Prisma.sql`dp.daily_rate_rwf <= ${query.priceMax}`);
    }
    if (query.experienceMin !== undefined) {
      conditions.push(Prisma.sql`dp.years_experience >= ${query.experienceMin}`);
    }

    if (query.availableNow) {
      conditions.push(Prisma.sql`
        NOT EXISTS (
          SELECT 1
          FROM driver_bookings db_now
          WHERE db_now.driver_id = dp.user_id
            AND db_now.status IN ('confirmed', 'active', 'disputed')
            AND db_now.start_at <= NOW()
            AND db_now.end_at > NOW()
        )
      `);
    }

    const whereClause = conditions.length > 0 ? Prisma.join(conditions, ' AND ') : Prisma.sql`TRUE`;
    const rows = await prisma.$queryRaw<SearchDriverRow[]>(Prisma.sql`
      SELECT
        dp.id,
        dp.user_id AS "userId",
        u.full_name AS "fullName",
        u.avatar_url AS "profilePhotoUrl",
        u.trust_score::float8 AS "trustScore",
        dp.driver_category AS "driverCategory",
        dp.years_experience AS "yearsExperience",
        dp.biography,
        dp.primary_city AS "primaryCity",
        dp.languages,
        dp.categories,
        dp.vehicle_types AS "vehicleTypes",
        dp.certifications,
        dp.service_areas AS "serviceAreas",
        dp.availability_calendar AS "availabilityCalendar",
        dp.rating::float8 AS rating,
        dp.completed_trips AS "completedTrips",
        dp.daily_rate_rwf::float8 AS "dailyRateRwf",
        dp.hourly_rate_rwf::float8 AS "hourlyRateRwf",
        dp.weekly_rate_rwf::float8 AS "weeklyRateRwf",
        dp.created_at AS "createdAt",
        dp.updated_at AS "updatedAt",
        ${
          hasGeo
            ? Prisma.sql`ST_Distance(
                dp.primary_city_location,
                ST_SetSRID(ST_MakePoint(${coordinates.longitude!}, ${coordinates.latitude!}), 4326)::geography
              )`
            : Prisma.sql`NULL`
        } AS "distanceMeters",
        ST_Y(dp.primary_city_location::geometry) AS "primaryCityLatitude",
        ST_X(dp.primary_city_location::geometry) AS "primaryCityLongitude",
        ${
          hasQuery
            ? Prisma.sql`ts_rank_cd(${searchVector}, plainto_tsquery('simple', ${query.query!.trim()}))`
            : Prisma.sql`0`
        } AS "searchRank",
        EXISTS (
          SELECT 1 FROM driver_bookings db_now
          WHERE db_now.driver_id = dp.user_id
            AND db_now.status IN ('confirmed', 'active', 'disputed')
            AND db_now.start_at <= NOW()
            AND db_now.end_at > NOW()
        ) AS "isBookedNow"
      FROM driver_profiles dp
      INNER JOIN users u ON u.id = dp.user_id
      INNER JOIN subscriptions s
        ON s.user_id = dp.user_id
        AND s.kind = 'driver'::"SubscriptionKind"
        AND s.status IN ('active'::"SubscriptionStatus", 'cancelled'::"SubscriptionStatus")
        AND (s.renews_at IS NULL OR s.renews_at > NOW())
      WHERE ${whereClause}
      ORDER BY
        ${this.orderByPriceOrFallback(
          query.sort,
          Prisma.sql`dp.daily_rate_rwf`,
          query.sort === SearchSort.score
            ? Prisma.sql`u.trust_score DESC,`
            : query.sort === SearchSort.rating
              ? Prisma.sql`dp.rating DESC NULLS LAST,`
              : Prisma.empty,
        )}
        ${hasQuery ? Prisma.sql`"searchRank" DESC,` : Prisma.empty}
        ${hasGeo ? Prisma.sql`"distanceMeters" ASC,` : Prisma.empty}
        dp.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      fullName: row.fullName,
      profilePhotoUrl: row.profilePhotoUrl,
      trustScore: row.trustScore,
      driverCategory: row.driverCategory,
      yearsExperience: row.yearsExperience,
      biography: row.biography,
      primaryCity: row.primaryCity,
      languages: row.languages,
      categories: row.categories,
      vehicleTypes: row.vehicleTypes,
      certifications: row.certifications,
      serviceAreas: row.serviceAreas,
      availabilityCalendar: row.availabilityCalendar,
      rating: row.rating,
      completedTrips: row.completedTrips,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      distanceMeters: row.distanceMeters,
      primaryCityLatitude: row.primaryCityLatitude,
      primaryCityLongitude: row.primaryCityLongitude,
      isBookedNow: Boolean(row.isBookedNow),
      ...(includeExactRates
        ? {
            dailyRateRwf: row.dailyRateRwf,
            hourlyRateRwf: row.hourlyRateRwf,
            weeklyRateRwf: row.weeklyRateRwf,
          }
        : {
            approximateRateRangeRwf: {
              daily: this.getApproximatePriceRange(row.dailyRateRwf),
              ...(row.hourlyRateRwf ? { hourly: this.getApproximatePriceRange(row.hourlyRateRwf) } : {}),
              ...(row.weeklyRateRwf ? { weekly: this.getApproximatePriceRange(row.weeklyRateRwf) } : {}),
            },
          }),
    }));
  }

  private async searchTaxis(
    query: SearchQueryDto,
    coordinates: { latitude?: number; longitude?: number },
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const now = new Date();
    const liveTaxiSubs = await prisma.subscription.findMany({
      where: liveSubscriptionWhere(SubscriptionKind.taxi, now),
      select: { userId: true },
    });
    const liveUserIds = liveTaxiSubs.map((s) => s.userId);
    const needle = query.query?.trim().toLowerCase();
    const locationNeedle = query.location?.trim().toLowerCase();
    const hasGeo = coordinates.latitude !== undefined && coordinates.longitude !== undefined;
    const radiusMeters = Math.round((query.radiusKm ?? 25) * 1000);

    const rows = await prisma.taxiDriver.findMany({
      where: {
        status: TaxiDriverStatus.approved,
        OR: [{ userId: null }, { userId: { in: liveUserIds } }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        city: true,
        seats: true,
        details: true,
        carModel: true,
        vehicleType: true,
        photos: true,
        photoUrl: true,
        profilePhotoUrl: true,
      },
    });

    const mapped = rows
      .map((row) => {
        const coords = coordsForRwandaCity(row.city);
        const distance =
          hasGeo && coords
            ? distanceMeters(
                { latitude: coordinates.latitude!, longitude: coordinates.longitude! },
                coords,
              )
            : null;
        return {
          ...row,
          distanceMeters: distance,
          cityLatitude: coords?.latitude ?? null,
          cityLongitude: coords?.longitude ?? null,
        };
      })
      .filter((row) => {
        if (needle) {
          const haystack = [row.fullName, row.city, row.carModel, row.vehicleType, row.details]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        if (locationNeedle && !hasGeo && !row.city.toLowerCase().includes(locationNeedle)) {
          return false;
        }
        if (hasGeo) {
          if (row.distanceMeters == null) return false;
          return row.distanceMeters <= radiusMeters;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.distanceMeters != null && b.distanceMeters != null) {
          return a.distanceMeters - b.distanceMeters;
        }
        return 0;
      });

    return mapped.slice(offset, offset + limit);
  }

  private getApproximatePriceRange(rate: number) {
    const min = Math.max(1000, Math.floor(rate * 0.9));
    const max = Math.max(min, Math.ceil(rate * 1.1));
    return { min, max };
  }

  private validateCoordinates(latitude?: number, longitude?: number) {
    const hasLat = latitude !== undefined;
    const hasLng = longitude !== undefined;
    if (hasLat !== hasLng) {
      throw new BadRequestException('latitude and longitude must be provided together.');
    }
  }

  private async resolveCoordinates(latitude?: number, longitude?: number, location?: string) {
    if (latitude !== undefined || longitude !== undefined) {
      return { latitude, longitude };
    }

    if (!location) {
      return { latitude: undefined, longitude: undefined };
    }

    const directCoordinates = this.parseCoordinatesFromLocation(location);
    if (directCoordinates) {
      return directCoordinates;
    }

    return this.geocodeLocation(location);
  }

  private parseCoordinatesFromLocation(location: string): { latitude: number; longitude: number } | null {
    const [latRaw, lngRaw, ...rest] = location.split(',');
    if (!latRaw || !lngRaw || rest.length > 0) {
      return null;
    }

    const parsedLat = Number(latRaw.trim());
    const parsedLng = Number(lngRaw.trim());
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return null;
    }

    return {
      latitude: parsedLat,
      longitude: parsedLng,
    };
  }

  private async geocodeLocation(location: string): Promise<{ latitude: number; longitude: number }> {
    const { geocode } = await import('../geocoding/nominatim.service');
    const result = await geocode(location);
    return { latitude: result.latitude, longitude: result.longitude };
  }

  private validateDateRange(from?: string, to?: string) {
    if ((from && !to) || (!from && to)) {
      throw new BadRequestException('from and to must be provided together.');
    }
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (fromDate >= toDate) {
        throw new BadRequestException('to must be after from.');
      }
    }
  }

  private validateSeats(seatsMin?: number, seatsMax?: number) {
    if (seatsMin !== undefined && seatsMax !== undefined && seatsMin > seatsMax) {
      throw new BadRequestException('seatsMin cannot be greater than seatsMax.');
    }
  }

  private validatePrice(priceMin?: number, priceMax?: number) {
    if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
      throw new BadRequestException('priceMin cannot be greater than priceMax.');
    }
  }

  private orderByPriceOrFallback(sort: SearchSort | undefined, priceColumn: Prisma.Sql, fallback: Prisma.Sql) {
    if (sort === SearchSort.price_asc) return Prisma.sql`${priceColumn} ASC,`;
    if (sort === SearchSort.price_desc) return Prisma.sql`${priceColumn} DESC,`;
    return fallback;
  }
}
