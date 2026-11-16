-- AlterTable
ALTER TABLE "job_openings" ADD COLUMN "application_deadline" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "job_openings_application_deadline_idx" ON "job_openings"("application_deadline");