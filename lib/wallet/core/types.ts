export type ChainKey =
  | "sui"
  | "btc"
  | "sol"
  | "eth"
  | "arb"
  | "base"
  | "op"
  | "polygon"
  | "bsc";

export type ChainKind = "sui" | "btc" | "sol" | "evm";

export interface ChainMeta {
  key: ChainKey;
  kind: ChainKind;
  label: string;
  shortLabel: string;
  evmChainId?: number;
}

export const CHAINS: ChainMeta[] = [
  { key: "sui", kind: "sui", label: "Sui", shortLabel: "SUI" },
  { key: "btc", kind: "btc", label: "Bitcoin", shortLabel: "BTC" },
  { key: "sol", kind: "sol", label: "Solana", shortLabel: "SOL" },
  { key: "eth", kind: "evm", label: "Ethereum", shortLabel: "ETH", evmChainId: 1 },
  { key: "arb", kind: "evm", label: "Arbitrum", shortLabel: "ARB", evmChainId: 42161 },
  { key: "base", kind: "evm", label: "Base", shortLabel: "BASE", evmChainId: 8453 },
  { key: "op", kind: "evm", label: "Optimism", shortLabel: "OP", evmChainId: 10 },
  { key: "polygon", kind: "evm", label: "Polygon", shortLabel: "POL", evmChainId: 137 },
  { key: "bsc", kind: "evm", label: "BNB Chain", shortLabel: "BSC", evmChainId: 56 },
];

export interface DerivedAddress {
  chain: ChainMeta;
  address: string;
  derivationPath: string;
}
