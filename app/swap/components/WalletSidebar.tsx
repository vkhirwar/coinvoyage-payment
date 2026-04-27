"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VS } from "./theme";
import { TokenIcon, type PickerToken, type PickerChain } from "./TokenChainPicker";

// Chains we can fetch wallet balances for (subset of supported chains —
// must match the GOLDRUSH_CHAIN map in app/api/wallet-tokens/route.ts).
const BALANCE_CHAIN_IDS = [1, 10, 56, 137, 324, 8453, 42161, 43114, 81457];

export type SidebarToken = PickerToken & {
  chain_id: number;
  valueUsd?: number;
};

type Props = {
  address: string | undefined;
  chains: readonly PickerChain[];
  // Reload trigger — bump to force a refetch.
  reloadKey?: number;
  onDisconnect?: () => void;
  // Visual width passed to the parent so it can reserve space.
  width?: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function shortAddress(addr: string | undefined): string {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUsd(n: number | undefined): string {
  if (n == null) return "$0.00";
  if (n < 0.01 && n > 0) return "<$0.01";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUiAmount(n: number | undefined): string {
  if (n == null) return "";
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(4);
  if (n < 1000) return n.toFixed(4);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// ── Hook: fetch all chains in parallel ─────────────────────────────────────

function useAllChainsBalances(address: string | undefined, reloadKey: number) {
  const [tokens, setTokens] = useState<SidebarToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setTokens([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    Promise.all(
      BALANCE_CHAIN_IDS.map(async (chainId) => {
        try {
          const res = await fetch("/api/wallet-tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chainId, address }),
          });
          const json = (await res.json()) as {
            tokens?: Array<{
              name: string;
              ticker: string;
              address?: string;
              uiAmount?: number;
              valueUsd?: number;
            }>;
          };
          return (json.tokens ?? []).map<SidebarToken>((t) => ({
            name: t.name,
            ticker: t.ticker,
            address: t.address,
            chain_id: chainId,
            uiAmount: t.uiAmount,
            valueUsd: t.valueUsd,
          }));
        } catch {
          return [];
        }
      }),
    ).then((perChain) => {
      if (cancelled) return;
      const flat = perChain.flat();
      // Sort by USD value desc, then by ui amount desc.
      flat.sort((a, b) => {
        const va = a.valueUsd ?? 0;
        const vb = b.valueUsd ?? 0;
        if (vb !== va) return vb - va;
        return (b.uiAmount ?? 0) - (a.uiAmount ?? 0);
      });
      setTokens(flat);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [address, reloadKey]);

  const totalUsd = useMemo(
    () => tokens.reduce((sum, t) => sum + (t.valueUsd ?? 0), 0),
    [tokens],
  );

  return { tokens, totalUsd, isLoading };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WalletSidebar({
  address,
  chains,
  reloadKey = 0,
  onDisconnect,
  width = 320,
}: Props) {
  const [internalReload, setInternalReload] = useState(0);
  const { tokens, totalUsd, isLoading } = useAllChainsBalances(
    address,
    reloadKey + internalReload,
  );
  const [tab, setTab] = useState<"tokens" | "activity">("tokens");
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }, [address]);

  const chainsById = useMemo(() => new Map(chains.map((c) => [c.id, c])), [chains]);

  if (!address) return null;

  return (
    <aside
      className="vs-wallet-sidebar"
      style={{
        width,
        flexShrink: 0,
        borderLeft: `1px solid ${VS.border}`,
        background: VS.surface,
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 60px)",
        position: "sticky",
        top: 60,
        alignSelf: "flex-start",
      }}
    >
      {/* Header — address pill + actions */}
      <div
        style={{
          padding: "16px 18px 12px",
          borderBottom: `1px solid ${VS.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          onClick={onCopy}
          title={copied ? "Copied" : "Copy address"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            background: VS.surface2,
            border: `1px solid ${VS.border}`,
            borderRadius: 999,
            color: VS.text,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "monospace",
            letterSpacing: -0.2,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: VS.gradient,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {shortAddress(address)}
          <span style={{ color: VS.textDim, fontSize: 11 }}>{copied ? "✓" : "⧉"}</span>
        </button>

        <button
          onClick={() => setInternalReload((n) => n + 1)}
          title="Refresh balances"
          aria-label="Refresh balances"
          style={{
            marginLeft: "auto",
            width: 30,
            height: 30,
            borderRadius: 8,
            border: `1px solid ${VS.border}`,
            background: VS.surface2,
            color: VS.textMuted,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RefreshIcon spinning={isLoading} />
        </button>

        {onDisconnect && (
          <button
            onClick={onDisconnect}
            title="Disconnect"
            aria-label="Disconnect wallet"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${VS.border}`,
              background: VS.surface2,
              color: VS.textMuted,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PowerIcon />
          </button>
        )}
      </div>

      {/* Total */}
      <div style={{ padding: "16px 18px 8px" }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -0.6,
            color: VS.text,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatUsd(totalUsd)}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${VS.border}`,
          padding: "0 18px",
        }}
      >
        {(["tokens", "activity"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "transparent",
                border: "none",
                color: active ? VS.text : VS.textMuted,
                fontSize: 13,
                fontWeight: 600,
                padding: "10px 14px",
                cursor: "pointer",
                position: "relative",
                textTransform: "capitalize",
                letterSpacing: 0.2,
              }}
            >
              {t}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: -1,
                    height: 2,
                    background: VS.text,
                    borderRadius: 2,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {tab === "tokens" ? (
          tokens.length === 0 ? (
            <div
              style={{
                padding: "24px 18px",
                color: VS.textDim,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              {isLoading ? "Loading balances…" : "No tokens with non-zero balance."}
            </div>
          ) : (
            tokens.map((t) => {
              const chain = chainsById.get(t.chain_id);
              return (
                <div
                  key={`${t.chain_id}:${t.address ?? "native"}:${t.ticker}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 18px",
                  }}
                >
                  <TokenIcon token={t} chain={chain} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: VS.text }}>
                      {t.ticker}
                    </div>
                    <div style={{ fontSize: 11, color: VS.textMuted, marginTop: 2 }}>
                      {chain?.name ?? `Chain ${t.chain_id}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: VS.text,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatUsd(t.valueUsd)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: VS.textMuted,
                        marginTop: 2,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatUiAmount(t.uiAmount)} {t.ticker}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          <div
            style={{
              padding: "24px 18px",
              color: VS.textDim,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Activity coming soon.
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        animation: spinning ? "vs-spin 0.9s linear infinite" : undefined,
      }}
      aria-hidden
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}
