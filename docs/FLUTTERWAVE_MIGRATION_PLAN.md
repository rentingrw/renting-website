# Flutterwave Migration Plan

Migration from direct MTN MoMo + Airtel Money APIs to Flutterwave for subscription payments.

---

## 1. Current State

### What We Have

| Component | Implementation |
|-----------|----------------|
| **Payment initiation** | `SubscriptionsService.requestToPay()` → separate `requestMtnPayment()` and `requestAirtelPayment()` |
| **Webhooks** | `/subscriptions/webhook/mtn` and `/subscriptions/webhook/airtel` (raw body, signature verification) |
| **Env vars** | `MTN_MOMO_*` (4 vars), `AIRTEL_*` (3 vars), optional webhook secrets |
| **Frontend** | User selects MTN MoMo or Airtel Money, enters phone number |
| **Flow** | Initiate → User approves on phone → Webhook confirms → Subscription activated |

### Files to Modify

```
apps/api/
├── main.ts                          # Add Flutterwave webhook route
├── .env.example                     # Replace MTN/Airtel vars with Flutterwave
├── src/subscriptions/
│   ├── subscriptions.controller.ts  # Replace MTN/Airtel webhooks with single Flutterwave
│   ├── subscriptions.service.ts     # Replace requestToPay logic with Flutterwave charge
│   └── dto/
│       └── initiate-subscription.dto.ts  # Optional: simplify payment method (Flutterwave handles both)
```

---

## 2. Flutterwave Setup (Pre-Migration)

### 2.1 Create Flutterwave Account

1. Sign up at [dashboard.flutterwave.com](https://dashboard.flutterwave.com)
2. Complete KYC / business verification (required for Rwanda)
3. Enable **Rwanda Mobile Money** in your dashboard
4. Get API keys:
   - **Test**: `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY`, `FLW_ENCRYPTION_KEY`
   - **Live**: Same keys from Live mode

### 2.2 Configure Webhook

1. In Flutterwave Dashboard → **Settings** → **Webhooks**
2. Add webhook URL: `https://your-api-domain.com/subscriptions/webhook/flutterwave`
3. Select events: `charge.completed` (and optionally `charge.failed` for logging)
4. Copy the **Webhook secret** for signature verification

### 2.3 Environment Variables (New)

```env
# Flutterwave (replace MTN + Airtel vars)
FLW_PUBLIC_KEY="FLWPUBK_TEST-xxx"      # or FLWPUBK-xxx for live
FLW_SECRET_KEY="FLWSECK_TEST-xxx"      # or FLWSECK-xxx for live
FLW_ENCRYPTION_KEY="FLWSECK_TESTxxx"   # optional, for some flows
FLW_WEBHOOK_SECRET="your-webhook-secret"
```

**Remove after migration:**
- `MTN_MOMO_BASE_URL`, `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY`
- `AIRTEL_BASE_URL`, `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET`
- `MTN_MOMO_WEBHOOK_SECRET`, `AIRTEL_WEBHOOK_SECRET` (if used)

---

## 3. Implementation Steps

### Phase 1: Add Flutterwave SDK & Service Layer

**Step 1.1** – Install Flutterwave SDK

```bash
cd apps/api && pnpm add flutterwave-node-v3
```

**Step 1.2** – Create Flutterwave payment adapter

Create `apps/api/src/subscriptions/flutterwave.adapter.ts`:

```typescript
// Adapter to isolate Flutterwave logic; can be swapped later
export interface FlutterwaveChargeParams {
  phoneNumber: string;
  amount: number;
  currency: string;
  email: string;
  txRef: string;
  narration?: string;
}

export interface FlutterwaveChargeResult {
  status: string;
  message: string;
  meta?: { authorization?: { redirect?: string; mode?: string } };
}

export async function initiateFlutterwaveCharge(
  params: FlutterwaveChargeParams
): Promise<FlutterwaveChargeResult> {
  const Flutterwave = require('flutterwave-node-v3');
  const flw = new Flutterwave(
    process.env.FLW_PUBLIC_KEY,
    process.env.FLW_SECRET_KEY
  );
  const payload = {
    phone_number: params.phoneNumber,
    amount: params.amount,
    currency: params.currency,
    email: params.email,
    tx_ref: params.txRef,
    ...(params.narration && { narration: params.narration }),
  };
  return flw.MobileMoney.rwanda(payload);
}
```

**Step 1.3** – Create webhook payload types

```typescript
// apps/api/src/subscriptions/flutterwave-webhook.types.ts
export interface FlutterwaveWebhookPayload {
  event: string;
  data?: {
    id?: number;
    tx_ref?: string;
    flw_ref?: string;
    amount?: number;
    currency?: string;
    status?: string;
    payment_type?: string;
    // ...
  };
}
```

---

### Phase 2: Update SubscriptionsService

**Step 2.1** – Replace `requestToPay` implementation

- Remove `requestMtnPayment()` and `requestAirtelPayment()`
- In `requestToPay()`, call `initiateFlutterwaveCharge()` instead
- Flutterwave uses phone number only; it routes to MTN or Airtel based on the number prefix
- **Phone format**: Ensure `250XXXXXXXX` (Rwanda) – Flutterwave expects this format

**Step 2.2** – Normalize phone number

```typescript
// Helper: ensure +250 format for Rwanda
function normalizeRwandaPhone(mobileNumber: string): string {
  const digits = mobileNumber.replace(/\D/g, '');
  if (digits.startsWith('250')) return digits;
  if (digits.startsWith('0')) return '250' + digits.slice(1);
  return '250' + digits;
}
```

**Step 2.3** – Get user email for Flutterwave

Flutterwave requires `email`. Options:
- Use `profile.email` from your `User` (from Clerk sync)
- Or use a placeholder like `user-{userId}@rentingi.rw` if email not required for your flow

**Step 2.4** – Handle Flutterwave redirect (optional)

Flutterwave may return a `redirect` URL for the user to complete payment. Your current flow is “request → user approves on phone” without redirect. Flutterwave Rwanda mobile money can work in two ways:
- **Redirect**: User is sent to Flutterwave page to confirm
- **No redirect**: Some flows auto-prompt on phone

Check Flutterwave docs for Rwanda: if redirect is required, you may need to:
- Return `meta.authorization.redirect` to the frontend
- Frontend opens that URL in a new tab/window
- Webhook still confirms success

---

### Phase 3: Webhook Migration

**Step 3.1** – Add Flutterwave webhook route in `main.ts`

```typescript
app.use('/subscriptions/webhook/flutterwave', express.json()); // Flutterwave sends JSON
```

**Step 3.2** – Add controller method

```typescript
@Post('webhook/flutterwave')
handleFlutterwaveWebhook(@Req() request: Request, @Headers('verif-hash') verifHash?: string) {
  return this.subscriptionsService.handleFlutterwaveWebhook(request.body, verifHash);
}
```

**Step 3.3** – Implement `handleFlutterwaveWebhook`

- Verify signature using `verif-hash` header (Flutterwave’s webhook secret)
- Parse `event` and `data`
- For `charge.completed`: extract `tx_ref` (your `externalRef`), find subscription, activate
- Reuse existing `handleWebhookSuccess`-style logic (activate subscription, pause excess listings, notify user)

**Step 3.4** – Flutterwave webhook verification

```typescript
private verifyFlutterwaveWebhook(payload: unknown, verifHash?: string) {
  const secret = process.env.FLW_WEBHOOK_SECRET;
  if (!secret || verifHash !== secret) {
    throw new BadRequestException('Invalid webhook signature.');
  }
}
```

**Step 3.5** – Map Flutterwave payload to your flow

- `data.tx_ref` → your `subscription.externalRef`
- `data.status === 'successful'` → treat as success
- Reuse existing activation logic from `handleWebhookSuccess`

---

### Phase 4: Frontend & DTO Updates

**Step 4.1** – Simplify payment method (optional)

Flutterwave picks the network from the phone number. You can:
- **Option A**: Keep “MTN MoMo” and “Airtel Money” in the UI for clarity (backend ignores it, uses Flutterwave for both)
- **Option B**: Change to a single “Mobile Money” option

**Step 4.2** – Handle redirect (if required)

If Flutterwave returns a redirect URL:
- `initiate` and `upgrade` should return `{ redirectUrl?: string }`
- Frontend opens `redirectUrl` when present
- Show “Complete payment in the new window” message

**Step 4.3** – Phone number validation

- Enforce Rwanda format: `250XXXXXXXX` or `07XXXXXXXX`
- Validate length (e.g. 12 digits for Rwanda)

---

### Phase 5: Cleanup & Deprecation

**Step 5.1** – Remove old webhook routes

- Remove `app.use('/subscriptions/webhook/mtn', ...)` and `app.use('/subscriptions/webhook/airtel', ...)` from `main.ts`
- Remove `handleMtnWebhook` and `handleAirtelWebhook` from controller
- Remove `handleMtnWebhook` and `handleAirtelWebhook` from service

**Step 5.2** – Remove MTN/Airtel env vars from `.env.example` and docs

**Step 5.3** – Update any docs or runbooks that reference MTN/Airtel webhooks

---

## 4. Database & Schema

No schema changes needed. Keep:
- `Subscription.paymentMethod` (can store `momo` or `airtel_money` for display, or add `flutterwave`)
- `Subscription.externalRef` → maps to Flutterwave `tx_ref`

Optional: add `payment_provider` or similar if you want to support multiple providers later.

---

## 5. Testing Plan

### 5.1 Sandbox Testing

1. Use Flutterwave **Test** keys
2. Use test phone numbers from [Flutterwave test docs](https://developer.flutterwave.com/docs/testing#mobile-money)
3. Initiate subscription → confirm webhook received
4. Verify subscription status becomes `active`
5. Test upgrade flow (tier change)
6. Test failure cases (invalid phone, insufficient funds) if Flutterwave sandbox supports them

### 5.2 Webhook Testing

- Use a tunnel (ngrok, etc.) to expose local API
- Point Flutterwave webhook to `https://your-ngrok-url/subscriptions/webhook/flutterwave`
- Trigger test payment and confirm webhook is received and processed

### 5.3 Rollback Plan

- Keep MTN/Airtel code behind a feature flag or in a separate branch until Flutterwave is validated
- Or: implement a provider abstraction so you can switch `flutterwave` vs `direct` via env

---

## 6. Rollout Checklist

- [ ] Flutterwave account created and verified
- [ ] Rwanda Mobile Money enabled in dashboard
- [ ] Test and Live API keys obtained
- [ ] Webhook URL configured in Flutterwave dashboard
- [ ] `flutterwave-node-v3` installed
- [ ] `FlutterwaveAdapter` / `initiateFlutterwaveCharge` implemented
- [ ] `SubscriptionsService` updated to use Flutterwave
- [ ] `handleFlutterwaveWebhook` implemented and verified
- [ ] Old MTN/Airtel webhook routes removed
- [ ] Env vars updated in `.env.example` and deployment configs
- [ ] Sandbox tests passing
- [ ] Staging deployment tested with real (test) payments
- [ ] Production rollout
- [ ] Monitor first few live transactions
- [ ] Remove MTN/Airtel env vars from production

---

## 7. Timeline Estimate

| Phase | Effort | Notes |
|-------|--------|-------|
| Flutterwave setup | 1–2 days | Account, KYC, webhook config |
| Phase 1 (adapter) | 0.5 day | SDK + adapter module |
| Phase 2 (service) | 1 day | Replace requestToPay, phone normalization |
| Phase 3 (webhook) | 1 day | New webhook handler, verification |
| Phase 4 (frontend) | 0.5 day | Redirect handling if needed |
| Phase 5 (cleanup) | 0.5 day | Remove old code, update env |
| Testing | 1–2 days | Sandbox + staging |
| **Total** | **~5–7 days** | |

---

## 8. Reference Links

- [Flutterwave Rwanda Mobile Money](https://developer.flutterwave.com/v3.0/docs/rwanda)
- [Flutterwave Webhooks](https://developer.flutterwave.com/docs/events)
- [flutterwave-node-v3](https://www.npmjs.com/package/flutterwave-node-v3)
- [Flutterwave Testing](https://developer.flutterwave.com/docs/testing#mobile-money)
