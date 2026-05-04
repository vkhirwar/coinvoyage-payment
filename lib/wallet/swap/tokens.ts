import type { ChainKey } from "../core/types";

export interface Token {
  id: string;
  symbol: string;
  name: string;
  chain: ChainKey;
  decimals: number;
  isNative?: boolean;
  priceUsd: number;
  /** CoinVoyage chain ID (matches @coin-voyage/shared `ChainId` enum). */
  cvChainId: number;
  /** Token contract address (undefined for native gas tokens). */
  contract?: string;
}

// CV chain IDs from `@coin-voyage/shared/types` `ChainId` enum.
export const CV_CHAIN_ID: Record<ChainKey, number> = {
  sui: 30000000000002,
  btc: 20000000000001,
  sol: 30000000000001,
  eth: 1,
  arb: 42161,
  base: 8453,
  op: 10,
  polygon: 137,
  bsc: 56,
};

export const TOKENS: Token[] = [
  // Sui
  { id: "sui-sui", symbol: "SUI", name: "Sui", chain: "sui", decimals: 9, isNative: true, priceUsd: 0.91, cvChainId: CV_CHAIN_ID.sui },
  { id: "sui-usdc", symbol: "USDC", name: "USD Coin", chain: "sui", decimals: 6, priceUsd: 1.0, cvChainId: CV_CHAIN_ID.sui, contract: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC" },
  { id: "sui-deep", symbol: "DEEP", name: "DeepBook", chain: "sui", decimals: 6, priceUsd: 0.0274, cvChainId: CV_CHAIN_ID.sui },
  // Bitcoin
  { id: "btc-btc", symbol: "BTC", name: "Bitcoin", chain: "btc", decimals: 8, isNative: true, priceUsd: 71450, cvChainId: CV_CHAIN_ID.btc },
  // Solana
  { id: "sol-sol", symbol: "SOL", name: "Solana", chain: "sol", decimals: 9, isNative: true, priceUsd: 167.4, cvChainId: CV_CHAIN_ID.sol },
  { id: "sol-usdc", symbol: "USDC", name: "USD Coin", chain: "sol", decimals: 6, priceUsd: 1.0, cvChainId: CV_CHAIN_ID.sol, contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  // Ethereum
  { id: "eth-eth", symbol: "ETH", name: "Ether", chain: "eth", decimals: 18, isNative: true, priceUsd: 3450, cvChainId: CV_CHAIN_ID.eth },
  { id: "eth-usdc", symbol: "USDC", name: "USD Coin", chain: "eth", decimals: 6, priceUsd: 1.0, cvChainId: CV_CHAIN_ID.eth, contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  // Arbitrum
  { id: "arb-eth", symbol: "ETH", name: "Ether (Arbitrum)", chain: "arb", decimals: 18, isNative: true, priceUsd: 3450, cvChainId: CV_CHAIN_ID.arb },
  { id: "arb-usdc", symbol: "USDC", name: "USD Coin", chain: "arb", decimals: 6, priceUsd: 1.0, cvChainId: CV_CHAIN_ID.arb, contract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  // Base
  { id: "base-eth", symbol: "ETH", name: "Ether (Base)", chain: "base", decimals: 18, isNative: true, priceUsd: 3450, cvChainId: CV_CHAIN_ID.base },
  { id: "base-usdc", symbol: "USDC", name: "USD Coin", chain: "base", decimals: 6, priceUsd: 1.0, cvChainId: CV_CHAIN_ID.base, contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  // Optimism
  { id: "op-eth", symbol: "ETH", name: "Ether (OP)", chain: "op", decimals: 18, isNative: true, priceUsd: 3450, cvChainId: CV_CHAIN_ID.op },
  { id: "op-usdc", symbol: "USDC", name: "USD Coin", chain: "op", decimals: 6, priceUsd: 1.0, cvChainId: CV_CHAIN_ID.op, contract: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" },
  // Polygon
  { id: "polygon-pol", symbol: "POL", name: "Polygon", chain: "polygon", decimals: 18, isNative: true, priceUsd: 0.42, cvChainId: CV_CHAIN_ID.polygon },
  { id: "polygon-usdc", symbol: "USDC", name: "USD Coin", chain: "polygon", decimals: 6, priceUsd: 1.0, cvChainId: CV_CHAIN_ID.polygon, contract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" },
  // BSC
  { id: "bsc-bnb", symbol: "BNB", name: "BNB", chain: "bsc", decimals: 18, isNative: true, priceUsd: 632, cvChainId: CV_CHAIN_ID.bsc },
  { id: "bsc-usdc", symbol: "USDC", name: "USD Coin", chain: "bsc", decimals: 6, priceUsd: 1.0, cvChainId: CV_CHAIN_ID.bsc, contract: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" },
];

export function tokensForChain(chain: ChainKey): Token[] {
  return TOKENS.filter((t) => t.chain === chain);
}

export function findToken(id: string): Token | undefined {
  return TOKENS.find((t) => t.id === id);
}

// Demo balances — what the connected wallet "holds" for the prototype.
// Pinned so screenshots / pitch demos are reproducible.
export const DEMO_BALANCES: Record<string, number> = {
  "sui-sui": 6.47,
  "sui-usdc": 0.31,
  "sui-deep": 220.48,
  "btc-btc": 0.00006,
  "sol-sol": 0.5,
  "sol-usdc": 0,
  "eth-eth": 0.0012,
  "eth-usdc": 26.26,
  "arb-eth": 0.0008,
  "arb-usdc": 51.8,
  "base-eth": 0.001,
  "base-usdc": 20.58,
  "op-eth": 0.0005,
  "op-usdc": 0,
  "polygon-pol": 79.06,
  "polygon-usdc": 0,
  "bsc-bnb": 0.00266,
  "bsc-usdc": 0,
};

export function balanceOf(id: string): number {
  return DEMO_BALANCES[id] ?? 0;
}
