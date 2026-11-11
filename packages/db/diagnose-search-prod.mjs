/**
 * Usage (production DB):
 *   export DATABASE_URL='...'
 *   export DIRECT_DATABASE_URL='...'   # optional
 *   node packages/db/diagnose-search-prod.mjs
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), 'package.json'));
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function run(label, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    console.log(`OK  ${label} (${Date.now() - started}ms)`, JSON.stringify(result).slice(0, 240));
  } catch (error) {
    console.error(`FAIL ${label} (${Date.now() - started}ms):`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  console.log('host', new URL(process.env.DATABASE_URL).hostname);

  await run('postgis', async () =>
    prisma.$queryRaw`SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis'`,
  );

  await run('taxi findMany', async () =>
    prisma.taxiDriver.findMany({
      where: { status: 'active' },
      take: 1,
      select: {
        id: true,
        fullName: true,
        languages: true,
        workLocationText: true,
        contactPhoneEnabled: true,
        contactWhatsappEnabled: true,
        whatsapp: true,
        photos: true,
        photoUrl: true,
        profilePhotoUrl: true,
        city: true,
        seats: true,
        details: true,
        carModel: true,
        vehicleType: true,
        features: true,
        phone: true,
      },
    }),
  );

  await run('car search SQL (no geo)', async () =>
    prisma.$queryRaw`
      SELECT
        cl.id,
        cl.owner_id AS "ownerId",
        cl.title,
        cl.daily_rate_in_city_rwf AS "dailyRateInCityRwf",
        cl.daily_rate_outside_city_rwf AS "dailyRateOutsideCityRwf",
        cl.listing_city AS "listingCity",
        ST_Y(cl.pickup_location::geometry) AS "pickupLatitude",
        ST_X(cl.pickup_location::geometry) AS "pickupLongitude",
        (live_sub.tier = 'business'::"SubscriptionTier") AS "verified"
      FROM car_listings cl
      LEFT JOIN LATERAL (
        SELECT s.tier
        FROM subscriptions s
        WHERE s.user_id = cl.owner_id
          AND s.kind = 'hoster'::"SubscriptionKind"
          AND s.status IN ('active'::"SubscriptionStatus", 'cancelled'::"SubscriptionStatus")
          AND (s.renews_at IS NULL OR s.renews_at > NOW())
        ORDER BY s.starts_at DESC
        LIMIT 1
      ) live_sub ON TRUE
      WHERE cl.status = 'active'::"ListingStatus"
      ORDER BY
        CASE WHEN live_sub.tier IN ('premium'::"SubscriptionTier", 'business'::"SubscriptionTier") THEN 0 ELSE 1 END,
        cl.created_at DESC
      LIMIT 2
    `,
  );

  await run('driver search SQL', async () =>
    prisma.$queryRaw`
      SELECT dp.id, u.full_name
      FROM driver_profiles dp
      INNER JOIN users u ON u.id = dp.user_id
      WHERE dp.status = 'approved'::"DriverProfileStatus"
      LIMIT 2
    `,
  );

  await run('subscription kinds/tiers', async () =>
    prisma.$queryRaw`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname IN ('SubscriptionKind', 'SubscriptionTier', 'SubscriptionStatus', 'ListingStatus')
      ORDER BY 1,2
    `,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
