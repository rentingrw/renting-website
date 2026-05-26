# renting.rw — Developer Handoff Document

**Last updated:** 2026-05-26  
**Prepared for:** incoming developer  
**Stack:** Turborepo monorepo · NestJS API · Next.js 15 web · Next.js 15 admin · Prisma + Neon PostgreSQL

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Local Development Setup](#3-local-development-setup)
4. [Environment Variables](#4-environment-variables)
5. [Database](#5-database)
6. [Architecture & Key Patterns](#6-architecture--key-patterns)
7. [Authentication (Clerk)](#7-authentication-clerk)
8. [Payment Integration (iPay/MoPay)](#8-payment-integration-ipaymopay)
9. [API Module Reference](#9-api-module-reference)
10. [Web App Pages](#10-web-app-pages)
11. [Admin App](#11-admin-app)
12. [Subscription & Pricing Logic](#12-subscription--pricing-logic)
13. [Real-time / Chat](#13-real-time--chat)
14. [Deployment (Vercel)](#14-deployment-vercel)
15. [Known Issues & Tech Debt](#15-known-issues--tech-debt)
16. [Pending Features](#16-pending-features)

---

## 1. Project Overview

**renting.rw** is a Rwanda-based marketplace for car rentals and professional driver bookings. It has three user roles:

- **Renter** — books cars or drivers
- **Car owner** — lists vehicles, manages bookings, pays subscription to publish listings
- **Driver** — creates a driver profile, pays subscription to appear in search results

The platform is live at:
- Web: `https://renting.rw`
- API: `https://api.renting.rw`
- Admin: `https://admin.renting.rw` (admin-only, protected by JWT)
- Swagger docs: `https://api.renting.rw/api/docs`

---

## 2. Repository Structure

```
rentingi/                         ← monorepo root
├── apps/
│   ├── api/                      ← NestJS REST API (port 3001)
│   ├── web/                      ← Next.js 15 public website (port 3000)
│   └── admin/                    ← Next.js 15 admin dashboard (port 3002)
├── packages/
│   ├── db/                       ← Prisma schema, migrations, seed
│   ├── ui/                       ← Shared React component library
│   └── types/                    ← Shared TypeScript types
├── .env                          ← Local env (gitignored)
├── .env.example                  ← Template for all required env vars
├── turbo.json                    ← Turborepo pipeline config
└── pnpm-workspace.yaml
```

**Package manager:** pnpm 9 (required — do not use npm or yarn)  
**Build orchestrator:** Turborepo 2

---

## 3. Local Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in env vars
cp .env.example .env
# Edit .env — minimum required: DATABASE_URL, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# 3. Generate Prisma client
pnpm db:generate

# 4. Run all apps in parallel
pnpm dev

# Or run individually:
pnpm --filter @rentingi/api dev        # API on :3001
pnpm --filter @rentingi/web dev        # Web on :3000
pnpm --filter @rentingi/admin dev      # Admin on :3002

# Database tools
pnpm db:studio                         # Prisma Studio UI
pnpm db:seed                           # Seed the database
```

---

## 4. Environment Variables

All env vars live in a single `.env` at the monorepo root. The API validates them on startup via Zod (`apps/api/src/app.module.ts`).

### Required in all environments

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string (`postgresql://...?sslmode=require`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_live_...` or `pk_test_...`) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret (set up in Clerk dashboard) |
| `ADMIN_JWT_SECRET` | Secret for signing admin session tokens |

### Required in production only (optional locally)

| Variable | Description |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Image upload CDN |
| `CLOUDINARY_API_KEY` | |
| `CLOUDINARY_API_SECRET` | |
| `AT_API_KEY` | Africa's Talking SMS |
| `AT_USERNAME` | |
| `RESEND_API_KEY` | Transactional email (Resend) |
| `RESEND_FROM_EMAIL` | e.g. `renting.rw <noreply@renting.rw>` |
| `IPAY_API_KEY` | iPay/MoPay payment gateway key |
| `PUBLIC_API_URL` | **Must be set on Vercel** — `https://api.renting.rw` — used to build payment callback URLs. If empty string, payments will fail silently. |

### Optional

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis for Socket.io adapter (falls back to in-memory if absent) |
| `MTN_MOMO_BASE_URL` / `_SUBSCRIPTION_KEY` / `_API_USER` / `_API_KEY` / `_WEBHOOK_SECRET` | MTN MoMo (not currently wired) |
| `AIRTEL_BASE_URL` / `_CLIENT_ID` / `_CLIENT_SECRET` / `_WEBHOOK_SECRET` | Airtel Money (not currently wired) |
| `NEXT_PUBLIC_APP_URL` | Defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_ADMIN_URL` | Defaults to `http://localhost:3002` |
| `NEXT_PUBLIC_API_URL` | Defaults to `http://localhost:3001` |

### Production values (Vercel dashboard)

- API project: `prj_2dRXDS2lTxy8f6lscb2BjWr1VloW`
- Web project: `prj_qP7ACVjUTZM9CRTbQPpr5SiFKpU9`
- Org: `team_b8rTjg12FWGxvpSS3Zyr84nt` (`rentingrws-projects`)

---

## 5. Database

**Provider:** Neon PostgreSQL (serverless Postgres)  
**Host:** `ep-summer-haze-aimwqyk8.c-4.us-east-1.aws.neon.tech`  
**Schema file:** `packages/db/schema.prisma`

### Data models

| Model | Purpose |
|---|---|
| `User` | Core user — linked to Clerk via `clerkId` |
| `UserRole` | Secondary roles (a user can be renter + car_owner + driver) |
| `CarOwnerProfile` | KYC info (national ID, TIN, company name) |
| `DriverProfile` | Driver's professional profile |
| `CarListing` | Car rental listing |
| `CarBooking` | Booking for a car (renter ↔ owner) |
| `DriverBooking` | Booking for a driver (client ↔ driver) |
| `Subscription` | Car owner or driver subscription |
| `Message` | Chat messages linked to bookings |
| `Review` | Post-booking reviews |
| `Dispute` | Raised against a booking |
| `Favorite` | Saved car listings |
| `DriverFavorite` | Saved driver profiles |
| `TaxiDriver` | Separate taxi driver registration (no Clerk account needed) |
| `SiteBanner` | Active site-wide notification banner |
| `TrustScoreEvent` | Audit log for trust score changes |

### Migrations

```bash
cd packages/db
pnpm prisma migrate dev --name your_migration_name   # create + apply
pnpm prisma migrate deploy                           # apply in production
```

### Trust score

Users have a `trustScore` (0–100 Decimal). `apps/api/src/users/trust-tier.ts` maps it to: `new` / `verified` / `trusted` / `elite`.

---

## 6. Architecture & Key Patterns

### Monorepo build pipeline

Turborepo runs `build` tasks in dependency order: `db:generate` → `db:build` → `api:build` / `web:build` / `admin:build`.

### API (NestJS)

- Entry: `apps/api/src/main.ts`
- Global validation pipe with `whitelist: true, transform: true`
- Throttler: 600 req/min default, 30 req/min strict (for auth/payment endpoints). Use `@SkipThrottle()` for public read endpoints hit frequently (banners, driver/user public profiles).
- Swagger available at `/api/docs`
- CORS: allows `renting.rw`, `www.renting.rw`, `admin.renting.rw`, plus any `*.vercel.app` preview URL matching the project slug pattern

### Web (Next.js 15 App Router)

- All pages live under `apps/web/src/app/[locale]/` for i18n
- **Three supported locales:** `en` (default), `rw`, `fr`
- All page components are `'use client'` — no RSC data fetching; all data is fetched client-side via `apps/web/src/lib/api.ts`
- Design system: neo-brutalism (bold borders, offset shadows, cream background `#f5f0e8`)
- Translations: `apps/web/src/messages/{en,rw,fr}.json`

### Key API call pattern (web)

```typescript
// apps/web/src/lib/api.ts — all API calls go through here
const token = await getToken();  // always call fresh — tokens expire in 60s
const data = await getSomeResource(token);
```

**Critical:** Never cache the Clerk token. Always call `getToken()` fresh before each authenticated request — Clerk tokens expire after 60 seconds.

---

## 7. Authentication (Clerk)

**Provider:** Clerk (`clerk.renting.rw` custom domain — CNAME pointing to Clerk's CDN)

### How it works

1. User signs in via Clerk hosted UI
2. Clerk issues a short-lived JWT (60s expiry, auto-renewed by `getToken()`)
3. API validates the JWT against Clerk's JWKS endpoint
4. On first sign-in, the web app's `UserSync` component (`apps/web/src/components/web/user-sync.tsx`) calls `POST /auth/sync` to create the DB record

### Auth guards (API)

- `ClerkAuthGuard` — requires valid Clerk JWT
- `OptionalClerkAuthGuard` — attaches user if token present, allows unauthenticated access
- `AdminGuard` — validates the admin JWT (separate from Clerk)

### New user sync

New users must be synced to the DB before they can book. The `UserSync` component handles this silently on first load. The booking dialog also has a catch-and-retry for the "User not found" error.

### Clerk webhook

`POST /webhooks/clerk` — receives `user.created` / `user.updated` / `user.deleted` events. The body must be raw (no JSON parsing by Express) — this is configured in `main.ts`.

---

## 8. Payment Integration (iPay/MoPay)

**Gateway:** iPay Rwanda / MoPay (`https://api.mopay.ipay.rw`)

### Flow

1. User calls `POST /subscriptions/initiate` with phone + tier
2. API creates a `Subscription` record with `status: unpaid`
3. API calls iPay `POST /initiate-payment` — triggers USSD push to user's phone
4. User approves on their phone
5. iPay calls back `GET /subscriptions/callback/ipay?transactionId=xxx&status=200`
6. API activates the subscription

### Critical: callback URL

The callback URL is built from `PUBLIC_API_URL` env var in `apps/api/src/subscriptions/subscriptions.service.ts`:

```typescript
private buildCallbackUrl(): string {
  const base = (process.env.PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/subscriptions/callback/ipay`;
}
```

**`PUBLIC_API_URL` must be set to `https://api.renting.rw` on Vercel.** If it's empty or wrong, iPay cannot call back and payments will stay stuck at `pending_payment`.

### Manual activation (emergency)

If a payment is stuck, activate it manually:

```bash
curl "https://api.renting.rw/subscriptions/callback/ipay?transactionId=TRANSACTION_ID&status=200"
```

Find the `transactionId` in the `Subscription.externalRef` column in the DB.

---

## 9. API Module Reference

| Module | Path | Notes |
|---|---|---|
| `auth` | `/auth/sync` | Syncs Clerk user to DB on sign-in |
| `users` | `/users/me`, `/users/:id/public` | Profile, KYC, roles |
| `cars` | `/cars/*` | Car listings CRUD, availability |
| `drivers` | `/drivers/*` | Driver profiles; auto-creates free subscription on profile creation |
| `bookings` | `/bookings/*` | Car rental bookings lifecycle |
| `driver-bookings` | `/driver-bookings/*` | Driver booking lifecycle |
| `subscriptions` | `/subscriptions/*` | iPay payment initiation + callback |
| `messages` | `/messages/*` | Chat messages per booking |
| `search` | `/search` | Unified car + driver search with geo |
| `reviews` | `/reviews/*` | Post-booking reviews |
| `disputes` | `/disputes/*` | Booking dispute management |
| `uploads` | `/uploads/*` | Cloudinary signed upload |
| `notifications` | internal | SMS (Africa's Talking) + email (Resend) |
| `webhooks` | `/webhooks/clerk` | Clerk user lifecycle events |
| `cron` | internal | Auto-completes expired bookings, sends renewal reminders |
| `admin` | `/admin/*` | Admin CRUD, analytics, KYC verification |
| `banners` | `/banners/active` | Public site banner endpoint |
| `taxi-drivers` | `/taxi-drivers/*` | Separate taxi driver registration |
| `favorites` | `/favorites/*` | Save/unsave car listings |
| `driver-favorites` | `/driver-favorites/*` | Save/unsave driver profiles |
| `geocoding` | `/geocoding/*` | Address autocomplete |

### Driver search visibility

Drivers only appear in search results if they have an **active free subscription**. When a driver creates their profile (`POST /drivers/profile`), a free subscription is auto-created. If a driver doesn't appear in search, check the `subscriptions` table for an active `free` tier record.

---

## 10. Web App Pages

### Public pages (`/[locale]/...`)

| Route | Description |
|---|---|
| `/` | Homepage — search bar, featured cars/drivers |
| `/search` | Search results with filters |
| `/cars/[id]` | Car detail page — photos, specs, booking panel |
| `/drivers/[id]` | Driver profile page |
| `/users/[id]` | Public user profile — their listings + driver profile link |
| `/stays` | Stays landing page (placeholder) |
| `/taxi-drivers` | Taxi driver listing |
| `/taxi-drivers/register` | Taxi driver registration form |
| `/about`, `/faq`, `/how-it-works`, `/safety` | Static info pages |
| `/drive-with-us`, `/list-your-car` | Acquisition landing pages |
| `/careers`, `/corporate`, `/privacy`, `/terms` | Standard pages |

### Authenticated app (`/[locale]/app/`)

The dashboard is a single page (`/app/page.tsx`) with section-based navigation:

| Section | Content |
|---|---|
| `overview` | Booking stats, quick actions |
| `bookings` | All bookings (as renter or owner/driver) |
| `cars` | Owner's car listings management |
| `messages` | Chat with booking counterparty |
| `subscription` | Subscription status + upgrade |
| `driver-profile` | Driver profile creation/editing |
| `settings` | Profile, language preference |
| `favorites` | Saved cars + drivers |

Sub-pages (shell redirects to `/app?section=X`):
- `/app/bookings`, `/app/cars`, `/app/messages`, `/app/subscription`, `/app/favorites`, `/app/driver-profile`, `/app/settings`

---

## 11. Admin App

**URL:** `https://admin.renting.rw`  
**Auth:** Email + password login — issues a JWT (`ADMIN_JWT_SECRET`)

### Features

- User management (list, search, verify KYC, deactivate)
- Car listing management (approve, pause, delete)
- Driver profile management (approve, suspend)
- Booking oversight (all bookings, dispute resolution)
- Subscription management (view, manually activate)
- Taxi driver approvals
- Site banner management (`POST /admin/banners`)
- Analytics dashboard (revenue, bookings, user growth charts)

---

## 12. Subscription & Pricing Logic

**File:** `apps/api/src/subscriptions/subscription-tier.util.ts`

### Car owner plans

| Tier | Price (RWF/month) | Max cars |
|---|---|---|
| Basic | 10,000 | 1 |
| Premium | 30,000 | 5 |
| Enterprise | 60,000 | Unlimited |

### Driver plan

| Plan | Price (RWF/month) |
|---|---|
| Driver | 10,000 |

### Tier mapping (DB vs product)

The DB stores `SubscriptionTier` enum values (`free`, `standard`, `premium`, `business`). Product names map as:
- `basic` → `standard`
- `premium` → `premium`
- `enterprise` → `business`

### Free subscription

A free tier subscription (`SubscriptionTier.free`) is automatically created when a driver profile is created. This is required for drivers to appear in search results.

---

## 13. Real-time / Chat

**Challenge:** Vercel serverless functions don't support persistent WebSocket connections.

**Current solution:** Client-side polling
- Chat messages: polled every **5 seconds** when the messages section is open
- Unread count: polled every **30 seconds**

**Socket.io is still wired up** (`apps/api/src/realtime/`) and will work if the API is deployed to a persistent server (Railway, Fly.io, etc.). Redis adapter is configured — provide `REDIS_URL` to enable multi-instance Socket.io.

**Email notifications for new messages** are not yet implemented (see Pending Features).

---

## 14. Deployment (Vercel)

### Deploy commands

```bash
# Deploy API
VERCEL_PROJECT_ID=prj_2dRXDS2lTxy8f6lscb2BjWr1VloW \
VERCEL_ORG_ID=team_b8rTjg12FWGxvpSS3Zyr84nt \
vercel deploy --prod

# Deploy Web
vercel deploy --prod --scope rentingrws-projects

# Deploy Admin (if needed)
# Set VERCEL_PROJECT_ID to the admin project ID first
```

### Build config

Both apps use Turborepo-filtered builds from the monorepo root:
- API: `cd ../.. && pnpm turbo run build --filter=@rentingi/api`
- Web: `cd ../.. && pnpm turbo run build --filter=@rentingi/web`

### Domain mapping

| Service | Domain |
|---|---|
| Web | `renting.rw` |
| API | `api.renting.rw` |
| Admin | `admin.renting.rw` |
| Clerk | `clerk.renting.rw` (CNAME to Clerk's frontend API) |

### Critical Vercel env vars (set in Vercel dashboard, not in repo)

```
PUBLIC_API_URL=https://api.renting.rw        ← REQUIRED for payments
IPAY_API_KEY=<key>                           ← REQUIRED for payments
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
ADMIN_JWT_SECRET=<secret>
CLOUDINARY_*=...
AT_API_KEY=...
RESEND_API_KEY=...
```

---

## 15. Known Issues & Tech Debt

### Active issues

| Issue | Status | Notes |
|---|---|---|
| TypeScript errors in API build | Pre-existing, non-blocking | `@prisma/client` import style diverges from generated types. The NestJS compiler (`nest build`) treats them as warnings. The app runs correctly at runtime. |
| Socket.io disabled on Vercel | Worked around | Replaced with polling. A persistent server would restore real-time. |
| `packages/ui` React type errors | Pre-existing | `@types/react` not found in UI package. Doesn't affect runtime. |

### Tech debt

- `apps/api/src/subscriptions/flutterwave.adapter.ts` — leftover from previous payment provider, no longer used but not deleted.
- MTN MoMo and Airtel Money adapters are stubbed in env schema but not implemented.
- `ADMIN_ALERT_EMAIL` is hardcoded as `renting.rw@gmail.com` fallback in `taxi-drivers.service.ts` — should be an env var.
- The `app.module.ts` Zod env schema still has some Flutterwave-era vars (`FLW_*`) mentioned in `.env.example` but not in the schema — minor cleanup needed.

---

## 16. Pending Features

### High priority

- **Email notifications for new chat messages** — no notification is sent when a booking counterparty sends a message. The `NotificationsService` (`apps/api/src/notifications/`) has email capability via Resend; just needs a trigger in `messages.service.ts`.
- **Admin: manually force-activate a subscription** — currently requires a raw `curl` to the callback endpoint.

### Medium priority

- **Message notifications (push/SMS)** — Africa's Talking SMS is wired in `NotificationsService` but not called on new messages.
- **Stays section** — the `/stays` page exists as a landing page but has no backend functionality.
- **Persistent WebSocket server** — moving the API to Railway/Fly.io would restore real-time chat without polling.

### Low priority / Nice to have

- **Driver KYC verification** — currently only car owners have a KYC flow. Drivers self-attest.
- **More from this driver** — the driver profile page has no "other bookings by this driver" section.
- **Review system UX** — reviews exist in DB and API but the post-booking review prompt in the dashboard is basic.
- **Cancellation policy enforcement** — free cancellation policy is displayed but not enforced in the booking lifecycle.
- **Progressive Web App** — offline/installable support.

---

## Quick Reference: Common Tasks

### Activate a stuck payment manually

```bash
# Find transactionId in DB: SELECT external_ref FROM subscriptions WHERE status = 'pending_payment';
curl "https://api.renting.rw/subscriptions/callback/ipay?transactionId=EXTERNAL_REF&status=200"
```

### Verify a user's KYC via admin panel

Admin → Users → Find user → "Verify KYC" button. Or via API:

```bash
curl -X POST https://api.renting.rw/admin/users/{userId}/verify \
  -H "Authorization: Bearer ADMIN_JWT"
```

### Add a site banner

Admin → Banners → Create (or via API `POST /admin/banners`). Only one banner is active at a time.

### Grant a driver free subscription manually (if auto-creation failed)

```sql
INSERT INTO subscriptions (id, user_id, tier, status, amount_rwf, payment_method, external_ref, starts_at, renews_at)
VALUES (gen_random_uuid(), 'USER_UUID', 'free', 'active', 0, 'momo', 'manual-free', NOW(), NOW() + INTERVAL '30 days');
```

### Change subscription prices

Edit `apps/api/src/subscriptions/subscription-tier.util.ts` — the `DRIVER_PLAN` and `PLAN_BY_TIER` constants. Deploy API.

---

*For questions about business logic or product decisions, refer to the git history (`git log --oneline`) and the commit messages — all major changes are documented there.*
