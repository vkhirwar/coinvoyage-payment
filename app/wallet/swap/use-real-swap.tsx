"use client";

/**
 * Custom hook for the real EVM-source swap execution path.
 *
 * Encapsulates the data → sign → poll lifecycle so the swap page stays
 * concerned with UX. Only callable from a "use client" component because it
 * uses CoinVoyage's `usePrepareTransaction`/`useAccount` hooks which need
 * the WagmiProvider that mounts client-side.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePrepareTransaction } from "@coin-voyage/crypto/hooks";
import { ChainType } from "@coin-voyage/shared/types";
import {
  TERMINAL_STATUSES,
  buildSwapIntent,
  fetchOrderStatus,
  fetchSwapData,
  statusToExecutionState,
  type SwapExecutionState,
} from "@/lib/wallet/swap/execute";
import type { Token } from "@/lib/wallet/swap/tokens";

const POLL_INTERVAL_MS = 4_000;

export function useRealSwap(apiKey: string) {
  const { account } = useAccount({ chainType: ChainType.EVM, selectedWallet: undefined });
  const preparedTx = usePrepareTransaction(ChainType.EVM);

  const [state, setState] = useState<SwapExecutionState>({ status: "preparing" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startPolling = useCallback(
    (payorderId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        const order = await fetchOrderStatus(apiKey, payorderId);
        if (!order?.status) return;
        setState((prev) => ({ ...prev, status: statusToExecutionState(order.status) }));
        if (TERMINAL_STATUSES.has(order.status)) stopPolling();
      }, POLL_INTERVAL_MS);
    },
    [apiKey, stopPolling],
  );

  const start = useCallback(
    async (from: Token, to: Token, amount: string) => {
      if (!account?.address) {
        setState({ status: "failed", error: "EVM wallet not connected" });
        return;
      }
      if (!preparedTx) {
        setState({ status: "failed", error: "Transaction preparation unavailable" });
        return;
      }

      setState({ status: "preparing" });

      const intent = buildSwapIntent({
        from,
        to,
        amount,
        senderAddress: account.address,
      });

      const order = await fetchSwapData(apiKey, intent, account.address);
      if (!order || !order.payorder_id) {
        setState({ status: "failed", error: "Could not create swap order" });
        return;
      }

      const payment = order.data as
        | {
            deposit_address?: string;
            src?: { chain_id?: number; address?: string; decimals?: number; total?: { raw_amount?: string }; currency_amount?: { raw_amount?: string } };
            steps?: Array<{ kind?: string; data?: { crypto?: unknown } }>;
          }
        | undefined;

      const txStep = payment?.steps?.find((s) => s.kind === "transaction" && s.data?.crypto);

      setState({ status: "awaiting_signature", payorderId: order.payorder_id });
      startPolling(order.payorder_id);

      try {
        let hash: string | undefined;
        if (txStep?.data?.crypto) {
          hash = await preparedTx.execute({
            from: account.address,
            paymentData: txStep.data.crypto as Parameters<typeof preparedTx.execute>[0]["paymentData"],
          });
        } else if (payment?.deposit_address && payment.src) {
          const isNative = !payment.src.address;
          const rawAmount = payment.src.total?.raw_amount ?? payment.src.currency_amount?.raw_amount ?? "0";
          hash = await preparedTx.execute({
            from: account.address,
            to: payment.deposit_address as `0x${string}`,
            amount: BigInt(rawAmount),
            chainId: payment.src.chain_id!,
            ...(!isNative && payment.src.address
              ? { token: { address: payment.src.address as `0x${string}`, decimals: payment.src.decimals! } }
              : {}),
          });
        } else {
          setState({ status: "failed", error: "Order has no executable step", payorderId: order.payorder_id });
          stopPolling();
          return;
        }
        setState((prev) => ({ ...prev, status: "broadcasting", txHash: hash }));
      } catch (e) {
        setState({
          status: "failed",
          error: e instanceof Error ? e.message : "Transaction failed",
          payorderId: order.payorder_id,
        });
        stopPolling();
      }
    },
    [account?.address, apiKey, preparedTx, startPolling, stopPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({ status: "preparing" });
  }, [stopPolling]);

  return { state, start, reset, evmAddress: account?.address ?? null };
}
