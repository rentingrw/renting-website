import { BadRequestException, Injectable } from '@nestjs/common';
import { ListingStatus, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-request.interface';
import { prisma } from '../database/prisma';
import { SearchType, type SearchQueryDto } from './dto/search-query.dto';

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
}

@Injectable()
export class SearchService {
  async search(query: SearchQueryDto, user?: AuthenticatedUser) {
    const type = query.type ?? SearchType.all;
    const coordinates = await this.resolveCoordinates(query.latitude, query.longitude, query.location);
    this.validateCoordinates(coordinates.latitude, coordinates.longitude);
    this.validateDateRange(query.from, query.to);
    this.validateSeats(query.seatsMin, query.seatsMax);
    const includeExactRates = Boolean(user);
    const shouldSearchCars = type !== SearchType.drivers;
    const shouldSearchDrivers = type !== SearchType.cars;
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [cars, drivers] = await Promise.all([
      shouldSearchCars ? this.searchCars(query, coordinates, includeExactRates) : Promise.resolve([]),
      shouldSearchDrivers ? this.searchDrivers(query, coordinates, includeExactRates) : Promise.resolve([]),
    ]);

    return {
      type,
      cars,
      drivers,
      pagination: {
        limit,
        offset,
        hasMoreCars: shouldSearchCars ? cars.length === limit : false,
        hasMoreDrivers: shouldSearchDrivers ? drivers.length === limit : false,
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
        } AS "searchRank"
      FROM car_listings cl
      WHERE ${whereClause}
      ORDER BY
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
        } AS "searchRank"
      FROM driver_profiles dp
      INNER JOIN users u ON u.id = dp.user_id
      INNER JOIN subscriptions s
        ON s.user_id = dp.user_id
        AND s.tier = 'free'::"SubscriptionTier"
        AND s.status = 'active'::"SubscriptionStatus"
        AND (s.renews_at IS NULL OR s.renews_at > NOW())
      WHERE ${whereClause}
      ORDER BY
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
}
