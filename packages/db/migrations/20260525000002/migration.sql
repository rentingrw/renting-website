-- AlterTable: add photo fields to taxi_drivers
ALTER TABLE "taxi_drivers" ADD COLUMN "photo_url" TEXT;
ALTER TABLE "taxi_drivers" ADD COLUMN "profile_photo_url" TEXT;
