# Multi-chain wallet integration plan

How `app/swap` connects EVM, Solana, Sui, and Bitcoin wallets — independently for source (sending) and destination (receiving) — so any chain combo (EVM↔SOL, SOL→SUI, etc.) works in one UI. Hand this to whoever is integrating CoinVoyage into another site.

---

## 1. The packages doing the work

The whole multi-chain story is provided by **`@coin-voyage/paykit`** + **`@coin-voyage/crypto`**. They ship a single `WalletProvider` that internally wires up:

| Chain family | Underlying lib | Wraps |
|---|---|---|
| EVM (Ethereum, Base, Arbitrum, Polygon, …) | `wagmi` | MetaMask, Coinbase, WalletConnect, Rabby, Rainbow… |
| Solana | `@solana/wallet-adapter-react` | Phantom, Solflare, Backpack… |
| Sui | `@mysten/dapp-kit` | Sui Wallet (Slush), Suiet, Nightly… |
| UTXO / Bitcoin | `@bigmi/react` | Xverse, UniSat… |

You don't install those libs yourself — `@coin-voyage/paykit` re-exports `WalletProvider` and ensures all four sub-providers are mounted in the right order with shared context.

```bash
npm i @coin-voyage/paykit @coin-voyage/crypto @coin-voyage/shared @tanstack/react-query
```

---

## 2. Provider stack (mount once, at the app root)

```tsx
// app/providers.tsx (or wherever your root client component lives)
"use client";
import { PayKitProvider, WalletProvider } from "@coin-voyage/paykit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export function Providers({ children, apiKey }: { children: React.ReactNode; apiKey: string }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <PayKitProvider apiKey={apiKey}>{children}</PayKitProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}
```

**Important:** `WalletProvider` uses browser-only APIs (window.ethereum, etc.). In Next.js / SSR setups, gate the provider behind a `mounted` flag so it only renders after hydration:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
return mounted ? <WalletProvider>{children}</WalletProvider> : <>{children}</>;
```

Otherwise you'll get hydration mismatches when the SDK probes for installed extensions.

---

## 3. Chain type model

Every supported chain falls into one of four `ChainType` enum values exported from `@coin-voyage/shared/types`:

```ts
import { ChainType } from "@coin-voyage/shared/types";

ChainType.EVM   // any Ethereum-flavored chain
ChainType.SOL   // Solana
ChainType.SUI   // Sui
ChainType.UTXO  // Bitcoin (and Bitcoin-likes)
```

CoinVoyage uses standard EVM chain IDs (1 / 10 / 137 / 8453 / 42161 / 43114 / …) and **synthetic IDs above 2³² for non-EVM**:

| Chain ID | Chain |
|---|---|
| 1, 10, 56, 137, 324, 8453, 42161, 43114, 81457 | EVM mainnets |
| `30000000000001` | Solana |
| `30000000000002` | Sui |
| `30000000000003` | Tron |
| `20000000000001` | Bitcoin |

A single helper maps chain id → chain type:

```ts
function getChainType(chainId: number): ChainType {
  if (chainId === 30000000000001) return ChainType.SOL;
  if (chainId === 30000000000002) return ChainType.SUI;
  if (chainId === 20000000000001) return ChainType.UTXO;
  return ChainType.EVM;
}
```

Everything downstream — the wallet picker, the account hook, the tx-prep hook — keys off `ChainType`, not chain id. That's how we switch wallet families without branching in product code.

---

## 4. The four hooks that do everything

All from `@coin-voyage/crypto/hooks`:

### `useAccount({ chainType })`
Returns the **currently connected account for that chain family**.

```ts
const { account: srcAccount } = useAccount({ chainType: srcChainType });
const { account: dstAccount } = useAccount({ chainType: dstChainType });

// account: { address, chainId, isConnected, status, connector, … }
```

Internally aggregates wagmi (EVM), `@solana/wallet-adapter-react` (SOL), `@mysten/dapp-kit` (SUI), and `@bigmi/react` (UTXO). You always get a normalized shape regardless of family.

The trick is calling it **twice** — once with `srcChainType`, once with `dstChainType` — to get an EVM account *and* a Solana account live side-by-side.

### `useInstalledWallets(chainType?)`
Returns a `Wallet[]` filtered by chain family. Each entry has `id`, `name`, `icon`, and `connectors[]`.

```ts
const wallets = useInstalledWallets(ChainType.SOL);
// → [{ id: "app.phantom", name: "Phantom", icon: "...", connectors: [...] }, …]
```

Pass the chainType the user is connecting *for* (source or destination). Omit to get all chains' installed wallets.

### `useUniversalConnect({ onError })`
Returns a single `connect({ walletConnector })` function that works for any chain family — wagmi-style for EVM, the Solana adapter API for SOL, etc. Hides the differences.

```ts
const { connect } = useUniversalConnect({ onError: (e) => setError(e.message) });
await connect({ walletConnector: wallet.connectors[0] });
```

### `useAccountDisconnect()`
Returns a `disconnect(account?)` function. Pass the `account` from `useAccount()` to disconnect just that one wallet.

```ts
const disconnect = useAccountDisconnect();
await disconnect(srcAccount);
```

### `usePrepareTransaction(chainType)`
Returns `{ execute(params) }` where `params` has the right shape for the chain family. The function broadcasts the deposit/swap tx in the user's wallet and returns the tx hash.

```ts
const preparedTx = usePrepareTransaction(srcChainType);
const hash = await preparedTx.execute({
  from: srcAccount.address,
  to: depositAddress,         // CoinVoyage-issued
  amount: BigInt(rawAmount),
  chainId: srcChainId,
  // For ERC-20 / SPL tokens:
  ...(isNativeToken ? {} : { token: { address: tokenAddress, decimals } }),
});
```

For routes where CoinVoyage returns calldata directly (e.g. on-chain swap router), pass `{ paymentData: txStep.data.crypto }` instead of `to/amount`.

---

## 5. Source vs destination wallet — the core pattern

The whole "EVM↔SOL in one UI" trick is just calling `useAccount` twice with different chain types and storing them as separate state.

```tsx
// Selection state — ChainType is derived, not stored.
const [srcToken, setSrcToken] = useState<{ chain_id: number; address?: string; ticker: string }>({
  chain_id: 8453,         // Base USDC by default
  ticker: "USDC",
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
});
const [dstToken, setDstToken] = useState({
  chain_id: 30000000000001, // Solana SOL by default
  ticker: "SOL",
});

const srcChainType = getChainType(srcToken.chain_id);
const dstChainType = getChainType(dstToken.chain_id);

const { account: srcAccount } = useAccount({ chainType: srcChainType });
const { account: dstAccount } = useAccount({ chainType: dstChainType });
```

Now `srcAccount` is the user's EVM wallet (for sending) and `dstAccount` is the user's Solana wallet (for receiving) — concurrently. Both update independently when the user (dis)connects either side.

---

## 6. Recipient address derivation

CoinVoyage's `/swap/data` endpoint requires a `receiving_address`. Three sources, in priority order:

```ts
// 1. User explicitly pasted an address → wins
const [pastedAddress, setPastedAddress] = useState("");
// 2. Connected destination wallet → fallback
const dstWalletAddress = dstAccount?.isConnected ? dstAccount.address : "";
// 3. Pure same-type EVM↔EVM swaps can also fall back to srcAccount.address
//    (the same wallet appears in both useAccount calls when chain types match)

const receivingAddress = pastedAddress || dstWalletAddress || "";
```

When `srcChainType === dstChainType`, `dstAccount` will reflect the same wallet the user connected as source — they get auto-recipient for free. When they differ (EVM↔SOL), the user needs to pick one of:
- Connect a wallet for the destination chain (opens a wallet picker scoped to `dstChainType`)
- Paste a destination-chain address

Capture the freshly-connected destination wallet address with a small effect:

```tsx
const [pendingDstCapture, setPendingDstCapture] = useState(false);

// When user clicks "Connect a new wallet" on the dest side:
const onConnectDst = () => {
  setPendingDstCapture(true);
  openWalletModal({ chainType: dstChainType });
};

useEffect(() => {
  if (pendingDstCapture && dstAccount?.isConnected && dstAccount.address) {
    setExplicitDstAddress(dstAccount.address);
    setPendingDstCapture(false);
  }
}, [pendingDstCapture, dstAccount?.isConnected, dstAccount?.address]);
```

The flag prevents accidental address swaps when the user later changes the destination chain or wallet.

---

## 7. Wallet picker UX (Relay-style)

Build one `<WalletConnectModal chainType onClose />` component used in three places:

1. **Top-bar "Connect" button** → opens with `chainType = srcChainType` (default source = wallet user is sending from).
2. **In-card "Connect Source Wallet" CTA** → same, just a different trigger.
3. **Recipient dropdown's "Connect a new wallet"** → opens with `chainType = dstChainType`.

The modal contents:

```tsx
const wallets = useInstalledWallets(chainType);
const { connect } = useUniversalConnect({ onError: setError });

// Search + sort
// 1. Sort native-chain wallets first (native = wallet's primary chain matches chainType)
// 2. "Last used" wallet for this chainType pinned to top (persist in localStorage)
// 3. Multichain wallets (Phantom, Magic Eden, etc.) tagged with a "MULTICHAIN" badge
//    when shown in a non-native list, plus a hint "Set wallet to {chainType} mode before connecting"
```

### Multichain wallet caveat (the one that bites you)

Wallets like **Phantom**, **Magic Eden**, and **Rainbow** inject `window.ethereum`, so wagmi reports them as EVM-installed even when the user only has a Solana account active. Picking Phantom for an EVM connect attempt then fails with:

> *"Unsupported account: This Solana account doesn't support Ethereum"*

Mitigation: maintain a small `getPrimaryChain(wallet)` map and badge non-native wallets:

```ts
function getPrimaryChain(wallet: { id: string; name: string }): ChainType | null {
  const id = wallet.id.toLowerCase();
  const name = wallet.name.toLowerCase();
  if (id === "app.phantom" || name === "phantom") return ChainType.SOL;
  if (name.includes("solflare") || name.includes("backpack") || name.includes("magic eden")) return ChainType.SOL;
  if (name.includes("sui wallet") || name === "slush" || name.includes("nightly")) return ChainType.SUI;
  if (id.includes("metamask")) return ChainType.EVM;
  if (id.includes("coinbase") || id.includes("walletconnect") || name.includes("rabby") || name.includes("rainbow") || name.includes("trust")) return ChainType.EVM;
  if (name.includes("xverse") || name.includes("unisat")) return ChainType.UTXO;
  return null; // unknown — show without a badge
}
```

Use it to (a) sort matching-primary wallets to the top and (b) render a small "MULTICHAIN" tag on others so the user sees the warning *before* clicking.

---

## 8. Quote → Execute → Track flow (CoinVoyage SDK shape)

This is independent of the wallet plumbing but you'll need it to wire the swap end-to-end. The CoinVoyage HTTP API:

```
POST /v2/swap/quote     → price + fees + estimated route
POST /v2/swap/data      → deposit address + per-leg execution plan
GET  /v2/pay-orders/:id → order status + live execution updates
```

Proxy each through your own backend (so you don't expose the API key client-side):

```ts
// /api/swap (Next.js route handler, or your equivalent)
const res = await fetch(`${API_BASE}/swap/quote`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
  body: JSON.stringify({ intent: req.body.intent }),
});
```

### Intent shape

```ts
const intent = {
  amount,                                        // string, raw or UI — backend normalizes
  swap_mode: "ExactIn" | "ExactOut",
  payment_rail: "CRYPTO",
  source_currency: { chain_id, address? },       // address omitted = native
  destination_currency: { chain_id, address? },
  crypto: {
    sender_address: srcAccount?.address,         // optional but recommended
    slippage_bps: 100,                           // 100 = 1%
  },
};
```

### Execution

After `/swap/data` returns:

```ts
const { payorder_id, data } = swapDataResponse;

if (data.steps?.[0]?.kind === "transaction" && data.steps[0].data?.crypto) {
  // CoinVoyage routes through user-side calldata (e.g. Uniswap router).
  await preparedTx.execute({
    from: srcAccount.address,
    paymentData: data.steps[0].data.crypto,
  });
} else {
  // Deposit-address pattern: user transfers to a CoinVoyage address.
  await preparedTx.execute({
    from: srcAccount.address,
    to: data.deposit_address,
    amount: BigInt(data.src.total.raw_amount),
    chainId: data.src.chain_id,
    ...(data.src.address ? { token: { address: data.src.address, decimals: data.src.decimals } } : {}),
  });
}
```

### Polling

Poll `GET /v2/pay-orders/:id` every 5 seconds. **Replace** your local `swapData.data` with `order.payment` on each poll — the per-leg statuses (`payment.execution[]`) and the final `payment.destination_tx_hash` only update through this endpoint. (We had a bug where we only refreshed `status` and the timeline froze — don't repeat that.)

```ts
setSwapData((prev) => ({
  ...prev,
  status: order.status,
  data: order.payment ?? prev.data,
}));
```

Stop polling when status hits `COMPLETED`, `FAILED`, `EXPIRED`, or `REFUNDED`.

### Treat destination tx hash as "delivered"

The order can sit in `EXECUTING_ORDER` for tens of seconds *after* the destination chain settles, while the backend reconciles fees. Don't trap users on a "pending" screen with funds already in their wallet:

```ts
const isDelivered =
  orderStatus === "COMPLETED" ||
  (!!orderData.destination_tx_hash &&
    orderStatus !== "FAILED" &&
    orderStatus !== "EXPIRED" &&
    orderStatus !== "REFUNDED");
```

---

## 9. Cross-chain wallet balance sidebar

Goldrush (Covalent) gives wallet balances per chain, EVM-only. To build a sidebar showing the user's holdings across all EVM chains:

```ts
const EVM_CHAIN_IDS = [1, 10, 56, 137, 324, 8453, 42161, 43114, 81457];

const results = await Promise.all(
  EVM_CHAIN_IDS.map((chainId) =>
    fetch(`/api/wallet-tokens`, {
      method: "POST",
      body: JSON.stringify({ chainId, address: srcAccount.address }),
    }).then((r) => r.json()),
  ),
);
const flat = results.flatMap((r) => r.tokens ?? []);
flat.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
```

Goldrush does not cover Solana / Sui / Bitcoin — for those, hide the sidebar (or call out separately via Helius / Sui RPC / mempool.space). Hide the entire sidebar at viewports < 1100px.

Per-chain endpoint contract (your backend implements this so the API key isn't exposed):

```
POST /api/wallet-tokens  { chainId, address }
→ { tokens: Array<{ name, ticker, address?, decimals, balance, uiAmount, valueUsd, priceUsd, logo }> }
```

---

## 10. Components to build (in order)

For a Relay-quality flow, ship in this order:

1. **`<TokenChainPicker>`** — modal with two columns: chain list (search + All Chains + Starred + A–Z) on the left, token list (search-or-paste-address + balance-sorted "Your Tokens" with chain-badged icons) on the right. Used by both the From and To panels.
2. **`<SwapPanel>`** — Sell/Buy block: big tabular amount input on the left, compact `<TokenPill>` on the right; USD value + balance + 20%/50%/MAX chips below. Use the Same component for both sides (read-only output via a `<ReadOnlyAmount>` shimmer when the To side is loading).
3. **`<WalletConnectModal>`** — the picker described in §7, scoped by `chainType`.
4. **`<RecipientDropdown>`** — pill on the To panel header that opens a popover with: *current connected dest wallet*, *Connect a new wallet*, *Paste wallet address*, *Clear*. This is the affordance that unlocks EVM↔SOL/SUI for users who haven't pre-connected the destination wallet.
5. **`<WalletSidebar>`** — cross-chain balance display (§9), gated on `srcChainType === ChainType.EVM`.
6. **`<RouteSummary>`** — compact post-quote card: "1 USDC = 0.99 USDC" with expand for ETA / network cost / price impact. Slippage chip with popover (Auto + presets + custom). Auto-quote inputs (debounced ~500ms), refresh after ~30s with a "Stale" badge in the meantime.
7. **`<TransactionFlowModal>`** — visual route (chain-icon → chain-icon with token amounts) plus step timeline driven by `payment.execution[]`. Active step shows spinner; completed gets ✓; errors get ✕. Tx hashes inline, click to copy. On delivery → green-checkmark "Transaction Completed" with Sent/Received rows.

State machine in the parent component:

```ts
type Step = "configure" | "execute";
type WalletModalSide = "src" | "dst" | null;

const [step, setStep] = useState<Step>("configure");
const [walletModalSide, setWalletModalSide] = useState<WalletModalSide>(null);
const [pickerSide, setPickerSide] = useState<"src" | "dst" | null>(null);
const [flowModalOpen, setFlowModalOpen] = useState(false);
```

That's enough to drive every interaction without prop-drilling.

---

## 11. CTA state machine (one button, many states)

Single state-aware CTA. Auto-quote runs in the background; the label tells the user what's missing:

```ts
const noWallet = !srcAccount?.isConnected;
const noAmount = !amount || parseFloat(amount) <= 0;
const noRecipient = !receivingAddress;
const insufficient = srcWalletBalance && parseFloat(amount) > srcWalletBalance.uiAmount;
const ready = !noWallet && !noAmount && !noRecipient && !insufficient && !!quote && !quoteLoading;

const label =
  noWallet            ? "Connect Wallet"
: noAmount            ? "Enter an amount"
: noRecipient         ? `Set ${dstChainType} recipient`
: insufficient        ? `Insufficient ${srcToken.ticker} balance`
: quoteLoading        ? "Fetching quote…"
: !quote              ? "No route available"
: isCrossChain        ? "Bridge"
                      : "Swap";
```

`onClick` branches:
- `noWallet` → `setWalletModalSide("src")`
- `ready` → `setFlowModalOpen(true); getSwapData();` (the modal owns the rest)

Don't try to do approve→swap→send as separate user clicks — the SDK + execution modal already handle multi-step execution as one user action.

---

## 12. Gotchas worth flagging up front

| Gotcha | Why it bites | Fix |
|---|---|---|
| Hydration mismatch on first render | `WalletProvider` probes `window.ethereum`; SSR returns nothing | Mount provider behind a `mounted` flag (§2) |
| Multichain wallets in EVM list | wagmi detects any `window.ethereum` injector | Show a "MULTICHAIN" badge + sort native first (§7) |
| `dstAccount` looks "stale" right after connecting | Wallet adapter resolves the account async | Use a `pendingDstCapture` flag + `useEffect` to capture when ready (§6) |
| Polling shows status changes but the timeline doesn't update | You only merged `status`, not `payment` | Always merge `order.payment` into `swapData.data` (§8) |
| User sees "pending" with funds already received | Backend reconciles after destination tx settles | Treat `destination_tx_hash` present (and not failed) as delivered (§8) |
| Tailwind v4's `@theme inline` strips `[data-theme]` selectors | Tailwind processes globals.css and drops attribute selectors it doesn't understand | Put theme variables in a separate stylesheet imported *after* globals.css |
| Phantom hangs if user has only a Solana account but you ask for EVM | Wallet popup never propagates a clear error | Make sure your wallet modal lets the user dismiss / pick a different wallet without waiting for the promise |

---

## 13. Backend prerequisites

Two API key shapes — both stay server-side, your backend proxies:

| Key | Used for | Endpoint |
|---|---|---|
| `COINVOYAGE_API_KEY` | Quotes, swap data, order status | `https://api.coinvoyage.io/v2/swap/{quote,data}`, `…/pay-orders/:id` |
| `GOLDRUSH_API_KEY` (Covalent) | EVM wallet balances | `https://api.covalenthq.com/v1/{slug}/address/{address}/balances_v2/` |

---

## 14. Suggested rollout order

1. Mount `WalletProvider` + `PayKitProvider`. Verify `useAccount({ chainType: ChainType.EVM })` returns a connected wallet for whatever wagmi connector you have plugged in.
2. Add `useAccount` calls for SOL/SUI/UTXO too. Confirm independent connections work.
3. Build the wallet picker modal (§7).
4. Build the token+chain picker (§10 #1).
5. Wire the recipient dropdown (§10 #4) — this is the piece that unlocks cross-type flows.
6. Wire the quote → /swap/data → execute path through `usePrepareTransaction`.
7. Add polling (§8) and the transaction modal (§10 #7) — remember to merge `order.payment`, not just status.
8. Polish: cross-chain balance sidebar, route summary, light/dark theming, mobile.

---

## File map (ours, for reference)

```
app/swap/components/
├── theme.ts                    # CSS-var-backed palette + light/dark helpers
├── ThemeToggle.tsx             # sun/moon button
├── TokenChainPicker.tsx        # two-column chain+token modal
├── WalletConnectModal.tsx      # Relay-style wallet picker w/ multichain badge
├── RecipientDropdown.tsx       # destination address popover
├── WalletSidebar.tsx           # cross-chain balance panel (EVM only)
├── RouteSummary.tsx            # compact post-quote card
└── TransactionFlowModal.tsx    # route visual + step timeline + completion view

app/swap/swap-content.tsx       # composes everything; owns state
app/api/swap/route.ts           # proxies POST /swap/quote and /swap/data
app/api/sale/route.ts           # proxies pay-order CRUD (status polling)
app/api/wallet-tokens/route.ts  # proxies Goldrush balances per chain
```

Anything in `app/swap/components/` is portable — copy into the other site, point at their existing `WalletProvider` and theme tokens, and the multi-chain story works.
