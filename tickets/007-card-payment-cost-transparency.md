# Issue 7 — Card payment total (~6.7%) dominated by Stripe onramp markup; verify user sees final charge

**Severity:** Medium (UX / trust)
**Component:** Hosted card-payment UI / `@coin-voyage/paykit`
**Status:** Needs investigation

## Observation

For a $41.30 USDT0 order paid with card (order `cmoeiut050i5k01p5jvbgvvsj`):

| Layer | Amount |
|---|---|
| Stripe USD source total (card charge) | **$43.18** |
| → Stripe network fee | $0.01 |
| → Stripe transaction fee | **$1.67** (~4% onramp markup) |
| → Stripe delivers to deposit | 41.504873 USDC on Polygon |
| Protocol fee | $0.604 |
| Custom fee (`custom_fee_bps: 100`) | $0.403 |
| Uniswap USDC → USDT0 | ~$0 (stable pair) |
| Polygon gas | $0.0065 |
| **User receives** | **40.27 USDT0** |

User pays **$43.18** to deliver **$40.27** to the merchant — effective fee **~6.7%**.

## Concern

Stripe markup ($1.68) is the dominant cost. We need to confirm:
- The user sees `$43.18` (final card charge) **before** clicking pay.
- The breakdown distinguishes platform fees (protocol + custom = $1.01) from Stripe onramp fees ($1.68).
- Merchants are aware that card payments are ~3–4% more expensive than crypto for the same delivered amount.

## Acceptance criteria
- [ ] Audit hosted checkout (`pay.coinvoyage.io/pay/...`) for card-flow disclosure.
- [ ] If the user only sees the order amount and not the card total, surface the Stripe quote's `source_total_amount` prominently.
- [ ] Document expected fee structure for merchants enabling `card_payments: true`.
