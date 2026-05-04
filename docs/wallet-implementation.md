# Slush Omnichain Wallet — Implementation Reference

Status as of 2026-05-02. Prototype branch: `wallet`.

This document is the engineering reference for the prototype that demonstrates
what CoinVoyage proposes to deliver as the **multi-chain wallet generation
layer for Slush** (see `wallet-scope-of-work.md`). It explains what exists,
how it's wired together, and how to extend it to production.

---

## 1. What's built

| Surface | Status |
|---|---|
| Onboarding (create / import) — BIP39 12-word phrase, blur-to-reveal, paste-to-import, persisted to `localStorage` | ✅ |
| Home dashboard — aggregate USD across 9 chains, 2×2 action grid, Earn teaser, asset list | ✅ |
| Manage Accounts — addresses derived for SUI / BTC / SOL / ETH / Arb / Base / OP / Polygon / BSC from one passphrase | ✅ |
| Swap — token+chain pickers, percentage chips, flip-direction, **live CoinVoyage quotes** with mock fallback, simulated cross-chain progress states | ✅ |
| Send — chain-aware recipient validation (Sui / BTC bech32 + Taproot / SOL base58 / EVM 0x), broadcast simulation | ✅ |
| Assets tab — full token list with chain-filter pills | ✅ |
| Profile — Manage Accounts entry, derived address shown in header, Settings stubs | ✅ |
| Wagmi connector backed by derived EVM key — registers with `useAccount({chainType: EVM})` | ✅ |
| Real EVM-leg execution via `usePrepareTransaction` + CoinVoyage `/api/swap` data + `/api/sale` polling | ✅ behind feature flag |
| Earn / Apps / Activity / Buy-Sell / Request | placeholder pages |
| BigMi connector for BTC | not built |
| Solana wallet adapter | not built |
| Mysten wallet-standard wallet | not built |
| Real per-chain balance fetching | not built (demo balances pinned) |
| Receive QR per chain | not built |
| Card load / off-load (Cypher-style) | not built |

---

## 2. Architecture overview

```
                              ┌─────────────────────────────┐
                              │ app/providers.tsx           │
                              │  WalletProvider             │
                              │   ├─ MetaMask / Coinbase /  │
                              │   │  WalletConnect          │
                              │   └─ slushDerived (EVM)  ◀──┼──┐
                              │  PayKitProvider             │  │
                              └─────────────────────────────┘  │
                                                               │
   ┌───────────────────────────┐      auto-connect on mount    │
   │ /wallet/* layout          │ ─────────────────────────────▶│
   │  ├─ AutoConnect           │                               │
   │  ├─ TopBar                │                               │
   │  ├─ <main>{children}</> ──┼─ home, swap, send, profile,   │
   │  └─ BottomNav             │   onboarding, …              │
   └───────────────────────────┘                               │
                                                               │
   ┌───────────────────────────────────────────────────────────┘
   │
   │ derives via lib/wallet/core
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ lib/wallet/                                                      │
│  core/                  seed.ts → derive.ts (per-chain HD)       │
│  store.ts               localStorage seed I/O                    │
│  swap/                  tokens.ts, router.ts (mock),             │
│                         api.ts (live CV quotes), execute.ts      │
│  send/validate.ts       per-chain address validators             │
│  connectors/evm.ts      Wagmi connector (template for non-EVM)   │
└──────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                       ┌──────────────────────────────────┐
                       │ /api/swap (proxies CV)           │
                       │   action=quote → /v2/swap/quote  │
                       │   action=data  → /v2/swap/data   │
                       │ /api/sale  (poll order status)   │
                       └──────────────────────────────────┘
```

---

## 3. Repo layout

```
app/wallet/                       # All wallet UI routes (Slush-mimic)
├── layout.tsx                    # .slush-scope wrapper, AutoConnect, TopBar, BottomNav
├── wallet.css                    # Light-mode tokens scoped to .slush-scope
├── page.tsx                      # Home: balance card, action grid, Earn, AssetList
├── assets/page.tsx
├── swap/
│   ├── page.tsx                  # Outer gates on useWalletReady; SwapPageInner uses wagmi/CV hooks
│   ├── use-real-swap.tsx         # Real-execution hook (data → sign → poll)
│   └── components/token-picker.tsx
├── send/page.tsx                 # Per-chain recipient validation
├── profile/
│   ├── page.tsx                  # Header derives Sui address from persisted seed
│   └── accounts/page.tsx         # The pitch closer — derives all 9 addresses live
├── onboarding/
│   ├── page.tsx                  # Create or Import
│   ├── create/page.tsx           # Generate + reveal-to-show + confirm
│   └── import/page.tsx           # Paste + validate + persist
├── earn,apps,activity,buy,request/page.tsx   # ComingSoon placeholders
└── components/
    ├── auto-connect.tsx          # Two-stage to avoid SSR WagmiProvider error
    ├── top-bar.tsx               # Avatar + balance + chain badge
    ├── bottom-nav.tsx            # 6 tabs (hides on /onboarding)
    ├── action-grid.tsx           # 2×2 Swap/Send/Buy-Sell/Request
    ├── asset-list.tsx            # Tokens with chain badge underlay + chain pills
    ├── chain-glyph.tsx           # Per-chain colored circle with letter
    ├── copy-button.tsx
    └── coming-soon.tsx

lib/wallet/
├── core/
│   ├── seed.ts                   # @scure/bip39: newMnemonic, validateMnemonic, seedFromMnemonic
│   ├── slip10-ed25519.ts         # SLIP-0010 ed25519 derivation (for SOL)
│   ├── derive.ts                 # deriveAll(mnemonic) → DerivedAddress[] across 9 chains
│   ├── types.ts                  # CHAINS, ChainKey, ChainKind, DerivedAddress
│   └── index.ts                  # DEMO_MNEMONIC + re-exports
├── store.ts                      # localStorage seed I/O
├── send/validate.ts              # Per-chain recipient validators
├── connectors/evm.ts             # Wagmi connector backed by HD-derived secp256k1 key
└── swap/
    ├── tokens.ts                 # Token catalog with cvChainId + contract addresses
    ├── router.ts                 # quoteSwap(fromId, toId, amountIn) → mock SwapQuote
    ├── api.ts                    # fetchLiveQuote — POST /api/swap action=quote
    └── execute.ts                # buildSwapIntent, fetchSwapData, fetchOrderStatus, status mapping

public/wallet/brand/              # Symbol / Symbol+Circle / Wordmark SVGs + 3D blue PNG

docs/                             # This folder
├── wallet-implementation.md      # You are here
└── wallet-scope-of-work.md
```

---

## 4. Key derivation

One BIP39 mnemonic → curve-appropriate HD derivations per chain.

| Chain | Curve | Path | Encoding |
|---|---|---|---|
| Sui | Ed25519 | `m/44'/784'/0'/0'/0'` | blake2b(0x00 ‖ pubkey) → `0x` hex (via `@mysten/sui` `Ed25519Keypair.deriveKeypair`) |
| Bitcoin | secp256k1 (BIP32) | `m/84'/0'/0'/0/0` | bech32 P2WPKH `bc1q…` (via `@scure/btc-signer`) |
| Solana | Ed25519 (SLIP-0010) | `m/44'/501'/0'/0'` | base58(pubkey) (custom SLIP-0010 + `@noble/curves/ed25519` + `@scure/base`) |
| Ethereum / Arbitrum / Base / Optimism / Polygon / BSC | secp256k1 | `m/44'/60'/0'/0/0` | keccak256(pubkey)[12:] → `0x` (via viem `mnemonicToAccount`) — **same address on all 6 EVM chains** |

The 6 EVM chains share one secp256k1 derivation (different `chain_id`, same address).
The 3 non-EVM chains each have curve-native derivations producing distinct
addresses. This is the "one passphrase, addresses everywhere" claim made
concrete — verified against the BIP39 test vector mnemonic.

**Why two ed25519 paths instead of one helper?**
`@mysten/sui`'s `Ed25519Keypair.deriveKeypair` enforces Sui's 5-segment hardened
path format. Solana's path is 4 segments and `@solana/web3.js` doesn't ship
HD derivation. So we ship a tiny SLIP-0010 helper (`slip10-ed25519.ts`,
~40 lines) used for Solana and use `@mysten/sui` for Sui.

---

## 5. Wallet UI shell

The wallet runs under `.slush-scope` (defined in `app/wallet/wallet.css`),
which overrides `--background`/`--foreground` to Slush's light-mode palette
without disturbing the dark vapor-swap app at `/swap` and `/dashboard`.

Tailwind v4 tokens for Slush brand colors live in `app/globals.css` `@theme`
block (`--color-slush-blue`, `--color-slush-bg`, etc.) so utilities like
`bg-slush-blue` work everywhere.

**TopBar** auto-hides on `/wallet/onboarding/*` so onboarding screens have
their own header. **BottomNav** does the same.

---

## 6. Live quote integration

`lib/wallet/swap/api.ts` — `fetchLiveQuote(from, to, amountIn, apiKey)` POSTs
`/api/swap` with action `"quote"` and the CV `intent` shape:

```ts
{
  amount: "5",
  destination_currency: { chain_id: 8453, address: "0x833589…" },
  payment_rail: "CRYPTO",
  swap_mode: "ExactIn",
  crypto: {
    sender_address?, slippage_bps: 100,
    source_currency: { chain_id: 30000000000002 }
  }
}
```

CV's response is mapped to our `SwapQuote` shape:

| Our field | Source |
|---|---|
| `amountOut` | `output.currency_amount.ui_amount` |
| `feeUsd` | `input.fees.total_fee.value_usd + input.gas.value_usd` |
| `priceImpactPct` | `price_impact * 100` |
| `protocol` | `route.bridge` ‖ `route.aggregator` ‖ `route.name` ‖ "CoinVoyage cross-chain route" |
| `source` | `"live"` |

The swap page debounces input (450ms) and tries live first; if the API errors
or the pair has no route (`no_route_available`), it silently falls back to
the local mock so the UX never breaks. A green **LIVE** badge indicates
the quote came from CV; an **EST** badge marks the mock fallback.

**Verified live pairs as of 2026-05-02:** ETH→USDC.base, USDC.eth→USDC.arb,
USDC.base→SOL, SUI→USDC.base. **No direct route:** SUI→BTC (would route
through SUI→USDC.eth→BTC in production).

---

## 7. The Wagmi connector (the template)

`lib/wallet/connectors/evm.ts` — exports `createSlushDerivedEvmConnector({ getMnemonic })`.

The connector implements `wagmi`'s `Connector` interface:

| Method | Behavior |
|---|---|
| `connect({ chainId? })` | Derives address via `mnemonicToAccount(m, { path: "m/44'/60'/0'/0/0" })`, emits `connect` |
| `getAccounts()` | Returns the derived address |
| `getChainId()` | Tracks current chain id |
| `getProvider()` | Returns an EIP-1193 object whose `request({method, params})` handles signing methods locally and forwards reads to a per-chain `createPublicClient` |
| `switchChain({ chainId })` | Updates current chain, emits `change` |
| `isAuthorized()` | True when connected and a mnemonic is loadable |

Locally-handled methods: `eth_accounts`, `eth_requestAccounts`, `eth_chainId`,
`wallet_switchEthereumChain`, `personal_sign`, `eth_sign`, `eth_signTypedData_v4`,
`eth_sendTransaction`. Everything else is forwarded to a viem public client
keyed by the active chain.

**Registered** via `WalletConfiguration.evm.connectors` in
`app/providers.tsx`:

```tsx
const walletConfig = useMemo(() => ({
  evm: {
    connectors: [
      createSlushDerivedEvmConnector({ getMnemonic: () => loadMnemonic() }),
    ],
  },
}), []);
return <WalletProvider config={walletConfig}>…</WalletProvider>;
```

CV's `extendConnector` adds `id="slushDerived"` and `displayName="Slush Wallet"`
so it shows up correctly in CV's wallet picker too.

**Auto-connect** at `app/wallet/components/auto-connect.tsx`: two-stage
component (mounted gate + inner) that calls
`connect({ connector: slush })` on mount. Two-stage is required because
CV's `<WalletProvider>` is itself gated on a `mounted` flag in
`app/providers.tsx` to avoid SSR-time wagmi access.

### Adding non-EVM connectors

The same pattern works for:

| Chain | Library | Type to extend |
|---|---|---|
| BTC | `@bigmi/client` | `Connector` from BigMi |
| SOL | `@solana/wallet-adapter-base` | `WalletAdapter` |
| SUI | `@mysten/wallet-standard` | `WalletWithRequiredFeatures` |

Each one wraps the curve-appropriate signing API around our derived key.
Estimate ~0.5–1.5 days each. SUI is the most complex (event-based
wallet-standard with multiple feature interfaces).

---

## 8. Real execution flow

`app/wallet/swap/use-real-swap.tsx` — custom hook. Pattern mirrors the
existing `/swap` (Vaporswap) product:

1. `buildSwapIntent` — same `intent` shape used for quote, plus `sender_address`
2. `fetchSwapData(apiKey, intent, receivingAddress)` — POST `/api/swap` action `"data"`. Returns `{ payorder_id, data: { deposit_address, src, steps[] } }`.
3. `usePrepareTransaction(ChainType.EVM).execute(...)` — preparedTx auto-detects whether to:
   - run a `transaction` step's `data.crypto` calldata, or
   - transfer the source token to `deposit_address` (CV's deposit-then-bridge model)
4. `fetchOrderStatus(apiKey, payorderId)` — POST `/api/sale` action `"status"`, polled every 4s until terminal (`COMPLETED` / `FAILED` / `EXPIRED` / `REFUNDED`)

Status maps to UI states:

| CV status | UI state |
|---|---|
| `PENDING`, `AWAITING_PAYMENT` | broadcasting |
| `AWAITING_CONFIRMATION`, `OPTIMISTIC_CONFIRMED` | awaiting_confirmation |
| `EXECUTING_ORDER` | executing |
| `COMPLETED` | completed (PendingSheet → SuccessSheet) |
| `FAILED` / `EXPIRED` / `REFUNDED` | failed |

### Feature flag

```bash
# .env.local
NEXT_PUBLIC_SLUSH_REAL_EXECUTION=true
```

When unset (default), Confirm runs a timer-driven simulation. When
`"true"` AND source token is on an EVM chain, Confirm calls the real
execution path. Non-EVM source tokens always simulate (until the
non-EVM connectors are built).

The Review sheet shows a green "Real execution enabled" notice when the
real path is armed; the Confirm button reads "Confirm & Broadcast".

---

## 9. Configuration / env

| Variable | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_COIN_VOYAGE_API_KEY` | Used by `/api/swap` proxy + the live-quote client | Yes (live quotes won't show without it) |
| `NEXT_PUBLIC_SLUSH_REAL_EXECUTION` | `"true"` enables real EVM swap broadcast | No (default off) |

The CV API key can also be entered at runtime via the existing settings UI
(`app/dashboard/`), which writes to `localStorage.cv_api_key`.

---

## 10. Running locally

```bash
npm install
npm run dev          # http://localhost:3000/wallet
npm run build        # 14 wallet routes prerender as static
```

Walk-through to validate the demo arc:

1. `/wallet/onboarding` → Create or Import. With Import, paste any valid
   12 or 24-word phrase.
2. `/wallet` → confirm aggregate balance and asset list render.
3. `/wallet/profile/accounts` → confirm 9 chain addresses derived from the
   imported phrase. EVM addresses match across the 6 EVM rows; SUI / BTC /
   SOL each have curve-native distinct addresses.
4. `/wallet/swap` → SUI → USDC.base, type 5 → see green LIVE badge with
   real CV quote. Switch destination to BTC → falls back to EST mock.
5. `/wallet/send` → pick a token, paste a wrong-format address → see inline
   "Not a valid X address" feedback.

---

## 11. Production considerations

- **Seed storage** — `lib/wallet/store.ts` writes raw mnemonic to
  `localStorage`. Production must encrypt at rest (password-derived AES,
  WebAuthn-wrapped key, or platform secure-storage equivalent).
- **No transaction simulation** — when real execution is on, the user has
  no preview of state changes / token approvals beyond the CV quote.
  Production should integrate a tx-simulation step (Tenderly, Blockaid,
  similar) before broadcast.
- **No revoke / rotate flow** — the prototype has no way to invalidate a
  derived key, rotate seeds, or recover from compromise.
- **No multi-account UX** — only one passphrase, one derivation index per
  chain. Slush's existing account-management UX assumes multiple. The
  derivation library already supports `account_index` — UI doesn't expose it.
- **No real balance fetching** — the home + asset list use pinned demo
  values from `lib/wallet/swap/tokens.ts`. Production needs per-chain RPC /
  indexer integration. The existing `/api/wallet-tokens` endpoint (used by
  Vaporswap) is the closest reference.
- **No multi-sig / MPC** — out of scope for this layer; v2 is threshold
  signing via Privy / Turnkey / Lit / similar.

---

## 12. Open issues / TODOs

- Real execution path covers EVM only. Each of the three non-EVM connectors
  is a separate build (~0.5–1.5 days each).
- Receive flow is a placeholder; needs per-chain QR generation.
- Card load / off-load (Cypher's surface) is not implemented; pitch
  positions this as "Slush's announced card, fixed UX vs Cypher's
  external-wallet-signature flaw."
- The `bigint` warning during build is from a transitive dep's optional
  native binding — pure-JS fallback works fine, no functional impact.
- The TopBar's chain-badge button is not wired to anything yet (no chain
  switcher inside the wallet); add once active-chain becomes meaningful
  (likely with multi-account support).

---

## 13. References

- Existing CV swap product: `app/swap/swap-content.tsx` (uses `useAccount`,
  `usePrepareTransaction`, the same `/api/swap` + `/api/sale` endpoints)
- CV crypto SDK source maps: `node_modules/@coin-voyage/crypto/dist/`
- CV paykit types: `node_modules/@coin-voyage/paykit/dist/types/`
- Slush brand assets: `public/wallet/brand/`
- Pitch / commercial structure: `wallet-scope-of-work.md`
