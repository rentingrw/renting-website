-- CreateEnum
CREATE TYPE "SiteComplaintStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "site_complaints" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "status" "SiteComplaintStatus" NOT NULL DEFAULT 'open',
    "admin_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_complaints_status_created_at_idx" ON "site_complaints"("status", "created_at" DESC);