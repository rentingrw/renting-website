DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'SubscriptionStatus' AND e.enumlabel = 'draft'
  ) THEN
    ALTER TYPE "SubscriptionStatus" ADD VALUE 'draft';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'SubscriptionStatus' AND e.enumlabel = 'pending_payment'
  ) THEN
    ALTER TYPE "SubscriptionStatus" ADD VALUE 'pending_payment';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'SubscriptionStatus' AND e.enumlabel = 'suspended'
  ) THEN
    ALTER TYPE "SubscriptionStatus" ADD VALUE 'suspended';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionKind') THEN
    CREATE TYPE "SubscriptionKind" AS ENUM ('hoster', 'driver', 'taxi');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "promo_codes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "SubscriptionKind",
    "discount_percent" INTEGER,
    "discount_rwf" INTEGER,
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key" ON "promo_codes"("code");

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "kind" "SubscriptionKind" NOT NULL DEFAULT 'hoster';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "promo_code_id" UUID;

UPDATE "subscriptions" SET "kind" = 'driver' WHERE "tier" = 'free';

CREATE INDEX IF NOT EXISTS "subscriptions_kind_status_idx" ON "subscriptions"("kind", "status");

ALTER TABLE "taxi_drivers" ADD COLUMN IF NOT EXISTS "user_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "taxi_drivers_user_id_key" ON "taxi_drivers"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'taxi_drivers_user_id_fkey'
  ) THEN
    ALTER TABLE "taxi_drivers"
      ADD CONSTRAINT "taxi_drivers_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_promo_code_id_fkey'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_promo_code_id_fkey"
      FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
