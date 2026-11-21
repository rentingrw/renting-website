-- Align DB defaults with schema.prisma (booking indexes already match after schema update).
ALTER TABLE "driver_favorites" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "site_banners"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "taxi_drivers" ALTER COLUMN "status" SET DEFAULT 'active';