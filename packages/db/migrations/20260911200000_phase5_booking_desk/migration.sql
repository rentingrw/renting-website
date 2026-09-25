ALTER TABLE "car_bookings" ADD COLUMN IF NOT EXISTS "renter_phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "car_bookings" ADD COLUMN IF NOT EXISTS "is_instant" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "car_bookings" ADD COLUMN IF NOT EXISTS "previous_booking_id" UUID;
ALTER TABLE "car_bookings" ADD COLUMN IF NOT EXISTS "try_next_group_id" UUID;

ALTER TABLE "driver_bookings" ADD COLUMN IF NOT EXISTS "renter_phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "driver_bookings" ADD COLUMN IF NOT EXISTS "is_instant" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "driver_bookings" ADD COLUMN IF NOT EXISTS "previous_booking_id" UUID;
ALTER TABLE "driver_bookings" ADD COLUMN IF NOT EXISTS "try_next_group_id" UUID;

CREATE INDEX IF NOT EXISTS "car_bookings_try_next_group_id_idx" ON "car_bookings" ("try_next_group_id");
CREATE INDEX IF NOT EXISTS "driver_bookings_try_next_group_id_idx" ON "driver_bookings" ("try_next_group_id");
