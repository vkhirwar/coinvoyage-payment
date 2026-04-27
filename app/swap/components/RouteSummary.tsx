"use client";

import { useEffect, useRef, useState } from "react";
import { VS } from "./theme";

type Props = {
  // Quote payload (the `.data` shape from /api/swap action: "quote").
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quote: any | null;
  isLoading: boolean;
  isStale: boolean;
  // Tickers for the rate label "1 USDC = 0.99 USDT".
  srcTicker: string;
  dstTicker: string;
  // Slippage in basis points (e.g. 100 = 1%).
  slippageBps: number;
  // Optional callbacks. If onSlippageChange is provided, the slippage chip
  // becomes editable via a small popover.
  onSlippageChange?: (bps: number) => void;
  // Auto-refresh countdown — display only. Null when no countdown is wanted.
  secondsUntilRefresh?: number | null;
  // Manual refresh trigger.
  onRefresh?: () => void;
};

const SLIPPAGE_PRESETS = [50, 100, 200, 500] as const;

function formatRate(quote: { input?: { currency_amount?: { ui_amount?: number } }; output?: { currency_amount?: { ui_amount?: number } } } | null): string | null {
  const inAmt = quote?.input?.currency_amount?.ui_amount;
  const outAmt = quote?.output?.currency_amount?.ui_amount;
  if (!inAmt || !outAmt) return null;
  const rate = outAmt / inAmt;
  if (rate < 0.0001) return rate.toExponential(3);
  if (rate < 1) return rate.toFixed(4);
  if (rate < 1000) return rate.toFixed(4);
  return rate.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatUsd(n: number | undefined): string {
  if (n == null) return "—";
  if (n < 0.01 && n > 0) return "<$0.01";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RouteSummary({
  quote,
  isLoading,
  isStale,
  srcTicker,
  dstTicker,
  slippageBps,
  onSlippageChange,
  secondsUntilRefresh,
  onRefresh,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [slippageOpen, setSlippageOpen] = useState(false);
  const [customSlippage, setCustomSlippage] = useState("");
  const slippageRef = useRef<HTMLDivElement>(null);

  // Close slippage popover on outside click & Esc.
  useEffect(() => {
    if (!slippageOpen) return;
    const onClick = (e: MouseEvent) => {
      if (slippageRef.current && !slippageRef.current.contains(e.target as Node)) {
        setSlippageOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSlippageOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [slippageOpen]);

  if (!quote && !isLoading) return null;

  const rate = formatRate(quote);
  const priceImpact: number | undefined =
    typeof quote?.price_impact === "number" ? quote.price_impact : undefined;
  const networkFee: number | undefined =
    quote?.input?.fees?.total_fee?.value_usd ?? quote?.input?.gas?.value_usd;
  const estimatedSeconds: number | undefined = quote?.estimated_time_seconds;

  const impactColor =
    priceImpact === undefined
      ? VS.text
      : Math.abs(priceImpact) > 5
        ? VS.danger
        : Math.abs(priceImpact) > 2
          ? VS.warning
          : VS.success;

  return (
    <div
      style={{
        margin: "0 24px 16px",
        padding: "12px 14px",
        background: VS.surface2,
        border: `1px solid ${VS.border}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        opacity: isStale ? 0.7 : 1,
        transition: "opacity 200ms ease",
      }}
    >
      {/* Slippage row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: VS.textMuted,
          padding: "4px 2px",
        }}
      >
        <span>Max Slippage</span>
        <div ref={slippageRef} style={{ position: "relative" }}>
          <button
            onClick={() => onSlippageChange && setSlippageOpen((o) => !o)}
            disabled={!onSlippageChange}
            style={{
              background: "transparent",
              border: `1px solid ${VS.border}`,
              borderRadius: 999,
              color: VS.text,
              fontSize: 12,
              fontWeight: 600,
              padding: "3px 10px",
              cursor: onSlippageChange ? "pointer" : "default",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: VS.textDim, marginRight: 4 }}>Auto</span>
            {(slippageBps / 100).toFixed(2)}%
          </button>
          {slippageOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: VS.surface,
                border: `1px solid ${VS.borderStrong}`,
                borderRadius: 12,
                padding: 10,
                minWidth: 220,
                boxShadow: "0 12px 32px -12px rgba(0,0,0,0.4)",
                zIndex: 20,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  color: VS.textDim,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Slippage tolerance
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {SLIPPAGE_PRESETS.map((bps) => {
                  const active = bps === slippageBps;
                  return (
                    <button
                      key={bps}
                      onClick={() => {
                        onSlippageChange?.(bps);
                        setSlippageOpen(false);
                      }}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1px solid ${active ? VS.borderStrong : VS.border}`,
                        borderRadius: 8,
                        background: active ? VS.gradientSoft : "transparent",
                        color: active ? VS.text : VS.textMuted,
                        cursor: "pointer",
                      }}
                    >
                      {(bps / 100).toFixed(2)}%
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  placeholder="Custom %"
                  value={customSlippage}
                  onChange={(e) => setCustomSlippage(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    fontSize: 12,
                    background: VS.surface2,
                    border: `1px solid ${VS.border}`,
                    borderRadius: 8,
                    color: VS.text,
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => {
                    const v = parseFloat(customSlippage);
                    if (!isNaN(v) && v > 0 && v <= 50) {
                      onSlippageChange?.(Math.round(v * 100));
                      setSlippageOpen(false);
                      setCustomSlippage("");
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    background: VS.gradient,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate / expand row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          background: "transparent",
          border: "none",
          padding: "8px 2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          color: VS.text,
          width: "100%",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {rate ? `1 ${srcTicker} = ${rate} ${dstTicker}` : isLoading ? "Fetching quote…" : "—"}
          {isStale && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(245,165,36,0.12)",
                color: VS.warning,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Stale
            </span>
          )}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onRefresh && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onRefresh();
                }
              }}
              title="Refresh quote"
              style={{
                color: VS.textMuted,
                fontSize: 14,
                cursor: "pointer",
                padding: "2px 4px",
              }}
            >
              ↻
            </span>
          )}
          {typeof secondsUntilRefresh === "number" && secondsUntilRefresh > 0 && (
            <span
              style={{
                fontSize: 11,
                color: VS.textDim,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {secondsUntilRefresh}s
            </span>
          )}
          <span
            style={{
              color: VS.textMuted,
              transition: "transform 200ms ease",
              transform: expanded ? "rotate(180deg)" : "rotate(0)",
              fontSize: 12,
            }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            paddingTop: 6,
            borderTop: `1px solid ${VS.border}`,
            marginTop: 4,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 12,
          }}
        >
          <DetailRow
            label="Estimated time"
            value={
              estimatedSeconds != null
                ? `${formatDuration(estimatedSeconds)}`
                : "Varies by route"
            }
            valueColor={VS.text}
          />
          <DetailRow
            label="Network cost"
            value={formatUsd(networkFee)}
            valueColor={VS.text}
          />
          {priceImpact !== undefined && (
            <DetailRow
              label="Price Impact"
              value={`${priceImpact.toFixed(2)}%`}
              valueColor={impactColor}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 2px" }}>
      <span style={{ color: VS.textMuted }}>{label}</span>
      <span style={{ color: valueColor, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  return `~${m}m`;
}
