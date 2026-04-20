DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'BookingStatus' AND e.enumlabel = 'declined'
  ) THEN
    ALTER TYPE "BookingStatus" ADD VALUE 'declined';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'BookingStatus' AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE "BookingStatus" ADD VALUE 'completed';
  END IF;
END
$$;

ALTER TABLE "trust_score_events"
ALTER COLUMN "delta" TYPE DECIMAL(5, 2)
USING "delta"::DECIMAL(5, 2);
