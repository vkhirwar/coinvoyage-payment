import type { Token } from "./tokens";
import type { SwapQuote } from "./router";

interface CvAmount {
  ui_amount?: number;
  raw_amount?: string;
  value_usd?: number;
}

interface CvCurrencyLeg {
  chain_id?: number;
  ticker?: string;
  address?: string;
  decimals?: number;
  currency_amount?: CvAmount;
  total?: CvAmount;
  fees?: { total_fee?: CvAmount; protocol_fee?: CvAmount };
  gas?: CvAmount;
}

interface CvQuoteResponse {
  input?: CvCurrencyLeg;
  output?: CvCurrencyLeg;
  swap_mode?: string;
  slippage_bps?: number;
  price_impact?: number;
  // Some routes may return upstream metadata too:
  route?: { name?: string; estimated_seconds?: number; bridge?: string; aggregator?: string };
  estimated_seconds?: number;
}

export async function fetchLiveQuote(
  from: Token,
  to: Token,
  amountIn: number,
  apiKey: string,
  senderAddress?: string,
): Promise<SwapQuote | null> {
  if (!apiKey || amountIn <= 0) return null;

  const intent = {
    amount: String(amountIn),
    destination_currency: {
      chain_id: to.cvChainId,
      ...(to.contract ? { address: to.contract } : {}),
    },
    payment_rail: "CRYPTO",
    swap_mode: "ExactIn",
    crypto: {
      ...(senderAddress ? { sender_address: senderAddress } : {}),
      slippage_bps: 100,
      source_currency: {
        chain_id: from.cvChainId,
        ...(from.contract ? { address: from.contract } : {}),
      },
    },
  };

  let res: Response;
  try {
    res = await fetch("/api/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "quote", apiKey, intent }),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: CvQuoteResponse;
  try {
    data = await res.json();
  } catch {
    return null;
  }

  const amountOut = data.output?.currency_amount?.ui_amount;
  if (!amountOut || amountOut <= 0) return null;

  const feeUsd =
    (data.input?.fees?.total_fee?.value_usd ?? 0) + (data.input?.gas?.value_usd ?? 0);
  const priceImpactPct =
    typeof data.price_impact === "number"
      ? data.price_impact * 100 // CV returns 0..1
      : 0;

  const isCrossChain = from.cvChainId !== to.cvChainId;
  const protocol =
    data.route?.bridge ||
    data.route?.aggregator ||
    data.route?.name ||
    (isCrossChain ? "CoinVoyage cross-chain route" : "CoinVoyage DEX aggregator");

  return {
    from,
    to,
    amountIn,
    amountOut,
    rate: amountOut / amountIn,
    feeUsd,
    estimatedSeconds: data.route?.estimated_seconds ?? data.estimated_seconds ?? (isCrossChain ? 90 : 6),
    protocol,
    priceImpactPct,
    isCrossChain,
    source: "live",
  };
}
