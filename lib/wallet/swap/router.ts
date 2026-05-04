import { findToken, type Token } from "./tokens";

export interface SwapQuote {
  from: Token;
  to: Token;
  amountIn: number;
  amountOut: number;
  rate: number;
  feeUsd: number;
  estimatedSeconds: number;
  protocol: string; // human-readable route description
  priceImpactPct: number;
  isCrossChain: boolean;
  /** "live" if quoted against the CoinVoyage backend, "mock" if computed locally. */
  source: "mock" | "live";
}

// Per-route fee + time + protocol metadata. For chains that share a kind
// we route via a sensible bridge protocol; the values are realistic enough
// that pitch reviewers won't blink, low enough fidelity that we don't need
// a real liquidity oracle.
function routeMeta(from: Token, to: Token): { feeBps: number; seconds: number; protocol: string; isCrossChain: boolean } {
  if (from.chain === to.chain) {
    return { feeBps: 30, seconds: 6, protocol: `${chainLabel(from.chain)} DEX aggregator`, isCrossChain: false };
  }
  if (from.chain === "btc" || to.chain === "btc") {
    return {
      feeBps: 80,
      seconds: 240,
      protocol: from.chain === "btc" ? "Thorchain → Wormhole" : "Wormhole → Thorchain",
      isCrossChain: true,
    };
  }
  if (from.chain === "sui" || to.chain === "sui") {
    return { feeBps: 60, seconds: 90, protocol: "Wormhole NTT", isCrossChain: true };
  }
  if (from.chain === "sol" || to.chain === "sol") {
    return { feeBps: 50, seconds: 60, protocol: "Mayan Swift", isCrossChain: true };
  }
  // EVM ↔ EVM
  return { feeBps: 35, seconds: 45, protocol: "Across Protocol", isCrossChain: true };
}

function chainLabel(c: string): string {
  return { sui: "Sui", btc: "Bitcoin", sol: "Solana", eth: "Ethereum", arb: "Arbitrum", base: "Base", op: "Optimism", polygon: "Polygon", bsc: "BNB Chain" }[c] ?? c;
}

export function quoteSwap(fromId: string, toId: string, amountIn: number): SwapQuote | null {
  const from = findToken(fromId);
  const to = findToken(toId);
  if (!from || !to || from.id === to.id || amountIn <= 0) return null;

  const usdValueIn = amountIn * from.priceUsd;
  const meta = routeMeta(from, to);
  const feeUsd = (usdValueIn * meta.feeBps) / 10_000;
  const usdValueOut = usdValueIn - feeUsd;
  const amountOut = usdValueOut / to.priceUsd;
  const rate = amountIn === 0 ? 0 : amountOut / amountIn;

  return {
    from,
    to,
    amountIn,
    amountOut,
    rate,
    feeUsd,
    estimatedSeconds: meta.seconds,
    protocol: meta.protocol,
    priceImpactPct: 0.04 + Math.random() * 0.04, // demo only — would come from real router
    isCrossChain: meta.isCrossChain,
    source: "mock",
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)} min`;
  return `~${(seconds / 3600).toFixed(1)} h`;
}
