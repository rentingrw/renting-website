-- Map legacy paused listings to inactive

UPDATE "car_listings"
SET "status" = 'inactive'::"ListingStatus"
WHERE "status" = 'paused'::"ListingStatus";
