-- Add marketplace visibility enum values (must commit before use in UPDATE)

ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'booked';
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'inactive';
