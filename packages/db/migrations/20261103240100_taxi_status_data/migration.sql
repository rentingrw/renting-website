UPDATE "taxi_drivers" SET status = 'active' WHERE status::text = 'approved';
UPDATE "taxi_drivers" SET status = 'active' WHERE status::text = 'pending';
