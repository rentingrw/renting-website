-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'pending_verification', 'suspended', 'deactivated', 'banned');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('renter', 'car_owner', 'driver');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'pending_approval', 'active', 'paused', 'rejected', 'deleted', 'archived');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'declined', 'auto_cancelled', 'overlap_declined', 'cancelled_by_renter', 'cancelled_by_owner', 'cancelled_admin', 'active', 'completed', 'auto_completed', 'disputed');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'standard', 'premium', 'business');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'cancelled', 'expired', 'past_due', 'unpaid');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('momo', 'airtel_money', 'card', 'bank_transfer', 'cash', 'wallet');

-- CreateEnum
CREATE TYPE "TrustEventType" AS ENUM ('booking_completed_positive', 'booking_cancelled_negative', 'review_received', 'review_flagged', 'dispute_opened', 'dispute_resolved', 'profile_verified', 'admin_adjustment');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'waiting_evidence', 'resolved', 'rejected', 'escalated');

-- CreateEnum
CREATE TYPE "DriverCategory" AS ENUM ('city', 'outstation', 'airport', 'chauffeur', 'tour_guide', 'delivery');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'rw', 'fr', 'sw');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('self_drive', 'with_driver', 'private_driver', 'airport_transfer', 'corporate');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('sedan', 'suv', 'hatchback', 'pickup', 'van', 'truck');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "clerk_id" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "primary_role" "RoleType" NOT NULL DEFAULT 'renter',
    "trust_score" DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    "language_preference" "Language" NOT NULL DEFAULT 'en',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "RoleType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_owner_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_name" TEXT,
    "national_id_number" TEXT,
    "tin_number" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_owner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "driver_category" "DriverCategory" NOT NULL,
    "years_experience" INTEGER NOT NULL,
    "biography" TEXT,
    "daily_rate_rwf" DECIMAL(12,2) NOT NULL,
    "hourly_rate_rwf" DECIMAL(12,2),
    "weekly_rate_rwf" DECIMAL(12,2),
    "primary_city" TEXT NOT NULL,
    "primary_city_location" geography(Point, 4326),
    "languages" "Language"[],
    "categories" "DriverCategory"[],
    "vehicle_types" "VehicleType"[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "service_areas" TEXT[],
    "availability_calendar" JSONB NOT NULL,
    "rating" DECIMAL(3,2),
    "completed_trips" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_listings" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vehicle_type" "VehicleType" NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL,
    "transmission" TEXT,
    "fuel_type" TEXT,
    "daily_rate_kigali_rwf" INTEGER NOT NULL,
    "daily_rate_countryside_rwf" INTEGER NOT NULL,
    "location_text" TEXT NOT NULL,
    "pickup_location" geography(Point, 4326),
    "photos" TEXT[],
    "features" TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_bookings" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "renter_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "pickup_location" geography(Point, 4326),
    "total_amount_rwf" INTEGER NOT NULL,
    "payment_method" "PaymentMethod",
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "renter_marked_complete" BOOLEAN NOT NULL DEFAULT false,
    "owner_marked_complete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_bookings" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "renter_id" UUID NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "dropoff_address" TEXT,
    "pickup_location" geography(Point, 4326),
    "total_amount_rwf" INTEGER NOT NULL,
    "payment_method" "PaymentMethod",
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "driver_marked_complete" BOOLEAN NOT NULL DEFAULT false,
    "client_marked_complete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_score_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "TrustEventType" NOT NULL,
    "car_booking_id" UUID,
    "driver_booking_id" UUID,
    "delta" DECIMAL(5,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "car_booking_id" UUID,
    "driver_booking_id" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "car_owner_profile_id" UUID,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "amount_rwf" INTEGER NOT NULL,
    "payment_method" "PaymentMethod",
    "external_ref" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "renews_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "car_booking_id" UUID,
    "driver_booking_id" UUID,
    "content" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "against_user_id" UUID NOT NULL,
    "car_booking_id" UUID,
    "driver_booking_id" UUID,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolution_note" TEXT,
    "admin_notes" TEXT,
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "car_owner_profiles_user_id_key" ON "car_owner_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles"("user_id");

-- CreateIndex
CREATE INDEX "car_listings_status_idx" ON "car_listings"("status");

-- CreateIndex
CREATE INDEX "car_bookings_status_created_at_idx" ON "car_bookings"("status", "created_at");

-- CreateIndex
CREATE INDEX "driver_bookings_status_created_at_idx" ON "driver_bookings"("status", "created_at");

-- CreateIndex
CREATE INDEX "trust_score_events_user_id_idx" ON "trust_score_events"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_renews_at_idx" ON "subscriptions"("renews_at");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_owner_profiles" ADD CONSTRAINT "car_owner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_listings" ADD CONSTRAINT "car_listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_bookings" ADD CONSTRAINT "car_bookings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "car_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_bookings" ADD CONSTRAINT "car_bookings_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_bookings" ADD CONSTRAINT "car_bookings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_bookings" ADD CONSTRAINT "driver_bookings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_bookings" ADD CONSTRAINT "driver_bookings_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_car_booking_id_fkey" FOREIGN KEY ("car_booking_id") REFERENCES "car_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_driver_booking_id_fkey" FOREIGN KEY ("driver_booking_id") REFERENCES "driver_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_car_booking_id_fkey" FOREIGN KEY ("car_booking_id") REFERENCES "car_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_driver_booking_id_fkey" FOREIGN KEY ("driver_booking_id") REFERENCES "driver_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_car_owner_profile_id_fkey" FOREIGN KEY ("car_owner_profile_id") REFERENCES "car_owner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_car_booking_id_fkey" FOREIGN KEY ("car_booking_id") REFERENCES "car_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_driver_booking_id_fkey" FOREIGN KEY ("driver_booking_id") REFERENCES "driver_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_against_user_id_fkey" FOREIGN KEY ("against_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_car_booking_id_fkey" FOREIGN KEY ("car_booking_id") REFERENCES "car_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_driver_booking_id_fkey" FOREIGN KEY ("driver_booking_id") REFERENCES "driver_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
