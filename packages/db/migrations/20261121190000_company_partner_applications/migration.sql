-- CreateEnum
CREATE TYPE "CompanyPartnerApplicationStatus" AS ENUM ('pending_approval', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "company_partner_applications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_phone" TEXT,
    "work_address" TEXT,
    "tin_number" TEXT,
    "message" TEXT,
    "status" "CompanyPartnerApplicationStatus" NOT NULL DEFAULT 'pending_approval',
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_partner_applications_user_id_key" ON "company_partner_applications"("user_id");

-- CreateIndex
CREATE INDEX "company_partner_applications_status_submitted_at_idx" ON "company_partner_applications"("status", "submitted_at");

-- AddForeignKey
ALTER TABLE "company_partner_applications" ADD CONSTRAINT "company_partner_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;