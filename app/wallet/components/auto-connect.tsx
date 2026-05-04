"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { useWalletReady } from "@/app/providers";

/**
 * Mounted in the wallet layout so the Slush derived-key connector is
 * "connected" automatically — useAccount({ chainType: EVM }) returns our
 * derived address without the user clicking a Connect button.
 *
 * Gates on `useWalletReady()` (the parent providers' mount flag) — that's
 * the same flag that gates `<WagmiProvider>`, so by the time `ready === true`
 * the wagmi context is guaranteed to be available. A local useState/useEffect
 * mount check would race against the parent's `setTimeout(setMounted, 100)`.
 */
export function AutoConnect() {
  const ready = useWalletReady();
  if (!ready) return null;
  return <AutoConnectInner />;
}

function AutoConnectInner() {
  const { connect, connectors } = useConnect();
  const { isConnected, connector: activeConnector } = useAccount();

  useEffect(() => {
    if (isConnected && activeConnector?.id === "slushDerived") return;
    const slush = connectors.find((c) => c.id === "slushDerived");
    if (!slush) return;
    connect({ connector: slush });
  }, [isConnected, activeConnector, connectors, connect]);

  return null;
}
