import { NextResponse } from "next/server";

// Covalent / GoldRush chain slug map for the EVM chains the swap UI supports.
const GOLDRUSH_CHAIN: Record<number, string> = {
  1: "eth-mainnet",
  10: "optimism-mainnet",
  56: "bsc-mainnet",
  137: "matic-mainnet",
  324: "zksync-mainnet",
  8453: "base-mainnet",
  42161: "arbitrum-mainnet",
  43114: "avalanche-mainnet",
  81457: "blast-mainnet",
};

export type WalletToken = {
  name: string;
  ticker: string;
  address?: string; // undefined = native
  decimals: number;
  balance: string; // raw (base units)
  uiAmount: number;
  logo?: string;
  valueUsd?: number; // Goldrush "quote" — USD value of the holding
  priceUsd?: number; // Goldrush "quote_rate" — per-token USD price
};

export async function POST(req: Request) {
  try {
    const { chainId, address } = (await req.json()) as {
      chainId: number;
      address: string;
    };

    if (!chainId || !address) {
      return NextResponse.json({ tokens: [] });
    }

    const slug = GOLDRUSH_CHAIN[chainId];
    if (!slug) {
      // Non-EVM or unsupported chain — let the client fall back to POPULAR_TOKENS.
      return NextResponse.json({ tokens: [], unsupported: true });
    }

    const key = process.env.GOLDRUSH_API_KEY;
    if (!key) {
      return NextResponse.json(
        { tokens: [], error: "GOLDRUSH_API_KEY not set" },
        { status: 200 },
      );
    }

    const url = `https://api.covalenthq.com/v1/${slug}/address/${address}/balances_v2/?no-spam=true&nft=false`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      // Balances can change quickly — don't cache hard.
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { tokens: [], error: `GoldRush ${res.status}` },
        { status: 200 },
      );
    }

    const json = (await res.json()) as {
      data?: {
        items?: Array<{
          contract_address: string;
          contract_name: string | null;
          contract_ticker_symbol: string | null;
          contract_decimals: number | null;
          native_token: boolean;
          balance: string | null;
          logo_url?: string;
          type?: string;
          quote?: number | null;       // USD value of holding
          quote_rate?: number | null;  // USD per token
        }>;
      };
    };

    const items = json.data?.items ?? [];
    const tokens: WalletToken[] = items
      .filter((it) => it.balance && it.balance !== "0" && it.contract_ticker_symbol)
      .map((it) => {
        const decimals = it.contract_decimals ?? 18;
        const raw = it.balance ?? "0";
        let uiAmount = 0;
        try {
          uiAmount = Number(BigInt(raw)) / Math.pow(10, decimals);
        } catch {
          uiAmount = 0;
        }
        return {
          name: it.contract_name || it.contract_ticker_symbol!,
          ticker: it.contract_ticker_symbol!,
          address: it.native_token ? undefined : it.contract_address,
          decimals,
          balance: raw,
          uiAmount,
          logo: it.logo_url,
          valueUsd: typeof it.quote === "number" ? it.quote : undefined,
          priceUsd: typeof it.quote_rate === "number" ? it.quote_rate : undefined,
        };
      })
      // Sort by USD value (desc) when known; fall back to raw amount.
      .sort((a, b) => {
        const va = a.valueUsd ?? 0;
        const vb = b.valueUsd ?? 0;
        if (vb !== va) return vb - va;
        return b.uiAmount - a.uiAmount;
      });

    return NextResponse.json({ tokens });
  } catch (e) {
    return NextResponse.json(
      { tokens: [], error: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    );
  }
}
