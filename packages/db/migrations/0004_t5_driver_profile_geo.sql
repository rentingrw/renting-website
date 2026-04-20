ALTER TABLE "driver_profiles"
  ADD COLUMN IF NOT EXISTS "primary_city" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_city_location" geography(Point, 4326);

UPDATE "driver_profiles"
SET "primary_city" = COALESCE("primary_city", NULLIF("service_areas"[1], ''), 'Kigali');

ALTER TABLE "driver_profiles"
  ALTER COLUMN "primary_city" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "driver_profiles_primary_city_location_gix"
  ON "driver_profiles"
  USING GIST ("primary_city_location");
