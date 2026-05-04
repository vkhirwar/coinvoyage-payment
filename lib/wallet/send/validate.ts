import { isAddress as isEvmAddress } from "viem";
import { isValidSuiAddress } from "@mysten/sui/utils";
import type { ChainKey } from "../core/types";

const BTC_BECH32 = /^bc1[ac-hj-np-z02-9]{25,87}$/i;
const BTC_LEGACY = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const SOL_BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function validateAddress(chain: ChainKey, address: string): { valid: boolean; reason?: string } {
  const trimmed = address.trim();
  if (!trimmed) return { valid: false, reason: "Address required" };

  switch (chain) {
    case "sui":
      return isValidSuiAddress(trimmed) ? { valid: true } : { valid: false, reason: "Not a valid Sui address" };
    case "btc":
      if (BTC_BECH32.test(trimmed) || BTC_LEGACY.test(trimmed)) return { valid: true };
      return { valid: false, reason: "Not a valid Bitcoin address" };
    case "sol":
      if (SOL_BASE58.test(trimmed)) return { valid: true };
      return { valid: false, reason: "Not a valid Solana address" };
    case "eth":
    case "arb":
    case "base":
    case "op":
    case "polygon":
    case "bsc":
      return isEvmAddress(trimmed) ? { valid: true } : { valid: false, reason: "Not a valid 0x address" };
  }
}
