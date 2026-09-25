# Rentingi Monorepo

Rentingi is a Turborepo-based monorepo for a Rwanda-focused mobility and rental platform. It contains:
- A NestJS API
- A consumer-facing Next.js app
- An admin Next.js app
- Shared packages for UI components, domain types, and Prisma database access

## Monorepo Structure

```text
apps/
  api/      # NestJS backend
  web/      # Consumer Next.js frontend
  admin/    # Admin Next.js frontend
packages/
  db/       # Prisma schema, client, and seeds
  types/    # Shared TypeScript enums/interfaces/events
  ui/       # Shared shadcn/ui-based component library
```

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start development:
   ```bash
   pnpm dev
   ```

## Environment Variables

### Database & Cache
- `DATABASE_URL`
- `REDIS_URL`

### Clerk (Authentication)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — production must be `pk_live_...`
- `CLERK_SECRET_KEY` — production must be `sk_live_...`
- `CLERK_WEBHOOK_SECRET` — signing secret from Clerk Dashboard → Webhooks
  - Endpoint: `POST {API_URL}/webhooks/clerk` (production: `https://api.renting.rw/webhooks/clerk`)
  - Events: `user.created`, `user.updated`
  - `pk_test_` keys show Clerk's Development mode badge; live keys remove it. The web app also sets `unsafe_disableDevelopmentModeWarnings`.

### Payments
- `IPAY_API_KEY` — iPay/MoPay (live payments)

### Cloudinary
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Africa's Talking
- `AT_API_KEY`
- `AT_USERNAME`

### Resend
- `RESEND_API_KEY`

### Maps & Geocoding
Uses free OpenStreetMap (Nominatim, Photon) - no API keys required.

### MTN MoMo
- `MTN_MOMO_BASE_URL`
- `MTN_MOMO_SUBSCRIPTION_KEY`
- `MTN_MOMO_API_USER`
- `MTN_MOMO_API_KEY`

### Airtel Money
- `AIRTEL_BASE_URL`
- `AIRTEL_CLIENT_ID`
- `AIRTEL_CLIENT_SECRET`

### App URLs
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_API_URL`

## Development Workflow

### Add a New Package
1. Create a folder under `packages/your-package`
2. Add `package.json`, `tsconfig.json`, and exports
3. Reference it from apps with `workspace:*`
4. Add/update path aliases in root `tsconfig.json` if needed

### Run Individual Apps
- API: `pnpm --filter @rentingi/api dev`
- Web: `pnpm --filter @rentingi/web dev`
- Admin: `pnpm --filter @rentingi/admin dev`

## Deployment Notes

- `apps/web`: Deploy to Vercel
- `apps/admin`: Deploy to Vercel
- `apps/api`: Deploy to Railway
- PostgreSQL/PostGIS: Neon
# renting_rw
