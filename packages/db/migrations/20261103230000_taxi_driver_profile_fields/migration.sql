ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "work_location_text" TEXT;
ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "contact_phone_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "contact_whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true;
