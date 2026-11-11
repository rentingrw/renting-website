/**
 * Run from repo root with .env loaded:
 *   set -a && source .env && set +a
 *   node packages/db/diagnose-prod-db.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), 'package.json'));
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });

function ok(label, value) {
  console.log(`OK  ${label}`, typeof value === 'object' ? JSON.stringify(value).slice(0, 220) : value);
}

function fail(label, error) {
  console.error(`FAIL ${label}:`, error instanceof Error ? error.message : error);
}

async function main() {
  console.log('DATABASE_URL host:', (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').hostname;
    } catch {
      return '(invalid)';
    }
  })());

  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('job_openings', 'car_listings', 'taxi_drivers', 'driver_profiles')
      ORDER BY table_name
    `;
    ok('tables', tables);
  } catch (error) {
    fail('tables', error);
  }

  try {
    const cols = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'car_listings'
        AND column_name IN (
          'listing_city',
          'daily_rate_in_city_rwf',
          'daily_rate_outside_city_rwf',
          'color',
          'plate_number'
        )
      ORDER BY column_name
    `;
    ok('car_listings key columns', cols);
  } catch (error) {
    fail('car_listings key columns', error);
  }

  try {
    const taxiCols = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'taxi_drivers'
        AND column_name IN (
          'languages',
          'work_location_text',
          'contact_phone_enabled',
          'contact_whatsapp_enabled'
        )
      ORDER BY column_name
    `;
    ok('taxi_drivers key columns', taxiCols);
  } catch (error) {
    fail('taxi_drivers key columns', error);
  }

  try {
    const enums = await prisma.$queryRaw`
      SELECT t.typname AS name, e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('TaxiDriverStatus', 'DriverProfileStatus', 'ListingStatus', 'SubscriptionTier')
      ORDER BY 1, 2
    `;
    ok('enums', enums);
  } catch (error) {
    fail('enums', error);
  }

  try {
    const jobs = await prisma.jobOpening.findMany({ take: 2 });
    ok('prisma.jobOpening.findMany', jobs);
  } catch (error) {
    fail('prisma.jobOpening.findMany', error);
  }

  try {
    const taxis = await prisma.taxiDriver.findMany({
      where: { status: 'active' },
      take: 1,
      select: {
        id: true,
        fullName: true,
        languages: true,
        workLocationText: true,
        contactPhoneEnabled: true,
        contactWhatsappEnabled: true,
      },
    });
    ok('prisma.taxiDriver.findMany active', taxis);
  } catch (error) {
    fail('prisma.taxiDriver.findMany active', error);
  }

  try {
    const cars = await prisma.$queryRaw`
      SELECT cl.id, cl.listing_city, cl.daily_rate_in_city_rwf,
             ST_Y(cl.pickup_location::geometry) AS lat
      FROM car_listings cl
      WHERE cl.status = 'active'::"ListingStatus"
      LIMIT 2
    `;
    ok('car search core SQL', cars);
  } catch (error) {
    fail('car search core SQL', error);
  }

  try {
    const drivers = await prisma.$queryRaw`
      SELECT dp.id
      FROM driver_profiles dp
      WHERE dp.status = 'approved'::"DriverProfileStatus"
      LIMIT 2
    `;
    ok('driver search core SQL', drivers);
  } catch (error) {
    fail('driver search core SQL', error);
  }

  try {
    const banner = await prisma.siteBanner.findFirst({ where: { isActive: true } });
    ok('banner', banner);
  } catch (error) {
    fail('banner', error);
  }
}

main()
  .catch((error) => {
    console.error('fatal', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
