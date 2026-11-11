CREATE TABLE "job_openings" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_openings_is_active_idx" ON "job_openings"("is_active");
