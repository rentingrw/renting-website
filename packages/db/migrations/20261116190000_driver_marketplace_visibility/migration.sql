-- CreateEnum
CREATE TYPE "MarketplaceVisibility" AS ENUM ('active', 'inactive', 'booked');

-- AlterTable
ALTER TABLE "driver_profiles" ADD COLUMN "marketplace_visibility" "MarketplaceVisibility" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "driver_profiles_marketplace_visibility_idx" ON "driver_profiles"("marketplace_visibility");