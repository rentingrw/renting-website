ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'deleted';

ALTER TABLE "car_listings"
  ADD COLUMN IF NOT EXISTS "daily_rate_kigali_rwf" INTEGER,
  ADD COLUMN IF NOT EXISTS "daily_rate_countryside_rwf" INTEGER;

UPDATE "car_listings"
SET
  "daily_rate_kigali_rwf" = COALESCE("daily_rate_kigali_rwf", "daily_rate_rwf"),
  "daily_rate_countryside_rwf" = COALESCE("daily_rate_countryside_rwf", "daily_rate_rwf");

ALTER TABLE "car_listings"
  ALTER COLUMN "daily_rate_kigali_rwf" SET NOT NULL,
  ALTER COLUMN "daily_rate_countryside_rwf" SET NOT NULL;

ALTER TABLE "car_listings"
  DROP COLUMN IF EXISTS "daily_rate_rwf";
