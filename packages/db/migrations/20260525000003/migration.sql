-- AlterTable: add weekly/monthly rates and negotiable flag to car_listings
ALTER TABLE "car_listings" ADD COLUMN "weekly_rate_rwf" INTEGER;
ALTER TABLE "car_listings" ADD COLUMN "monthly_rate_rwf" INTEGER;
ALTER TABLE "car_listings" ADD COLUMN "price_negotiable" BOOLEAN NOT NULL DEFAULT false;
