/**
 * Real-execution path for the wallet's swap flow.
 *
 * Wired only when source token is EVM AND `NEXT_PUBLIC_SLUSH_REAL_EXECUTION`
 * is "true" — keeps accidental clicks from broadcasting real transactions
 * during a routine UX poke. The pitch demo flips the flag on.
 *
 * Flow mirrors the existing /swap (Vaporswap) product:
 *   1. POST /api/swap action=data → returns payorder_id + deposit_address
 *      (or a calldata transaction step)
 *   2. preparedTx.execute(...) signs+broadcasts via the Slush derived
 *      connector
 *   3. POST /api/sale action=status (poll) → status transitions
 *      AWAITING_PAYMENT → EXECUTING_ORDER → COMPLETED
 */

import type { Token } from "./tokens";

export type SwapExecutionStatus =
  | "preparing"
  | "awaiting_signature"
  | "broadcasting"
  | "awaiting_confirmation"
  | "executing"
  | "completed"
  | "failed";

export interface SwapExecutionState {
  status: SwapExecutionStatus;
  payorderId?: string;
  txHash?: string;
  destinationTxHash?: string;
  error?: string;
}

export const REAL_EXECUTION_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SLUSH_REAL_EXECUTION === "true";

interface BuildIntentArgs {
  from: Token;
  to: Token;
  amount: string;
  senderAddress: string;
  slippageBps?: number;
}

export function buildSwapIntent({ from, to, amount, senderAddress, slippageBps = 100 }: BuildIntentArgs) {
  return {
    amount,
    destination_currency: {
      chain_id: to.cvChainId,
      ...(to.contract ? { address: to.contract } : {}),
    },
    payment_rail: "CRYPTO",
    swap_mode: "ExactIn",
    crypto: {
      sender_address: senderAddress,
      slippage_bps: slippageBps,
      source_currency: {
        chain_id: from.cvChainId,
        ...(from.contract ? { address: from.contract } : {}),
      },
    },
  };
}

export async function fetchSwapData(
  apiKey: string,
  intent: ReturnType<typeof buildSwapIntent>,
  receivingAddress: string,
): Promise<{ payorder_id?: string; data?: Record<string, unknown>; status?: string } | null> {
  const res = await fetch("/api/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "data",
      apiKey,
      intent,
      receiving_address: receivingAddress,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchOrderStatus(
  apiKey: string,
  payorderId: string,
): Promise<{ status?: string; payment?: Record<string, unknown> } | null> {
  const res = await fetch("/api/sale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "status",
      apiKey,
      payorder_id: payorderId,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export function statusToExecutionState(status: string | undefined): SwapExecutionStatus {
  switch (status) {
    case "PENDING":
    case "AWAITING_PAYMENT":
      return "broadcasting";
    case "AWAITING_CONFIRMATION":
    case "OPTIMISTIC_CONFIRMED":
      return "awaiting_confirmation";
    case "EXECUTING_ORDER":
      return "executing";
    case "COMPLETED":
      return "completed";
    case "FAILED":
    case "EXPIRED":
    case "REFUNDED":
      return "failed";
    default:
      return "broadcasting";
  }
}

export const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "EXPIRED", "REFUNDED"]);
