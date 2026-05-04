"use client";

import { useMemo, useState } from "react";
import { CHAINS, type ChainKey } from "@/lib/wallet/core/types";
import { TOKENS, balanceOf } from "@/lib/wallet/swap/tokens";
import { ChainGlyph } from "./chain-glyph";

export interface AssetListProps {
  showFilters?: boolean;
  hideZero?: boolean;
}

export function AssetList({ showFilters = true, hideZero = true }: AssetListProps) {
  const [chain, setChain] = useState<ChainKey | "all">("all");

  const rows = useMemo(() => {
    return TOKENS.map((t) => {
      const bal = balanceOf(t.id);
      return {
        token: t,
        balance: bal,
        usdValue: bal * t.priceUsd,
      };
    })
      .filter((r) => (hideZero ? r.balance > 0 : true))
      .filter((r) => (chain === "all" ? true : r.token.chain === chain))
      .sort((a, b) => b.usdValue - a.usdValue);
  }, [chain, hideZero]);

  return (
    <div>
      {showFilters && <ChainPills value={chain} onChange={setChain} />}

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm" style={{ color: "var(--color-slush-ink-muted)" }}>
          No assets on this chain.
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--color-slush-divider)" }}>
          {rows.map((r) => (
            <li key={r.token.id} className="flex items-center gap-3 py-3">
              <span className="relative shrink-0">
                <ChainGlyph chain={r.token.chain} size={36} />
                <span
                  className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full grid place-items-center text-[8px] font-bold"
                  style={{ background: "white", color: "var(--color-slush-ink)", boxShadow: "0 0 0 1px white" }}
                >
                  {chainShortBadge(r.token.chain)}
                </span>
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.token.symbol}</div>
                <div className="text-xs truncate" style={{ color: "var(--color-slush-ink-muted)" }}>
                  {r.token.name}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${r.usdValue.toFixed(2)}</div>
                <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
                  {r.balance.toFixed(Math.min(r.token.decimals, 6)).replace(/\.?0+$/, "")} {r.token.symbol}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PILLS: { key: ChainKey | "all"; label: string }[] = [
  { key: "all", label: "All" },
  ...CHAINS.map((c) => ({ key: c.key, label: c.shortLabel })),
];

function ChainPills({ value, onChange }: { value: ChainKey | "all"; onChange: (k: ChainKey | "all") => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
      {PILLS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className="rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap"
          style={{
            background: value === p.key ? "var(--color-slush-blue)" : "var(--color-slush-card-tint)",
            color: value === p.key ? "white" : "var(--color-slush-ink)",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function chainShortBadge(c: ChainKey): string {
  return ({ sui: "S", btc: "₿", sol: "◎", eth: "Ξ", arb: "A", base: "B", op: "O", polygon: "P", bsc: "B" } as const)[c];
}
