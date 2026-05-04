# Slush Multi-Chain Wallet — Scope of Work

**Project:** Multi-chain wallet generation layer for Slush.
**Parties:** CoinVoyage × Sui (via Slush wallet team).
**Status:** Prototype delivered (2026-05-02, branch `wallet`). Awaiting Slush
engineering scope sign-off before commercial commencement.
**Companion docs:** `wallet-implementation.md` (engineering reference for the
delivered prototype).

---

## 1. Context

Slush is currently a Sui-native wallet. That single constraint is the
blocker on Slush integrating CoinVoyage's cross-chain swap product —
cross-chain swaps are meaningless if the user only has a Sui address. Until
Slush users have addresses on the other chains CoinVoyage routes between, a
SUI → Polygon USDT swap has nowhere to land.

This SOW describes the layer CoinVoyage will deliver to Slush to remove
that blocker, and the integration that follows.

---

## 2. The deliverable

A **multi-chain wallet generation layer**, integrated into Slush's existing
wallet UX, that — from a single user action (create wallet / import seed) —
provisions deterministic addresses across the chains CoinVoyage settles on:

> Bitcoin · Solana · Ethereum · Arbitrum · Base · Optimism · Polygon · BNB Chain

All derived from the user's Slush passphrase. Sui remains the primary
identity (Slush's home chain) and is unchanged.

Mechanism:
- **EVM chains** — contract-based factory pattern, mirroring Alchemy's
  reference library approach (one secp256k1 derivation, one address shared
  across all EVM L1/L2s).
- **Bitcoin** — BIP84 Native SegWit derivation from the same seed
  (`m/84'/0'/0'/0/0`).
- **Solana** — SLIP-0010 Ed25519 derivation (`m/44'/501'/0'/0'`).

This makes every Slush user a CoinVoyage user the moment they onboard, and
every Slush-originated swap routable through CoinVoyage's cross-chain
infrastructure.

---

## 3. What CoinVoyage has already built (prototype)

Branch `wallet` in this repository, accessible at `/wallet`. Demonstrates
exactly what Slush would integrate, inside a Slush-styled standalone
container:

- **Onboarding flow** — BIP39 12-word generate / import, blur-to-reveal,
  paste-to-import, persisted locally.
- **Manage Accounts page** — derives all 9 chain addresses live from one
  passphrase. **The single-screen proof-of-concept for the partnership.**
- **Live CoinVoyage quotes** — verified live for ETH→USDC.base,
  USDC.eth→USDC.arb, USDC.base→SOL, SUI→USDC.base. Shows real fees, real
  routes, real price impact.
- **Real EVM-leg execution** (flag-gated) — Wagmi connector backed by the
  derived secp256k1 key; `useAccount({chainType:EVM})` returns the derived
  address; `usePrepareTransaction(EVM).execute(...)` broadcasts via the
  same `/api/swap` data + `/api/sale` polling flow Vaporswap already uses.
- **Slush-mimic UX** — TopBar / 2×2 action grid (Swap / Send / Buy-Sell /
  Request) / 6-tab bottom nav (Home · Earn · Assets · Apps · Activity ·
  Profile) / Slush brand assets / chain-filter pills on the asset list.
- **Send flow** — chain-aware recipient validation (Sui / BTC bech32 +
  Taproot / SOL base58 / EVM `0x`).
- **Swap flow** — token+chain pickers, percentage chips, flip-direction,
  Review sheet with route preview, progress states, success screen.

Engineering reference: `wallet-implementation.md` (this folder).

---

## 4. What's in scope for the production build

The remaining work to convert the prototype into a Slush-production layer:

### 4.1 Non-EVM connectors
The EVM connector is the template. Three more to build, same pattern,
different signing API per curve / library:

| Connector | Library | Estimated effort |
|---|---|---|
| BigMi BTC connector | `@bigmi/client` | ~1 day |
| Solana wallet adapter | `@solana/wallet-adapter-base` | ~0.5 day |
| Mysten wallet-standard wallet | `@mysten/wallet-standard` | ~1.5 days |

Each wraps the curve-appropriate signing (P2WPKH / Ed25519 / Sui transaction
intent) around our derived key, registers with the corresponding adapter
library so all of CoinVoyage's existing hooks (`useAccount`,
`usePrepareTransaction`, `useSuiTransaction`, etc.) work without
modification.

### 4.2 Production-grade seed handling
- Encrypted-at-rest storage for the seed (password-derived AES, WebAuthn-
  wrapped key, or platform secure-storage equivalent — Slush eng to specify).
- Auto-lock + unlock UX matching Slush's existing pattern.
- Recovery flow.
- Optional multi-account derivation index (currently fixed to index 0).

### 4.3 Per-chain balance fetching
Replace the prototype's pinned demo balances with live RPC / indexer
integration per chain. CoinVoyage's existing `/api/wallet-tokens` endpoint
is the reference for the EVM family.

### 4.4 Transaction safety layer
- Transaction simulation pre-broadcast (Tenderly, Blockaid, similar)
- Token approval review for ERC-20 sources
- Slippage protection beyond CV's quote-time slippage

### 4.5 Slush integration plumbing
- Surfacing the multi-chain addresses in Slush's existing Manage Accounts UX.
- Routing Slush's existing Send / Receive / Swap actions through the
  derived-key signing layer.
- Maintaining backward compatibility with Slush users who only have Sui
  addresses today (don't break them when this rolls out).

### 4.6 Settlement routing
- Wire Slush-originated cross-chain swaps to settle through **sUSD** as the
  intermediate asset where it produces a better route. This is the
  strategic payoff for Sui — turning the wallet itself into another
  float-generating surface for sUSD.

### 4.7 Slush card rail (load / off-load)
Slush is launching a Visa-rail debit card alongside the multi-chain wallet
(reference: Cypher card flow). CoinVoyage's swap engine is the natural
funding/defunding layer — any token on any of the 9 supported chains routes
through the same infrastructure into (or out of) the card's settlement
asset, with no second wallet, no manual bridging, and no off-ramp partner
re-onboarding for the user.

- **Load** — user picks any token on any chain → CV routes to the card's
  funding asset (USDC on Base by default; sUSD where available, since
  sUSD-routed loads earn the same float as §4.6) → card balance credited.
  Single "Load" action in the wallet, single quote screen, single
  confirmation. The cross-chain leg is invisible to the user.
- **Off-load / Withdraw** — reverse direction: user picks how much to pull
  off the card, picks a destination token+chain, CV routes the inverse path.
  Also covers the case where a user wants to off-ramp a card balance to a
  non-USDC asset (e.g. back to SUI, BTC, ETH).
- **Settlement asset coupling** — where the card issuer accepts sUSD as the
  funding asset, the same sUSD float logic in §4.6 applies. Every card load
  becomes another sUSD volume surface for Sui. Where it doesn't, the
  default settlement is USDC.base (CV's lowest-fee canonical USDC route).
- **Failure / fee handling** — load reverts to the user's source token if
  the card-side credit fails (CV's existing refund path). Off-load applies
  the same 0.3% CV floor + Slush's chosen card fee on top. No new pricing
  category — card volume rolls into the §8 fee schedule.
- **Surface** — Slush card surface in the wallet (`/wallet/card` in the
  prototype): card visual, balance, recent card transactions, two primary
  actions (Load / Withdraw). Both flows reuse the swap-engine UI primitives
  (token picker, quote sheet, route preview) so review stays minimal.

This pulls card volume — which is otherwise a separate flow that would
fragment the wallet UX — into the same swap-routing economics: Slush owns
the card brand and pricing, CoinVoyage's 0.3% floor applies to every load
and off-load, and sUSD is the preferred settlement leg wherever it works.

---

## 5. Out of scope for this engagement

Listed explicitly to keep the engagement focused:

- Multi-sig / MPC threshold signing (a v2 feature; pricing TBD)
- Card issuance / KYC / Visa-rail integration on the Slush side (Slush
  owns the card product; CoinVoyage delivers only the load/off-load
  swap-routing layer described in §4.7)
- Receive QR generation per chain (~1 day of UI work; can be added if Slush
  asks; not blocking the primary integration)
- Earn / Strategies surface (Slush's existing product; we plug in)
- Apps tab / dApp browser
- Slush mobile app integration (this engagement is browser-extension first,
  unless Slush specifies otherwise)

---

## 6. Phasing & timeline

### Phase 0 — Scope sign-off (Days 0–30)
- MOU signed.
- This document and `wallet-implementation.md` reviewed by Slush
  engineering.
- $25k retroactive compensation paid (sUSD-to-checking offramp rail —
  separate workstream, see commercial terms).
- Vendor-to-vendor flow scope locked with spec shipped to engineering
  (CoinVoyage-funded).
- Slush multi-chain wallet scope reviewed and signed off (this document).
- **No Slush funding required until scope approval.**

### Phase 1 — Funded build kickoff (Days 31–60)
- Scope sign-off triggers $10k/mo retainer; 120-day build window opens.
- Production seed handling design approved by Slush eng.
- Non-EVM connectors built in parallel:
  - Week 1: BigMi BTC connector
  - Week 2: Solana wallet adapter
  - Week 3-4: Mysten wallet-standard wallet
- All three landed and exercised through CoinVoyage hooks end-to-end.

### Phase 2 — Production hardening (Days 61–90)
- Encrypted-at-rest seed storage.
- Live per-chain balance fetching.
- Transaction simulation layer.
- Auto-lock + recovery UX.
- Retainer month 2.

### Phase 3 — Slush integration & ship (Days 91–180)
- Plumbing into Slush's existing Send / Receive / Swap surfaces.
- sUSD settlement routing wired in.
- Backward compatibility verified for legacy (Sui-only) Slush users.
- Final QA with Slush eng.
- $50k completion bonus paid on signed-off delivery.
- Maintenance / carry model locked.
- 0.3% routing fee floor and 0.8% recommended total user-facing fee live.
- 5-year exclusive routing agreement in force.

Build completion stays inside the **120-day window from initial funding**.

---

## 7. Acceptance criteria

The build is accepted when, against a clean Slush user account:

1. Creating a new wallet via the standard Slush onboarding produces
   addresses on Sui + BTC + SOL + Ethereum + Arbitrum + Base + Optimism +
   Polygon + BSC, all visible from a single Manage Accounts surface.
2. Importing an existing 12 / 24-word phrase produces deterministic
   addresses matching the BIP39 / BIP44 / BIP84 / SLIP-0010 standards
   (validated against external test vectors).
3. CoinVoyage cross-chain swaps execute end-to-end from any source chain
   in the supported set, signed by the derived key on the user's behalf,
   landing on the auto-derived destination address.
4. No regression for Sui-only users: existing Slush flows continue to
   work without behavior change.
5. Seed material is encrypted at rest, never persisted in plaintext, and
   never logged.
6. Operational runbook delivered for the per-address infrastructure carry
   (RPC / indexer / key-server topology, monitoring, on-call contacts).

---

## 8. Commercial structure

Designed scope-first, low-risk for Sui up front, monetized from day one.

| Workstream | Structure | Amount |
|---|---|---|
| Retroactive sUSD-to-checking offramp | One-time cash, on MOU signature | $25,000 |
| Vendor-to-vendor payout flow | CoinVoyage-funded build; no charge to Sui | — |
| Volume incentive | Monthly rebate on sUSD settlement volume | 5–7 bps, tiered (suggested) |
| **Slush build — retainer** | $10k/mo, 3-mo commitment; scope-first (no charge if scope rejected) | **$30,000** ($10k × 3) |
| **Slush build — completion bonus** | Paid on signed-off delivery; inside 120-day window from funding | **$50,000** |
| Slush routing — exclusivity | 5-year minimum exclusive for all swaps + cross-chain routing in Slush | Non-cash term |
| **CoinVoyage cut — minimum floor** | Hard floor on every Slush cross-chain swap, regardless of top-line fee | **0.3%** (minimum, fixed) |
| Cross-chain swap fee — recommended total | Market-standard total user-facing fee; Slush may set higher | 0.8% (recommended) |
| Slush cut at recommended total | Slush's fee layer on top of the 0.3% CoinVoyage floor; Slush may lift this | 0.5% (default; Slush may raise) |
| Slush maintenance & carry | Either monthly fee from Sui OR covered by Slush swap revenue; priced during build | TBD — locked before build closes |

**Total funded build cost to Sui:** $80,000 ($30k retainer + $50k completion).

---

## 9. Break-even math for Slush

At the recommended 0.8% total cross-chain fee (Slush's 0.5% cut, after
CoinVoyage's 0.3% minimum floor):

> $80,000 ÷ 0.005 = **$16,000,000** in cross-chain swap volume to break even.

That's roughly one active month for a mid-sized wallet, a couple of months
for a smaller one. Every cross-chain swap past that threshold is net
positive for Slush from day one. If Slush sets the total fee above 0.8%,
payback compresses further and every dollar of upside accrues to Slush —
the 0.3% CoinVoyage floor is fixed.

---

## 10. 5-year revenue projection for Slush

Two scenarios, both modeled at Slush's 0.5% cut (industry-standard 0.8%
total cross-chain fee, minus CoinVoyage's 0.3% minimum). Year 1 assumes
Month 1 covers the $80k build payback; the remaining 11 months generate
$880k in net revenue to Slush.

| Year | Flat scenario ($16M/mo cross-chain volume) | 25% YoY growth scenario |
|---|---|---|
| Year 1 (net, after $80k payback) | $880,000 | $880,000 |
| Year 2 | $960,000 | $1,200,000 |
| Year 3 | $960,000 | $1,500,000 |
| Year 4 | $960,000 | $1,875,000 |
| Year 5 | $960,000 | $2,344,000 |
| **5-year net total to Slush** | **$4.72M** | **$7.80M** |

Underlying volume: flat = $944M of Slush cross-chain swap volume over
5 years; growth = $1.58B. CoinVoyage earns its 0.3% minimum cut on the same
volume (~$2.83M flat / ~$4.73M growth over 5 years) regardless of Slush's
top-line pricing — shared volume exposure, independent pricing upside for
Slush.

---

## 11. Risk register

| Risk | Mitigation |
|---|---|
| Pair coverage gap (e.g. SUI → BTC has no direct route on CV today) | Identified during prototype. Routes through SUI → USDC.eth → BTC. CoinVoyage commits to adding direct routes for the top Slush pairs as part of phase 3. |
| Backward-compatibility break for Sui-only users | Migration plan + canary release; Sui-only path remains unchanged until user opts into multi-chain provisioning. |
| Operational carry on per-address infra | Two paths agreed before build closes: monthly maintenance fee from Sui, or carry covered by swap revenue. Pricing locked inside the 120-day window. |
| Seed-handling regression | Independent security review pre-launch; bug bounty open for 60 days post-ship. |
| Real execution edge cases (chain reorgs, stuck txs, fee spikes) | Same operational handling as Vaporswap's existing flow; runbook delivered as part of acceptance. |

---

## 12. Open items requiring Slush input

These need answers from the Slush team before sign-off:

1. **Browser extension first, mobile second?** The prototype is web /
   extension shaped. Confirm primary surface; mobile timeline will be a
   follow-on engagement if needed.
2. **Production seed-storage scheme** — password-derived AES, WebAuthn,
   platform-native, or other? Slush eng's call.
3. **Top pairs to optimize for** — to inform the route-coverage roadmap
   and where CoinVoyage adds direct routes vs. multi-hop.
4. **Maintenance & carry model** — monthly fee or covered by swap revenue?
   Locked before build closes; Slush preference helps shape the proposal.
5. **Multi-sig / MPC roadmap** — out of scope for this engagement; if
   Slush wants this in a v2 SOW, flag now so the architecture leaves room.
6. **Card funding asset** — confirm Slush's card issuer settles in USDC.base
   (CoinVoyage's default) or sUSD. Either is supported by §4.7; the answer
   only affects which settlement leg CV optimizes for first. sUSD is
   preferred because it compounds the §4.6 float story.
7. **Card-side fee tier** — Slush's card load/off-load fee on top of
   CoinVoyage's 0.3% floor. Not blocking for build; locked before launch
   marketing.

---

## 13. Approvals

| Party | Name | Role | Signature | Date |
|---|---|---|---|---|
| CoinVoyage | _______________ | _______________ | _______________ | _______________ |
| Sui Foundation / Slush | _______________ | _______________ | _______________ | _______________ |

---

*Document prepared 2026-05-02. References prototype on branch `wallet`.
Companion engineering doc: `wallet-implementation.md`.*
