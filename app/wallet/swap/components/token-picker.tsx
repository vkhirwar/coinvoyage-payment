"use client";

import { useMemo, useState } from "react";
import { ChainGlyph } from "../../components/chain-glyph";
import type { ChainKey } from "@/lib/wallet/core";
import type { Token } from "@/lib/wallet/swap/tokens";
import { balanceOf } from "@/lib/wallet/swap/tokens";

const CHAIN_PILLS: { key: ChainKey | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sui", label: "Sui" },
  { key: "btc", label: "Bitcoin" },
  { key: "sol", label: "Solana" },
  { key: "eth", label: "Ethereum" },
  { key: "base", label: "Base" },
  { key: "arb", label: "Arbitrum" },
  { key: "op", label: "Optimism" },
  { key: "polygon", label: "Polygon" },
  { key: "bsc", label: "BNB" },
];

export function TokenPicker({
  tokens,
  selectedId,
  excludeId,
  onPick,
  onClose,
}: {
  tokens: Token[];
  selectedId: string;
  excludeId?: string;
  onPick: (t: Token) => void;
  onClose: () => void;
}) {
  const [chain, setChain] = useState<ChainKey | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return tokens.filter((t) => {
      if (t.id === excludeId) return false;
      if (chain !== "all" && t.chain !== chain) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!t.symbol.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tokens, chain, query, excludeId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(10,22,38,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-t-3xl p-5 pb-6 flex flex-col"
        style={{ background: "white", height: "min(80vh, 640px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-12 h-1 rounded-full mb-4" style={{ background: "var(--color-slush-divider)" }} />
        <h2 className="text-base font-semibold mb-3">Select a coin</h2>

        <input
          type="search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full px-4 py-2.5 text-sm mb-3"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 mb-1" style={{ scrollbarWidth: "none" }}>
          {CHAIN_PILLS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setChain(p.key)}
              className="rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap"
              style={{
                background: chain === p.key ? "var(--color-slush-blue)" : "var(--color-slush-card-tint)",
                color: chain === p.key ? "white" : "var(--color-slush-ink)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <ul className="flex-1 overflow-y-auto -mx-2">
          {filtered.length === 0 && (
            <li className="px-2 py-6 text-center text-sm" style={{ color: "var(--color-slush-ink-muted)" }}>
              No coins match.
            </li>
          )}
          {filtered.map((t) => {
            const bal = balanceOf(t.id);
            const usd = bal * t.priceUsd;
            const isSelected = t.id === selectedId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onPick(t)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl text-left transition-colors"
                  style={{ background: isSelected ? "var(--color-slush-card-tint)" : "transparent" }}
                >
                  <ChainGlyph chain={t.chain} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{t.symbol}</div>
                    <div className="text-xs truncate" style={{ color: "var(--color-slush-ink-muted)" }}>
                      {t.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${usd.toFixed(2)}</div>
                    <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
                      {bal.toFixed(Math.min(t.decimals, 6)).replace(/\.?0+$/, "") || "0"} {t.symbol}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
