# Issue 6 — Card payments fail instantly on click; `/payment-methods` 422s for every card-enabled order

**Severity:** Critical — revenue-blocking
**Scope:** Global. Reproduced across multiple orgs / API keys. Happens **instantly** on click, not after expiry.
**Component:** Backend validator on `/v2/pay-orders/{id}/payment-methods` + `@coin-voyage/paykit` SDK / hosted checkout

## Symptom
User clicks **Pay with Card** on `pay.coinvoyage.io/pay/{id}` → immediately sees:
> Unavailable — Stripe onramp session is unavailable for this pay order

## Root cause
The hosted checkout calls `GET /v2/pay-orders/{id}/payment-methods` and treats any non-200 as "card unavailable." The endpoint returns 422 for **every** card-enabled order from the moment it's created:

```json
{
  "error": "Invalid Request",
  "message": "Invalid pay order status",
  "code": 422,
  "details": {
    "validation_error": "Payment methods can only be retrieved for pending or awaiting payment orders"
  }
}
```

The validator's error message is misleading. Failing orders verifiably have `status: AWAITING_PAYMENT` in `GET /v2/pay-orders/{id}`. The actual rule appears to be:

> **Only for orders in `awaiting_payment` AND with no committed payment step yet.**

Card-enabled orders (`settings.card_payments: true`) get a `stripe_onramp` step initialized automatically as part of creation, so they fail this check from t=0.

The expiry timeline the DB row showed (`updated_at` = `expires_at` → `EXPIRED`) was a separate, later event — not the cause. The first 422s arrive within seconds of order creation.

## What's already on the order
The Stripe session everything needs is already attached to the order under `payment.steps[]`:
```json
{
  "rail": "FIAT",
  "kind": "stripe_onramp",
  "data": {
    "session_id": "cos_...",
    "client_secret": "cos_..._secret_...",
    "stripe_publishable_key": "pk_live_...",
    "status": "initialized",
    "destination_amount": "...",
    "destination_currency": "usdc",
    "destination_network": "polygon",
    "wallet_address": "..."
  }
}
```
The hosted checkout already has everything needed to launch the Stripe Crypto Onramp — but it never reads it from there.

## Fix

**SDK / hosted checkout (primary):**
1. When the order has a `stripe_onramp` step in `payment.steps[]` with usable `data`, render the card option directly from it. Do **not** require `/payment-methods` to succeed.
2. Only call `/payment-methods` when no method has been committed.
3. Treat `/payment-methods` 422 as informational, not as "card unavailable."

**Backend (either is fine, both better):**
- Fix the validator's error message to actually describe the rule (e.g. `"validation_error": "Payment methods cannot be listed once a payment step has been committed"`), so the SDK can branch on the real reason.
- OR return 200 with the committed method (or `[]`) for orders that already have a committed onramp step, so legacy SDKs stop showing "Unavailable."

## Repro
1. Create a SALE order with `settings.card_payments: true`.
2. Open `https://pay.coinvoyage.io/pay/{id}`.
3. Immediately click **Pay with Card**.
4. Network tab: `GET /v2/pay-orders/{id}/payment-methods` → 422 within a few hundred ms.
5. UI: "Stripe onramp session is unavailable for this pay order." Happens **instantly**.

`GET /v2/pay-orders/{id}` at the same moment confirms `status: AWAITING_PAYMENT` and a valid `stripe_onramp` step.

## Confirmed failing orders
- `cmoeiut050i5k01p5jvbgvvsj`
- `cmoehenuq0hh401p5gczeu9lx`

## Acceptance criteria
- [ ] Card-enabled order: user clicks Pay with Card → Stripe onramp loads, no "Unavailable."
- [ ] Card flow no longer depends on `/payment-methods` succeeding.
- [ ] Either the validator's message accurately describes the rule, or the endpoint stops 422'ing on this case.
- [ ] E2E regression test: create card order → immediately click Pay with Card → Stripe loads.

## Note on the earlier "expiry" hypothesis
We initially thought the issue was that the order's 5-minute expiry window was too short for card flow. The DB showed an EXPIRED order at the time of one specific 422. That turned out to be coincidence — the failure happens **instantly** on click, well before any expiry. Expiry duration is a separate (Low-priority) discussion if at all.
