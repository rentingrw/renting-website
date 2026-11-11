-- CreateEnum
CREATE TYPE "DriverProfileStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "driver_profiles" ADD COLUMN "status" "DriverProfileStatus" NOT NULL DEFAULT 'draft';
ALTER TABLE "driver_profiles" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "driver_profiles" ADD COLUMN "submitted_at" TIMESTAMP(3);
ALTER TABLE "driver_profiles" ADD COLUMN "reviewed_at" TIMESTAMP(3);

CREATE INDEX "driver_profiles_status_idx" ON "driver_profiles"("status");

-- Existing profiles were live without review; mark them approved.
UPDATE "driver_profiles" SET "status" = 'approved' WHERE "status" = 'draft';
