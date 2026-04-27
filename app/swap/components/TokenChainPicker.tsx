"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VS } from "./theme";

// ── Types ──────────────────────────────────────────────────────────────────

export type PickerToken = {
  name: string;
  ticker: string;
  address?: string;
  chain_id: number;
  logo?: string;
  // Wallet balance (only present for tokens we know the user holds).
  uiAmount?: number;
  valueUsd?: number;
};

export type PickerChain = {
  id: number;
  name: string;
  ticker: string;
  icon: string; // emoji placeholder; will swap to SVG later
};

type Props = {
  isOpen: boolean;
  side: "src" | "dst" | null;
  chains: readonly PickerChain[];
  popularByChain: Record<number, PickerToken[]>;
  // Wallet-held tokens (already fetched). Optional — drives the "Your Tokens" view.
  walletTokens?: PickerToken[];
  // Currently-selected chain on this side, used as the initial filter.
  initialChainId?: number;
  // Default starred chain ids (top of left column).
  starredChainIds?: number[];
  onSelect: (token: PickerToken) => void;
  onClose: () => void;
};

const CHAIN_FILTER_ALL = -1 as const;

// ── Helpers ────────────────────────────────────────────────────────────────

function shortAddress(addr: string | undefined): string {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUiAmount(n: number | undefined): string {
  if (n == null) return "";
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(4);
  if (n < 1000) return n.toFixed(4);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatUsd(n: number | undefined): string {
  if (n == null) return "";
  if (n < 0.01) return "<$0.01";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function ChainBadge({ chain, size = 28 }: { chain: PickerChain | undefined; size?: number }) {
  if (!chain) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: VS.surface2,
        border: `1px solid ${VS.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.55),
        flexShrink: 0,
      }}
      aria-hidden
    >
      {chain.icon}
    </div>
  );
}

function TokenIcon({
  token,
  chain,
  size = 36,
}: {
  token: PickerToken;
  chain: PickerChain | undefined;
  size?: number;
}) {
  const initials = (token.ticker || "?").slice(0, 2).toUpperCase();
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {token.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={token.logo}
          alt={token.ticker}
          width={size}
          height={size}
          style={{ borderRadius: "50%", display: "block", background: VS.surface2 }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${VS.accent}33, ${VS.accent2}33)`,
            border: `1px solid ${VS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: VS.text,
            fontSize: Math.round(size * 0.34),
            fontWeight: 700,
            letterSpacing: -0.5,
          }}
          aria-hidden
        >
          {initials}
        </div>
      )}
      {chain && (
        <div
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 16,
            height: 16,
            borderRadius: 4,
            background: VS.surface,
            border: `1px solid ${VS.borderStrong}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
          }}
          aria-hidden
          title={chain.name}
        >
          {chain.icon}
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function TokenChainPicker({
  isOpen,
  side,
  chains,
  popularByChain,
  walletTokens = [],
  initialChainId,
  starredChainIds = [],
  onSelect,
  onClose,
}: Props) {
  const [chainFilter, setChainFilter] = useState<number>(initialChainId ?? CHAIN_FILTER_ALL);
  const [chainSearch, setChainSearch] = useState("");
  const [tokenSearch, setTokenSearch] = useState("");
  const tokenInputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the picker is reopened so it doesn't carry state
  // from the previous side or session.
  useEffect(() => {
    if (isOpen) {
      setChainFilter(initialChainId ?? CHAIN_FILTER_ALL);
      setChainSearch("");
      setTokenSearch("");
      // Auto-focus token search after the modal mounts.
      setTimeout(() => tokenInputRef.current?.focus(), 50);
    }
  }, [isOpen, initialChainId, side]);

  // Esc to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // ── Chain list ──
  const filteredChains = useMemo(() => {
    const q = chainSearch.trim().toLowerCase();
    if (!q) return chains;
    return chains.filter(
      (c) => c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q),
    );
  }, [chainSearch, chains]);

  const starredChains = useMemo(
    () =>
      filteredChains
        .filter((c) => starredChainIds.includes(c.id))
        .sort(
          (a, b) =>
            starredChainIds.indexOf(a.id) - starredChainIds.indexOf(b.id),
        ),
    [filteredChains, starredChainIds],
  );

  const azChains = useMemo(
    () =>
      filteredChains
        .filter((c) => !starredChainIds.includes(c.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filteredChains, starredChainIds],
  );

  // ── Token list ──
  // Build a unified pool: wallet tokens (with balances) merged with popular
  // tokens. Wallet entries take precedence on dedup (same chain + address|native).
  const tokenPool: PickerToken[] = useMemo(() => {
    const keyOf = (t: PickerToken) =>
      `${t.chain_id}:${t.address ? t.address.toLowerCase() : "native"}`;
    const seen = new Map<string, PickerToken>();
    for (const t of walletTokens) seen.set(keyOf(t), t);
    for (const cidStr of Object.keys(popularByChain)) {
      const cid = Number(cidStr);
      for (const t of popularByChain[cid]) {
        const enriched: PickerToken = { ...t, chain_id: cid };
        const k = keyOf(enriched);
        if (!seen.has(k)) seen.set(k, enriched);
      }
    }
    return Array.from(seen.values());
  }, [walletTokens, popularByChain]);

  const filteredTokens: PickerToken[] = useMemo(() => {
    const q = tokenSearch.trim().toLowerCase();
    let pool =
      chainFilter === CHAIN_FILTER_ALL
        ? tokenPool
        : tokenPool.filter((t) => t.chain_id === chainFilter);
    if (q) {
      pool = pool.filter(
        (t) =>
          t.ticker.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.address ? t.address.toLowerCase().includes(q) : false),
      );
    }
    // Sort: tokens with USD value first (desc), then by ui amount, then alpha.
    return pool.slice().sort((a, b) => {
      const ua = a.valueUsd ?? (a.uiAmount && a.uiAmount > 0 ? 0.0001 : 0);
      const ub = b.valueUsd ?? (b.uiAmount && b.uiAmount > 0 ? 0.0001 : 0);
      if (ub !== ua) return ub - ua;
      return a.ticker.localeCompare(b.ticker);
    });
  }, [tokenPool, chainFilter, tokenSearch]);

  const yourTokensCount = filteredTokens.filter((t) => (t.uiAmount ?? 0) > 0).length;

  if (!isOpen) return null;

  const chainsById = new Map(chains.map((c) => [c.id, c]));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select token"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: VS.overlay,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 760,
          height: "min(640px, 90vh)",
          background: VS.surface,
          border: `1px solid ${VS.borderStrong}`,
          borderRadius: 18,
          boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: VS.text,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${VS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
            Select Token
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: VS.textMuted,
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body — two columns */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Left: chains */}
          <div
            style={{
              width: 240,
              borderRight: `1px solid ${VS.border}`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div style={{ padding: "10px 12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: VS.surface2,
                  border: `1px solid ${VS.border}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
              >
                <span style={{ color: VS.textDim, fontSize: 12 }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search chains"
                  value={chainSearch}
                  onChange={(e) => setChainSearch(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: VS.text,
                    fontSize: 13,
                    padding: 0,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 8px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {/* All Chains */}
              <ChainRow
                label="All Chains"
                icon="🌐"
                active={chainFilter === CHAIN_FILTER_ALL}
                onClick={() => setChainFilter(CHAIN_FILTER_ALL)}
              />

              {starredChains.length > 0 && (
                <SectionLabel>Starred Chains ⭐</SectionLabel>
              )}
              {starredChains.map((c) => (
                <ChainRow
                  key={`s-${c.id}`}
                  label={c.name}
                  icon={c.icon}
                  active={chainFilter === c.id}
                  onClick={() => setChainFilter(c.id)}
                />
              ))}

              {azChains.length > 0 && <SectionLabel>Chains A–Z</SectionLabel>}
              {azChains.map((c) => (
                <ChainRow
                  key={`a-${c.id}`}
                  label={c.name}
                  icon={c.icon}
                  active={chainFilter === c.id}
                  onClick={() => setChainFilter(c.id)}
                />
              ))}

              {filteredChains.length === 0 && (
                <div style={{ padding: "16px 12px", color: VS.textDim, fontSize: 12 }}>
                  No chains match.
                </div>
              )}
            </div>
          </div>

          {/* Right: tokens */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div style={{ padding: "10px 14px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: VS.surface2,
                  border: `1px solid ${VS.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <span style={{ color: VS.textDim, fontSize: 13 }}>🔍</span>
                <input
                  ref={tokenInputRef}
                  type="text"
                  placeholder="Search for a token or paste address"
                  value={tokenSearch}
                  onChange={(e) => setTokenSearch(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: VS.text,
                    fontSize: 13,
                    padding: 0,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "0 14px 6px",
                fontSize: 11,
                fontWeight: 600,
                color: VS.textMuted,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {yourTokensCount > 0 ? "Your Tokens" : "Tokens"}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 8px 12px",
              }}
            >
              {filteredTokens.length === 0 ? (
                <div
                  style={{
                    padding: "24px 12px",
                    color: VS.textDim,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  No tokens match.
                </div>
              ) : (
                filteredTokens.map((t) => {
                  const chain = chainsById.get(t.chain_id);
                  return (
                    <button
                      key={`${t.chain_id}:${t.address ?? "native"}`}
                      onClick={() => {
                        onSelect(t);
                        onClose();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        borderRadius: 10,
                        color: VS.text,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget.style.background = VS.surface2);
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget.style.background = "transparent");
                      }}
                    >
                      <TokenIcon token={t} chain={chain} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{t.ticker}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: VS.textMuted,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 2,
                          }}
                        >
                          <span>{chain?.name ?? `Chain ${t.chain_id}`}</span>
                          {t.address && (
                            <span style={{ color: VS.textDim, fontFamily: "monospace" }}>
                              {shortAddress(t.address)}
                            </span>
                          )}
                        </div>
                      </div>
                      {(t.uiAmount ?? 0) > 0 && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {formatUsd(t.valueUsd) || formatUiAmount(t.uiAmount)}
                          </div>
                          <div style={{ fontSize: 11, color: VS.textMuted, marginTop: 2 }}>
                            {formatUiAmount(t.uiAmount)}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChainRow({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: active ? VS.gradientSoft : "transparent",
        border: `1px solid ${active ? VS.borderStrong : "transparent"}`,
        borderRadius: 10,
        color: active ? VS.text : VS.textMuted,
        cursor: "pointer",
        fontSize: 13,
        textAlign: "left",
        width: "100%",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = VS.surface2;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: VS.surface2,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          flexShrink: 0,
        }}
        aria-hidden
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 12px 4px",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.5,
        color: VS.textDim,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

// Re-export the chain badge so the Sell/Buy panels can use the same atom.
export { ChainBadge, TokenIcon };
