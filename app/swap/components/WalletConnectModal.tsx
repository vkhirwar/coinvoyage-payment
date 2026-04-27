"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInstalledWallets, useUniversalConnect } from "@coin-voyage/crypto/hooks";
import { ChainType } from "@coin-voyage/shared/types";
import { VS } from "./theme";

const LAST_USED_KEY = "vs-wallet-last-used";

// Known wallet → primary chain type mapping. Used to badge multichain wallets
// surfaced in a non-native chain list (e.g. Phantom shown in the EVM list)
// and to sort native-chain wallets first. Returns null when the wallet's
// primary chain isn't a known/supported one (e.g. TronLink) so we can flag
// it as a multichain/non-native option.
function getPrimaryChain(wallet: { id: string; name: string }): ChainType | null {
  const id = wallet.id.toLowerCase();
  const name = wallet.name.toLowerCase();
  // Solana-primary
  if (id === "app.phantom" || name === "phantom") return ChainType.SOL;
  if (name.includes("solflare")) return ChainType.SOL;
  if (name.includes("magic eden")) return ChainType.SOL;
  if (name.includes("backpack")) return ChainType.SOL;
  if (name.includes("glow")) return ChainType.SOL;
  // Sui-primary
  if (name.includes("sui wallet") || name === "slush") return ChainType.SUI;
  if (name.includes("nightly")) return ChainType.SUI;
  // EVM-primary
  if (id.includes("metamask") || name.includes("metamask")) return ChainType.EVM;
  if (id.includes("coinbase") || name.includes("coinbase")) return ChainType.EVM;
  if (id.includes("walletconnect") || name.includes("walletconnect")) return ChainType.EVM;
  if (name.includes("rabby")) return ChainType.EVM;
  if (name.includes("rainbow")) return ChainType.EVM;
  if (name.includes("trust")) return ChainType.EVM;
  // UTXO-primary
  if (name.includes("xverse") || name.includes("unisat")) return ChainType.UTXO;
  // Unknown
  return null;
}

type Props = {
  isOpen: boolean;
  // Which chain type's wallets to surface (EVM/SUI/SOL/UTXO).
  chainType: ChainType;
  title?: string;
  onClose: () => void;
  // Optional callback invoked after a successful connect — parent can read
  // the freshly-connected account from useAccount.
  onConnected?: () => void;
};

export default function WalletConnectModal({
  isOpen,
  chainType,
  title = "Log in or sign up",
  onClose,
  onConnected,
}: Props) {
  const wallets = useInstalledWallets(chainType);
  const { connect } = useUniversalConnect({
    onError: (e) => setError(e?.message || "Connection failed"),
  });

  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [lastUsed, setLastUsed] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate last-used map from localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LAST_USED_KEY);
      if (raw) setLastUsed(JSON.parse(raw));
    } catch {}
  }, []);

  // Reset state on open & focus search.
  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setError(null);
    setConnectingId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // Esc closes.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? wallets.filter((w) => w.name.toLowerCase().includes(q))
      : wallets.slice();
    // Sort: last-used first, then native-chain wallets, then multichain/unknown,
    // each section alphabetical.
    const lastForChain = lastUsed[chainType];
    const isNative = (w: { id: string; name: string }) =>
      getPrimaryChain(w) === chainType;
    list.sort((a, b) => {
      if (a.id === lastForChain && b.id !== lastForChain) return -1;
      if (b.id === lastForChain && a.id !== lastForChain) return 1;
      const an = isNative(a), bn = isNative(b);
      if (an && !bn) return -1;
      if (bn && !an) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [wallets, search, lastUsed, chainType]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
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
          maxWidth: 420,
          maxHeight: "min(640px, 90vh)",
          background: VS.surface,
          border: `1px solid ${VS.borderStrong}`,
          borderRadius: 18,
          boxShadow: "0 30px 80px -30px rgba(0,0,0,0.6)",
          color: VS.text,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 18px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>
            {title}
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

        {/* Search */}
        <div style={{ padding: "0 18px 12px" }}>
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
              ref={inputRef}
              type="text"
              placeholder={`Search ${wallets.length} wallets`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

        {/* Wallet list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 10px 14px",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "24px 12px",
                textAlign: "center",
                color: VS.textDim,
                fontSize: 13,
              }}
            >
              {wallets.length === 0
                ? `No ${chainType} wallets detected. Install one and reload, or paste an address instead.`
                : "No matching wallets."}
            </div>
          ) : (
            filtered.map((w) => {
              const isLastUsed = lastUsed[chainType] === w.id;
              const isConnecting = connectingId === w.id;
              const primary = getPrimaryChain(w);
              const isMultichain = primary !== chainType;
              return (
                <button
                  key={w.id}
                  disabled={isConnecting}
                  onClick={async () => {
                    if (!w.connectors[0]) return;
                    setConnectingId(w.id);
                    setError(null);
                    try {
                      await connect({ walletConnector: w.connectors[0] });
                      // Persist last-used
                      const next = { ...lastUsed, [chainType]: w.id };
                      setLastUsed(next);
                      try {
                        window.localStorage.setItem(LAST_USED_KEY, JSON.stringify(next));
                      } catch {}
                      onConnected?.();
                      onClose();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Connection failed");
                    } finally {
                      setConnectingId(null);
                    }
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 10,
                    color: VS.text,
                    cursor: isConnecting ? "wait" : "pointer",
                    textAlign: "left",
                    opacity: isConnecting ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isConnecting) e.currentTarget.style.background = VS.surface2;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: VS.surface2,
                      border: `1px solid ${VS.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {w.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.icon} alt="" style={{ width: 24, height: 24 }} />
                    ) : (
                      <span style={{ fontSize: 14, color: VS.textMuted }}>?</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>
                      {w.name}
                    </div>
                    {isMultichain && (
                      <div
                        style={{
                          fontSize: 10,
                          color: VS.textDim,
                          marginTop: 2,
                          letterSpacing: 0.2,
                        }}
                      >
                        Set wallet to {chainType} mode before connecting
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {isLastUsed && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(34, 211, 154, 0.15)",
                          color: VS.success,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                        }}
                      >
                        Last used
                      </span>
                    )}
                    {isMultichain && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(245, 165, 36, 0.12)",
                          color: VS.warning,
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Multichain
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        color: VS.textMuted,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: VS.success,
                          display: "inline-block",
                        }}
                      />
                      {isConnecting ? "Connecting…" : "Installed"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {error && (
          <div
            style={{
              margin: "0 18px 14px",
              padding: "10px 12px",
              background: "rgba(255, 92, 122, 0.08)",
              border: "1px solid rgba(255, 92, 122, 0.3)",
              color: VS.danger,
              borderRadius: 10,
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
