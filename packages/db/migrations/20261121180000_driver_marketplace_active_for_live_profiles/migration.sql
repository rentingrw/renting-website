-- Non-draft driver profiles stay discoverable in search; only draft stays hidden.
-- Re-activate profiles that were set inactive when reverification used to hide listings.
UPDATE "driver_profiles"
SET "marketplace_visibility" = 'active'::"MarketplaceVisibility"
WHERE "status" <> 'draft'::"DriverProfileStatus"
  AND "marketplace_visibility" = 'inactive'::"MarketplaceVisibility";