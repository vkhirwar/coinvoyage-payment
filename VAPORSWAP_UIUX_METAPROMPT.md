# Metaprompt: Vaporswap UI/UX Redesign

Use this prompt with an AI coding assistant to redesign the swap experience at `app/swap/swap-content.tsx` as a white-labeled product called **Vaporswap**. The routing logic, API proxy (`app/api/swap/route.ts`), CoinVoyage intent format, and wallet plumbing stay unchanged — this is a pure UI/UX + visual identity pass.

---

## Goal

Transform the current swap page into a polished, modern cross-chain swap/bridge interface that stands on its own as "Vaporswap." Users should not see CoinVoyage branding anywhere in the surface. Match the bar set by the best swap/bridge UIs in the market today.

## Inspiration — study these before designing

Pull concrete patterns (not pixels) from the following. For each, note what they do well and what you'd avoid:

**DEX aggregators / swaps**
- **Uniswap** (app.uniswap.org) — canonical token selector, slippage settings drawer, recent-tokens list, price-impact warnings, dark/light parity.
- **Matcha (0x)** — comparison of routes across aggregators, clean "you pay / you receive" stack, inline token search with balance-sorted results.
- **1inch** — route visualization (which pools / which % through each), Fusion mode toggle, gas estimate breakdown.
- **CowSwap** — "intent-based" framing, surplus callouts, MEV-protection badge done tastefully.
- **Paraswap** — clean token picker with chain badges on token icons.
- **Jupiter (Solana)** — best-in-class route graph, "versioned tx" affordance, excellent mobile layout. Look at their "Ultra" mode.

**Bridges**
- **Across** — simple two-panel "From chain / To chain" with fee + ETA prominent, progress states post-submit.
- **Stargate** — chain carousel, "Instant Guaranteed Finality" copy treatment.
- **Jumper (LI.FI)** — excellent cross-chain UX: route list with ETA, gas, steps, and a "best" badge; collapsible advanced settings.
- **Socket / Bungee** — route comparison table (output, fee, time, steps) that users can sort.
- **Relay** — minimal, opinionated, one-click cross-chain. Strong empty/loading states.
- **Rango Exchange** — multi-step route preview with per-step icons.
- **Squid (Axelar)** — in-app asset balances across chains, nice chain-switching animation.
- **Symbiosis, Orbiter, Mayan** — lighter-weight takes worth skimming for micro-interactions.

**General design references**
- **Rainbow** wallet, **Phantom**, **Zerion** — for token row styling, balance formatting, and micro-typography.
- **Linear**, **Vercel dashboard** — for form density, button hierarchy, and motion.

For each reference, the assistant should write down 1–2 sentences on what to borrow before touching code.

## Vaporswap brand direction

- **Name:** Vaporswap
- **Vibe:** clean, slightly retro-futurist — think "vaporwave minus the kitsch." Soft gradients (indigo → cyan → magenta) used sparingly as accents, not as full backgrounds. Primary surface is near-black or near-white depending on theme.
- **Logo placeholder (top-left):** a simple SVG mark — a rounded square with a gradient fill and the letter "V" (or a stylized wave) in white, followed by the wordmark **"Vaporswap"** in a semibold sans. Ship this as an inline SVG React component so it's themeable and doesn't need an asset pipeline. Leave a `TODO: replace with final logo` comment.
- **Typography:** keep the existing font stack but tighten tracking on headings. Use tabular numbers for amounts, balances, and quotes.
- **Color tokens:** define a small palette (`--vs-bg`, `--vs-surface`, `--vs-surface-2`, `--vs-border`, `--vs-text`, `--vs-text-muted`, `--vs-accent`, `--vs-accent-2`, `--vs-success`, `--vs-warning`, `--vs-danger`) and use them everywhere instead of raw hex. Support light and dark via `prefers-color-scheme` and a manual toggle.
- **Motion:** subtle. 150–200ms ease-out on hovers, 250ms spring on panel swaps, no bouncing. Respect `prefers-reduced-motion`.

## Layout

A single centered column on desktop (max-width ~520–560px) with a persistent top bar:

- **Top bar (sticky):**
  - Left: Vaporswap logo + wordmark (placeholder SVG described above). Clickable, routes to `/swap`.
  - Center: nothing (or a small "Swap / Bridge" segmented control if the current UI distinguishes them).
  - Right: network indicator, theme toggle, wallet connect button (use whatever is already wired up).
- **Swap card:**
  - "You pay" panel — token selector (chain badge overlaid on token icon), amount input (large, right-aligned, tabular), USD value beneath, balance + MAX on the right.
  - Flip button — circular, centered on the seam between panels, rotates 180° on click.
  - "You receive" panel — same shape, amount is read-only, shows the quoted output.
  - Route summary row — rate, price impact, min received, network fee, est. time. Collapsible "Details" expands a route diagram (steps with icons) inspired by Jumper/Rango.
  - Primary CTA — full-width, state-aware (`Connect Wallet` → `Enter an amount` → `Select token` → `Insufficient balance` → `Review swap` → `Swapping…`).
- **Footer:** thin, muted. Replace the current "Cross-chain bridge powered by …" line with Vaporswap copy (e.g. "Vaporswap · Cross-chain routing across N chains · MEV protected"). No CoinVoyage mention.

## Component-level requirements

- **Token selector modal:** searchable, shows balances, groups by chain, supports pasting a token address, recent selections pinned. Keyboard-navigable (↑/↓/Enter/Esc).
- **Chain selector:** horizontal scroll row of chain chips with logos; active chip has a gradient ring.
- **Slippage / settings:** popover triggered from a gear icon on the swap card header. Presets (0.1 / 0.5 / 1%) + custom input. Warn on >3%.
- **Quote state machine:** idle → loading (shimmer on the output field, not a full-card spinner) → ready → stale (after N seconds, show "Refresh quote") → error (inline, actionable).
- **Empty / error / success states:** every state gets real copy, not a blank box. Post-swap success shows a tx hash with an explorer link and a "Swap again" CTA.
- **Accessibility:** all interactive elements reachable via keyboard, focus rings visible, ARIA labels on icon buttons, color contrast ≥ 4.5:1 for text.
- **Responsive:** works down to 360px wide. On mobile the top bar collapses to logo + wallet button.

## Deliverables the assistant should produce

1. A short **design notes** section (in the PR description or a scratch doc) summarizing what was borrowed from which reference.
2. The **Vaporswap logo** as an inline SVG React component at `app/swap/components/VaporswapLogo.tsx` (or similar), with a `TODO` marker.
3. A refactor of `app/swap/swap-content.tsx` into smaller components (`TopBar`, `SwapCard`, `TokenPanel`, `RouteDetails`, `SettingsPopover`, `TokenSelectorModal`) living under `app/swap/components/`. Keep all existing state, quote-fetching, and wallet logic intact — move it, don't rewrite it.
4. A **color token layer** (CSS variables in `app/globals.css` or a scoped stylesheet) with light + dark values.
5. A **visual QA checklist** the reviewer can walk through: connect wallet, pick tokens on two different chains, enter amount, see quote, expand details, change slippage, hit the CTA, observe loading + success states, toggle theme, test at 360px width.

## Non-goals

- Do **not** change the CoinVoyage API calls, intent shape, or proxy route.
- Do **not** introduce a new component library (stay with whatever the repo already uses — Tailwind + raw React is fine).
- Do **not** add analytics, tracking, or third-party scripts.
- Do **not** remove or rename the `/swap` route.

## Constraints

- White-label: zero references to "CoinVoyage" in user-visible strings, alt text, titles, or meta tags on the swap surface.
- Bundle size: the logo must be inline SVG, not a PNG/WebP asset.
- Keep the file count reasonable — split only where it makes the main file easier to read.

---

**Start by:** (a) spending ~10 minutes on the inspiration list above and writing the design notes, (b) proposing a wireframe in text form for the new layout, (c) waiting for approval before writing code.
