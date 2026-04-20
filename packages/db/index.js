"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.findCarListingsWithinRadius = findCarListingsWithinRadius;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ?? new client_1.PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
/**
 * Finds car listings within a radius of a point using ST_DWithin.
 * - latitude/longitude are WGS84 coordinates
 * - radiusMeters is the search radius in meters
 */
async function findCarListingsWithinRadius(params, client = exports.prisma) {
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
    return client.$queryRaw(client_1.Prisma.sql `
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
__exportStar(require("@prisma/client"), exports);
