import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface GeoRadiusParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  limit?: number;
}

export interface CarListingWithinRadiusRow {
  id: string;
  distanceMeters: number;
}

/**
 * Finds car listings within a radius of a point using ST_DWithin.
 * - latitude/longitude are WGS84 coordinates
 * - radiusMeters is the search radius in meters
 */
export async function findCarListingsWithinRadius(
  params: GeoRadiusParams,
  client: PrismaClient = prisma
): Promise<CarListingWithinRadiusRow[]> {
  const { latitude, longitude, radiusMeters, limit = 50 } = params;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('latitude and longitude must be finite numbers');
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new Error('radiusMeters must be a positive number');
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('limit must be a positive integer');
  }

  return client.$queryRaw<CarListingWithinRadiusRow[]>(Prisma.sql`
    SELECT
      cl.id,
      ST_Distance(
        cl.pickup_location,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) AS "distanceMeters"
    FROM car_listings cl
    WHERE cl.pickup_location IS NOT NULL
      AND ST_DWithin(
        cl.pickup_location,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY "distanceMeters" ASC
    LIMIT ${limit}
  `);
}

export * from '@prisma/client';
