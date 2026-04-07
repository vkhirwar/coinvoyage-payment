# Metaprompt: Build a CoinVoyage Dashboard

Use this prompt with an AI coding assistant to recreate the admin dashboard.

---

## Prompt

Build an admin dashboard for a Next.js (App Router, v16+) project integrated with the CoinVoyage API. The project uses Tailwind CSS v4 (utility classes, not inline styles — unlike the swap page). API keys are stored in localStorage as `cv_api_key` and `cv_secret_key`. The dashboard reads them directly from localStorage on mount (it does NOT use the provider's `useApiKeys` hook).

### Architecture

Create 3 files:

1. **`app/api/sale/route.ts`** — Proxy for pay-order endpoints (create, quote, payment-details, status, list)
2. **`app/api/webhooks/route.ts`** — Dual-purpose: receives incoming webhook events from CoinVoyage AND proxies webhook management CRUD from the frontend
3. **`app/dashboard/page.tsx`** — The full dashboard UI (single `"use client"` page, no SSR issues — no wallet hooks)

---

### API Route: `/api/sale` (POST)

Proxies to `https://api.coinvoyage.io/v2`. Accepts `{ action, apiKey, secretKey, ...params }`.

**HMAC-SHA256 Signature Generation** (required for authenticated endpoints):
```
timestamp = Math.floor(Date.now() / 1000)
payload = `${timestamp}.${requestBody}`
signature = HMAC-SHA256(secretKey, payload).hex()
header = `APIKey=${apiKey},signature=${signature},timestamp=${timestamp}`
```
Send as `Authorization-Signature` header.

Actions:
- **`create`** → `POST /pay-orders` with auth signature. Body: `{ mode: "SALE", intent: { asset?, amount: { fiat: { amount, unit } }, receiving_address? }, metadata? }`
- **`quote`** → `POST /pay-orders/{payorder_id}/quote`. Body: `{ wallet_address, chain_type, chain_ids? }`. Uses `X-API-KEY` header only.
- **`payment-details`** → `POST /pay-orders/{payorder_id}/payment-details`. Body: `{ source_currency?, refund_address?, quote_id? }`. Uses `X-API-KEY` header only.
- **`status`** → `GET /pay-orders/{payorder_id}`. Uses `X-API-KEY` header only.
- **`list`** → `GET /pay-orders?limit=N&offset=N`. Uses `X-API-KEY` header only.

---

### API Route: `/api/webhooks` (POST)

This route serves **two purposes** based on whether the request body has an `action` field:

**1. Management requests (from frontend)** — when `body.action` exists:

All management endpoints use `Authorization-Signature` header (HMAC). No `X-API-KEY` needed.

- **`list`** → `GET /webhooks` with auth signature (body = "")
- **`create`** → `POST /webhooks` with auth signature. Body: `{ url, subscription_events? }`
- **`update`** → `PUT /webhooks/{webhook_id}` with auth signature. Body: `{ url?, subscription_events?, active? }`
- **`delete`** → `DELETE /webhooks/{webhook_id}` with auth signature (body = ""). Handle 204 response.
- **`get-events`** → Returns in-memory `{ events: webhookEvents }` (no API call)
- **`clear-events`** → Empties the in-memory event store
- **`fee-balance`** → `GET /fees/balance` with auth signature (body = "")

**2. Incoming webhook events (from CoinVoyage)** — when no `action` field:

Store in a module-level in-memory array (persists across requests, resets on server restart). Cap at 500 events. Add `received_at` timestamp. Log to console.

```typescript
const webhookEvents: any[] = [];
const MAX_EVENTS = 500;

// Incoming event handler:
const event = { ...body, received_at: new Date().toISOString() };
webhookEvents.unshift(event);
if (webhookEvents.length > MAX_EVENTS) webhookEvents.length = MAX_EVENTS;
```

---

### Dashboard Page (`app/dashboard/page.tsx`)

Single `"use client"` component. Uses Tailwind utility classes throughout (className, not inline style — except for dynamic colors and box-shadows).

#### Authentication Gate

Read `cv_api_key` and `cv_secret_key` from localStorage on mount. If either is missing, show a full-page prompt to "Go to Authenticate" (link to `/` where keys are set). Dashboard is only accessible when `isAuthenticated = !!apiKey && !!secretKey`.

#### Layout

- Max width 1200px, centered, padding 10
- Header: "Dashboard" title + WebSocket live status button + "Checkout" link back to `/`
- Stats cards row (5 columns on lg, 2 on mobile): Total Orders, Completed (green), In Progress (blue), Failed (red), Volume USD (amber)
- Fee balance bar (amber, shows `amount_cents / 100` as USD)
- Tab bar: Orders | Webhooks (badge: count) | Events (badge: count) | Settings
- Tab content area

#### Tab Styling

Active tab: `bg-[#0a0a0a] text-white border border-[#331111] border-b-[#0a0a0a]` with red glow box-shadow. Inactive: transparent bg, gray text, hover pink. Badges: `bg-[#ff0033]` tiny pill.

All content cards use: `bg-[#0a0a0a] border border-[#331111]` with box-shadow: `0 0 30px rgba(255, 0, 51, 0.15), inset 0 0 1px rgba(255, 51, 51, 0.3)`.

---

### Orders Tab

**Data fetching**: `GET /pay-orders?limit=20&offset=N` via `/api/sale` with `action: "list"`. Returns `{ data: Order[], pagination: { total_count, limit, offset } }`.

**List view**: HTML table with columns: Order ID (truncated, mono, pink), Mode, Status (badge), Amount, Asset (with image), Created. Rows are clickable → open detail view. Pagination with Previous/Next buttons.

**Detail view** (replaces list when an order is selected):
- Back button → returns to list
- Two-column grid:
  - **Left**: Order info card (ID, mode, status badge, created/updated dates) + Fulfillment card (asset with image, amount, USD value, fiat, receiving address) + Transaction hashes card (deposit TX pink, receiving TX green, refund TX amber)
  - **Right**: Payment Source card (token image + name + chain, total, fees) + Payment Destination card (token, deposit address, receiving address, expiry) + Execution Steps card (list of steps with provider, status badge, source→dest currency, TX hash, errors) + Order Items/Metadata card (item images, names, quantities, prices)

**Status badge component**: Colored bg/text/border per status:
```
PENDING: amber, AWAITING_PAYMENT: blue, OPTIMISTIC_CONFIRMED: green,
AWAITING_CONFIRMATION: purple, EXECUTING_ORDER: purple, COMPLETED: green,
FAILED: red, EXPIRED: gray, REFUNDED: amber
```

---

### Webhooks Tab

**Create webhook form**: URL input + event type toggle buttons (pill style, pink when selected). Event types: `ORDER_CREATED, ORDER_AWAITING_PAYMENT, ORDER_CONFIRMING, ORDER_EXECUTING, ORDER_COMPLETED, ORDER_ERROR, ORDER_REFUNDED`. Leave empty = subscribe to all. "Create Webhook" button with gradient.

**Webhook list**: Cards showing URL (mono, pink), active/inactive indicator (green/gray dot), ID. Action buttons: Enable/Disable toggle, Delete (red). Show subscribed events as tiny bordered pills. Show webhook_secret truncated if present.

CRUD operations:
- Create: `action: "create"` with `{ url, subscription_events }`
- Toggle: `action: "update"` with `{ webhook_id, active: !current }`
- Delete: `action: "delete"` with `{ webhook_id }`
- Refresh list after every mutation

---

### Events Tab

Two sections:

**1. Live WebSocket events** (green border/bg):
- Sourced from WebSocket connection (see below)
- Stored in `wsEvents` state (max 100, newest first)
- Each card: event type (green), timestamp, full JSON payload in `<pre>`
- Green dot + "Live Events (WebSocket)" header

**2. Webhook events** (red border/bg):
- Fetched from `/api/webhooks` with `action: "get-events"`
- Stored in `events` state
- Each card: event type (pink), timestamp, full JSON payload in `<pre>`
- Show helpful message when empty: "Configure a webhook pointing to {origin}/api/webhooks"

Action buttons: Refresh, Clear (clears both local state and server via `action: "clear-events"`)

---

### Settings Tab

Three info cards (max-width 500px):

1. **API Configuration**: Shows truncated API key (pink mono), masked secret key (asterisks), green "Connected" status dot
2. **Webhook Receiver URL**: Shows `{window.location.origin}/api/webhooks` in a code block. Note about ngrok/tunnels for local dev.
3. **WebSocket**: Connect/Disconnect button (gradient when disconnected, outlined red when connected) + connection status dot

---

### WebSocket Integration

Connect to `wss://api.coinvoyage.io/v2/ws`:

```typescript
// On open:
ws.send(JSON.stringify({ type: "connect", data: { api_key: apiKey } }));

// On message:
if (msg.type === "connected") {
  setWsConnected(true);
  ws.send(JSON.stringify({ type: "subscribe", data: {} })); // subscribe to all org events
} else if (msg.type === "event") {
  // Add to wsEvents with received_at timestamp and source: "websocket"
  // Also refresh orders list
} else if (msg.type === "error") {
  console.error(msg.data);
}
```

Store WebSocket ref in `useRef`. Clean up on unmount. Toggle button in header shows green dot + "Live" when connected.

---

### Stats Computation

Compute from loaded orders (client-side):
```typescript
stats = {
  total: pagination.total_count || orders.length,
  completed: orders.filter(o => o.status === "COMPLETED").length,
  pending: orders.filter(o => ["PENDING","AWAITING_PAYMENT","AWAITING_CONFIRMATION","EXECUTING_ORDER"].includes(o.status)).length,
  failed: orders.filter(o => ["FAILED","EXPIRED"].includes(o.status)).length,
  totalVolume: orders.reduce((sum, o) => sum + (o.fulfillment?.amount?.value_usd || 0), 0),
}
```

---

### Data Loading Strategy

- On mount (when authenticated): fetch orders + fee balance
- On tab switch: fetch tab-specific data (webhooks on webhooks tab, events on events tab)
- Use `useCallback` for all fetch functions with `[apiKey, secretKey]` deps
- Loading states per section (ordersLoading, webhooksLoading, eventsLoading)

---

### Helper Functions

```typescript
function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

function truncate(str: string, len = 16) {
  if (!str) return "—";
  if (str.length <= len) return str;
  return str.slice(0, len / 2) + "..." + str.slice(-len / 2);
}
```

---

### Styling Notes

- Uses Tailwind utility classes, NOT inline styles (unlike the swap page which uses all inline)
- Color palette: bg `#0a0a0a`/`#0f0808`, borders `#331111`/`#441111`, text muted `#9ca3af`/`#6b7280`, pink `#ff0033`/`#ff6666`, accents from status colors
- Inputs use global CSS styling (bg `var(--input-bg)`, border `#331111`, no border-radius)
- Buttons: uppercase, tracking-wider, text-xs for actions. Gradient for primary CTAs.
- Cards have the red glow box-shadow: `0 0 30px rgba(255, 0, 51, 0.15), inset 0 0 1px rgba(255, 51, 51, 0.3)`
- Table rows: hover `bg-[#0f0808]`, cursor pointer, border-b `#1a0a0a`
- Monospace for IDs, addresses, hashes, code blocks
- All text white by default (inherited from body)

---

### CoinVoyage Order Object Shape

```typescript
{
  id: string,
  mode: "SALE" | "DEPOSIT" | "REFUND",
  status: PayOrderStatus,
  created_at: string,
  updated_at: string,
  fulfillment: {
    asset?: { chain_id, ticker, name, image_uri },
    amount?: { ui_amount, ui_amount_display, value_usd },
    fiat?: string,
    receiving_address?: string,
  },
  payment?: {
    src: { chain_id, name, ticker, image_uri, total, fees },
    dst: { chain_id, name, ticker, image_uri, currency_amount },
    deposit_address: string,
    receiving_address: string,
    refund_address: string,
    expires_at: string,
    execution: [{
      provider: string,
      status: string,
      source_currency: { ticker },
      destination_currency: { ticker },
      source_tx_hash?: string,
      error?: string,
    }],
  },
  metadata?: {
    items?: [{ name, image, quantity, unit_price, currency }],
  },
  deposit_tx_hash?: string,
  receiving_tx_hash?: string,
  refund_tx_hash?: string,
}
```

### Webhook Object Shape

```typescript
{
  id: string,
  url: string,
  webhook_secret?: string,
  subscription_events?: string[],
  active: boolean,
}
```
