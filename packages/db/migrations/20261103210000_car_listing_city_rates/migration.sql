-- Listing city + in/outside city rates (daily, weekly, monthly)

ALTER TABLE "car_listings" ADD COLUMN IF NOT EXISTS "listing_city" TEXT;

UPDATE "car_listings"
SET "listing_city" = COALESCE(
  NULLIF(trim(split_part("location_text", ',', 3)), ''),
  'Kigali'
)
WHERE "listing_city" IS NULL;

ALTER TABLE "car_listings" RENAME COLUMN "daily_rate_kigali_rwf" TO "daily_rate_in_city_rwf";
ALTER TABLE "car_listings" RENAME COLUMN "daily_rate_countryside_rwf" TO "daily_rate_outside_city_rwf";

ALTER TABLE "car_listings" ADD COLUMN IF NOT EXISTS "weekly_rate_in_city_rwf" INTEGER;
ALTER TABLE "car_listings" ADD COLUMN IF NOT EXISTS "weekly_rate_outside_city_rwf" INTEGER;
ALTER TABLE "car_listings" ADD COLUMN IF NOT EXISTS "monthly_rate_in_city_rwf" INTEGER;
ALTER TABLE "car_listings" ADD COLUMN IF NOT EXISTS "monthly_rate_outside_city_rwf" INTEGER;

UPDATE "car_listings"
SET
  "weekly_rate_in_city_rwf" = COALESCE("weekly_rate_rwf", "daily_rate_in_city_rwf" * 6),
  "weekly_rate_outside_city_rwf" = COALESCE("weekly_rate_rwf", "daily_rate_outside_city_rwf" * 6),
  "monthly_rate_in_city_rwf" = COALESCE("monthly_rate_rwf", "daily_rate_in_city_rwf" * 28),
  "monthly_rate_outside_city_rwf" = COALESCE("monthly_rate_rwf", "daily_rate_outside_city_rwf" * 28);

ALTER TABLE "car_listings" ALTER COLUMN "weekly_rate_in_city_rwf" SET NOT NULL;
ALTER TABLE "car_listings" ALTER COLUMN "weekly_rate_outside_city_rwf" SET NOT NULL;
ALTER TABLE "car_listings" ALTER COLUMN "monthly_rate_in_city_rwf" SET NOT NULL;
ALTER TABLE "car_listings" ALTER COLUMN "monthly_rate_outside_city_rwf" SET NOT NULL;
ALTER TABLE "car_listings" ALTER COLUMN "listing_city" SET NOT NULL;

ALTER TABLE "car_listings" DROP COLUMN IF EXISTS "weekly_rate_rwf";
ALTER TABLE "car_listings" DROP COLUMN IF EXISTS "monthly_rate_rwf";
