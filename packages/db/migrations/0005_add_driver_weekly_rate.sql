ALTER TABLE "driver_profiles"
  ADD COLUMN IF NOT EXISTS "weekly_rate_rwf" DECIMAL(12, 2);
