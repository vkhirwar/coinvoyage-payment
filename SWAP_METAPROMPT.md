# Metaprompt: Build a Swap/Bridge Interface with CoinVoyage API

Use this prompt with an AI coding assistant to recreate the swap/bridge interface.

---

## Prompt

Build a crypto swap/bridge interface for a Next.js (App Router, v16+) project that uses the CoinVoyage API for routing. The app already has `@coin-voyage/paykit`, `@coin-voyage/crypto`, `@coin-voyage/shared`, `@tanstack/react-query`, and Tailwind CSS v4 installed. The app has a `Providers` component wrapping children with `QueryClientProvider > ThemeProvider > ApiKeyProvider > WalletProvider > PayKitProvider`. There is a `useApiKeys()` hook returning `{ apiKey, secretKey }` and a `useWalletReady()` hook that returns `true` once `WalletProvider` is mounted.

### Architecture

Create 3 files:

1. **`app/api/swap/route.ts`** — API proxy to CoinVoyage backend
2. **`app/swap/page.tsx`** — Thin wrapper using `next/dynamic` with `{ ssr: false }` to import the content component (required because wallet hooks need browser context and WalletProvider)
3. **`app/swap/swap-content.tsx`** — The full swap UI component

### API Route (`app/api/swap/route.ts`)

Proxy POST requests to `https://api.coinvoyage.io/v2` with two actions:

- **`action: "quote"`** → `POST /swap/quote` with `{ intent, metadata? }`. Forward `X-API-KEY` header.
- **`action: "data"`** → `POST /swap/data` with `{ intent, receiving_address }`. Forward `X-API-KEY` header.

Use safe JSON parsing (read as text, try parse) so upstream error bodies don't crash the proxy. Log requests and errors server-side with `[swap/quote]` and `[swap/data]` prefixes.

### CoinVoyage Swap API — Intent Format (v2.4.0+)

**CRITICAL**: The intent object was restructured in a recent release. `source_currency` and `slippage_bps` are now nested inside a `crypto` object:

```json
{
  "intent": {
    "amount": "10",
    "destination_currency": {
      "chain_id": 8453,
      "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    "payment_rail": "CRYPTO",
    "swap_mode": "ExactIn",
    "crypto": {
      "sender_address": "0x...",
      "slippage_bps": 100,
      "source_currency": {
        "chain_id": 8453,
        "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
      }
    }
  },
  "receiving_address": "0x..."
}
```

Key fields:
- `amount` — string, human-readable token amount
- `destination_currency` — `{ chain_id, address? }` (omit address for native token)
- `payment_rail` — always `"CRYPTO"`
- `swap_mode` — `"ExactIn"` or `"ExactOut"`
- `crypto.sender_address` — the wallet address sending funds
- `crypto.slippage_bps` — slippage in basis points (100 = 1%)
- `crypto.source_currency` — `{ chain_id, address? }` (omit address for native token)
- `receiving_address` — top-level, only for `/swap/data` endpoint

The `/swap/quote` response returns: `{ input, output, swap_mode, price_impact }` where `input` and `output` have `{ ticker, currency_amount: { ui_amount, ui_amount_display, value_usd }, total, base, fees, gas }`.

The `/swap/data` response returns: `{ payorder_id, status, data: { src, dst, deposit_address, receiving_address, steps[], expires_at } }`.

### Supported Chains

```
ETH=1, OP=10, BSC=56, POL=137, ZKSYNC=324, BASE=8453, ARB=42161, AVAX=43114, BLAST=81457,
SOL=30000000000001, SUI=30000000000002, BTC=20000000000001, TRX=30000000000003
```

Map chain IDs to ChainType: SOL→ChainType.SOL, SUI→ChainType.SUI, BTC→ChainType.UTXO, all others→ChainType.EVM.

Include popular tokens per chain (native + USDC + USDT at minimum) with their contract addresses.

### Wallet Integration

Import from `@coin-voyage/crypto/hooks`:
- `useAccount({ chainType, selectedWallet })` — returns `{ account }` with `{ address, chainId, chainType, isConnected }`
- `usePrepareTransaction(chainType)` — returns `{ execute(params) }` for signing transactions
- `useInstalledWallets(chainType?)` — returns available wallet connectors
- `useUniversalConnect()` — returns `{ connect({ walletConnector }) }`

Import from `wagmi`:
- `useSwitchChain()` — returns `{ switchChainAsync({ chainId }) }` for EVM chain switching

**CRITICAL — SSR guard**: The wallet hooks require WagmiProvider context. The `Providers` component delays mounting `WalletProvider` by 100ms. The swap content component MUST:
1. Be loaded via `dynamic(() => import("./swap-content"), { ssr: false })` in the page
2. Gate rendering behind `useWalletReady()` — show a loading state until it returns `true`, then render the inner component that uses wallet hooks

### Two Separate Wallets: Source and Destination

Source and destination wallets must be **fully independent** — connecting one must never auto-fill the other.

- **Source wallet** (`srcAccount`): `useAccount({ chainType: srcChainType })` — used for paying/signing
- **Destination wallet** (`dstAccount`): `useAccount({ chainType: dstChainType })` — used for receiving
- `useInstalledWallets(srcChainType)` and `useInstalledWallets(dstChainType)` separately
- Wallet picker has a mode: `"source" | "dest" | null`
- When connecting a destination wallet, use a `pendingDstCapture` flag + useEffect to capture `dstAccount.address` into a `dstAddress` state variable after connection
- Manual address input (`receivingAddressManual`) always takes priority over wallet-connected address
- `receivingAddress = receivingAddressManual || dstAddress || ""`
- The `sender_address` in the intent uses `srcAccount?.address`

### UI Flow

**3-step flow**: Configure → Review → Execute

**Configure step:**
- From: chain selector + token selector + amount input
- To: chain selector + token selector + output preview (filled after quote)
- Swap direction toggle button (↕)
- Settings panel (collapsible): swap mode toggle, slippage presets (0.5/1/2/5%), receiving address manual input
- Button: "Connect Wallet" if no source wallet, "Get Quote" if connected

**Review step:**
- Route details card: route path, you pay, you receive, price impact (color-coded), slippage, fees, gas, mode
- Back + "Swap Now" / "Bridge Now" buttons

**Execute step:**
- Transaction details: order ID, status badge (color-coded, polls every 5s via `/api/sale` status endpoint), you pay, you receive, deposit address (click to copy), expiry, tx hash (after signing)
- "Sign & Send" button (gradient) — uses `usePrepareTransaction` to execute
- Chain switch prompt if wallet is on wrong EVM chain (use `switchChainAsync`)

**Wallet Connect Bar** (top of card, always visible):
- Row 1: Source wallet status/connect button + SWAP/BRIDGE badge
- Row 2: Destination wallet status/connect button + "Paste Address" shortcut
- Both show address truncated + chain type badge when connected
- "Change" button to clear and re-select destination

**Auto-detect swap vs bridge**: When source and destination chain IDs differ, show "BRIDGE" (purple badge). Same chain = "SWAP" (pink badge). Label updates everywhere.

### Transaction Execution

When "Sign & Send" is clicked:

1. If EVM and wallet chain doesn't match source chain → `switchChainAsync({ chainId: srcChainId })`
2. Check if response has a `transaction` step with `data.crypto` calldata → use `preparedTx.execute({ from, paymentData: step.data.crypto })`
3. Otherwise, it's a `deposit` step → transfer to deposit address:
   - Native token: `execute({ from, to: depositAddress, amount: BigInt(src.total.raw_amount), chainId })`
   - ERC20: `execute({ from, to: depositAddress, amount: BigInt(...), chainId, token: { address, decimals } })`
4. Show tx hash on success, poll order status

### Status Polling

After getting swap data, poll order status every 5s using the existing `/api/sale` endpoint with `action: "status"`. Update the status badge. Stop polling on terminal states: COMPLETED, FAILED, EXPIRED, REFUNDED.

### Debug Console

Include a collapsible debug panel below the card showing real-time API logs:
- Each entry: timestamp, type badge (REQUEST blue, RESPONSE green, ERROR red, INFO gray), label, JSON payload
- All API calls log request params and response data
- Chain switches and transaction attempts also logged
- Clear button, entry count, auto-scroll

### Styling

Match the existing cyberpunk theme:
- Background: `var(--background)` (#050505)
- Cards: `var(--card-bg)` (#0a0a0a) with `border: 1px solid #1a1a1a`, `borderRadius: 16`
- Inputs: `var(--input-bg)` (#0f0f0f), borderRadius 12
- Primary: `var(--pink-primary)` (#ff0033)
- Bridge accent: #8b5cf6 (purple)
- Success: #22c55e, Warning: #f59e0b, Error: #ef4444
- Font sizes: amounts 28px bold, labels 12px, body 13px
- All inline styles (no CSS modules)
- Swap button with hover rotation animation on the ↕ toggle

### Token Addresses Reference

Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
ETH USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
ARB USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
SOL USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
ETH USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
(Include USDC and USDT for every supported chain with correct addresses)
