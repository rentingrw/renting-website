-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL,
    "job_opening_id" UUID,
    "role_title" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_applications_created_at_idx" ON "job_applications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "job_applications_job_opening_id_idx" ON "job_applications"("job_opening_id");

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id") ON DELETE SET NULL ON UPDATE CASCADE;