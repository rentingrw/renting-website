-- CreateEnum
CREATE TYPE "CarHostType" AS ENUM ('individual', 'company');

-- AlterTable
ALTER TABLE "car_owner_profiles" ADD COLUMN "host_type" "CarHostType";

-- AlterTable
ALTER TABLE "car_listings" ADD COLUMN "plate_number" TEXT;
ALTER TABLE "car_listings" ADD COLUMN "color" TEXT;
