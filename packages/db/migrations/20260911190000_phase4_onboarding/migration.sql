ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

ALTER TABLE "car_owner_profiles" ADD COLUMN IF NOT EXISTS "work_address" TEXT;
ALTER TABLE "car_owner_profiles" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;

ALTER TABLE "driver_profiles" ADD COLUMN IF NOT EXISTS "license_categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "driver_profiles" ADD COLUMN IF NOT EXISTS "transmission" TEXT;
ALTER TABLE "driver_profiles" ADD COLUMN IF NOT EXISTS "address_text" TEXT;
ALTER TABLE "driver_profiles" ADD COLUMN IF NOT EXISTS "id_document_url" TEXT;
ALTER TABLE "driver_profiles" ADD COLUMN IF NOT EXISTS "license_document_url" TEXT;

ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "car_model" TEXT;
ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "plate" TEXT;
ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "vehicle_type" TEXT;
ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "features" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
