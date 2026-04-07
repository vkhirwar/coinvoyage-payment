"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useApiKeys, useWalletReady } from "../providers";
import { useAccount, usePrepareTransaction, useInstalledWallets, useUniversalConnect } from "@coin-voyage/crypto/hooks";
import { ChainType } from "@coin-voyage/shared/types";
import { useSwitchChain } from "wagmi";

// Chain definitions with display info
const CHAINS = [
  { id: 1, name: "Ethereum", ticker: "ETH", icon: "⟠" },
  { id: 10, name: "Optimism", ticker: "OP", icon: "🔴" },
  { id: 56, name: "BNB Chain", ticker: "BNB", icon: "🔶" },
  { id: 137, name: "Polygon", ticker: "POL", icon: "🟣" },
  { id: 324, name: "zkSync", ticker: "ZK", icon: "◆" },
  { id: 8453, name: "Base", ticker: "BASE", icon: "🔵" },
  { id: 42161, name: "Arbitrum", ticker: "ARB", icon: "🔷" },
  { id: 43114, name: "Avalanche", ticker: "AVAX", icon: "🔺" },
  { id: 81457, name: "Blast", ticker: "BLAST", icon: "⚡" },
  { id: 30000000000001, name: "Solana", ticker: "SOL", icon: "◎" },
  { id: 30000000000002, name: "Sui", ticker: "SUI", icon: "💧" },
  { id: 20000000000001, name: "Bitcoin", ticker: "BTC", icon: "₿" },
  { id: 30000000000003, name: "Tron", ticker: "TRX", icon: "♦" },
] as const;

// Common tokens per chain (address undefined = native token)
const POPULAR_TOKENS: Record<
  number,
  { name: string; ticker: string; address?: string }[]
> = {
  1: [
    { name: "Ethereum", ticker: "ETH" },
    { name: "USDC", ticker: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { name: "USDT", ticker: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
    { name: "WBTC", ticker: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
    { name: "DAI", ticker: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
  ],
  10: [
    { name: "Ethereum", ticker: "ETH" },
    { name: "USDC", ticker: "USDC", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" },
    { name: "USDT", ticker: "USDT", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" },
  ],
  56: [
    { name: "BNB", ticker: "BNB" },
    { name: "USDC", ticker: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" },
    { name: "USDT", ticker: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" },
  ],
  137: [
    { name: "POL", ticker: "POL" },
    { name: "USDC", ticker: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" },
    { name: "USDT", ticker: "USDT", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" },
  ],
  324: [
    { name: "Ethereum", ticker: "ETH" },
    { name: "USDC", ticker: "USDC", address: "0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4" },
  ],
  8453: [
    { name: "Ethereum", ticker: "ETH" },
    { name: "USDC", ticker: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    { name: "USDbC", ticker: "USDbC", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" },
  ],
  42161: [
    { name: "Ethereum", ticker: "ETH" },
    { name: "USDC", ticker: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
    { name: "USDT", ticker: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
    { name: "ARB", ticker: "ARB", address: "0x912CE59144191C1204E64559FE8253a0e49E6548" },
  ],
  43114: [
    { name: "AVAX", ticker: "AVAX" },
    { name: "USDC", ticker: "USDC", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" },
    { name: "USDT", ticker: "USDT", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7" },
  ],
  81457: [
    { name: "Ethereum", ticker: "ETH" },
    { name: "USDB", ticker: "USDB", address: "0x4300000000000000000000000000000000000003" },
  ],
  30000000000001: [
    { name: "Solana", ticker: "SOL" },
    { name: "USDC", ticker: "USDC", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  ],
  30000000000002: [
    { name: "Sui", ticker: "SUI" },
    { name: "USDC", ticker: "USDC", address: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC" },
  ],
  20000000000001: [{ name: "Bitcoin", ticker: "BTC" }],
  30000000000003: [
    { name: "Tron", ticker: "TRX" },
    { name: "USDT", ticker: "USDT", address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
  ],
};

type SwapMode = "ExactIn" | "ExactOut";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuoteResponse = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SwapDataResponse = any;

type DebugEntry = {
  id: number;
  time: string;
  type: "request" | "response" | "error" | "info";
  label: string;
  data: unknown;
};

let debugId = 0;

async function apiCall(
  endpoint: string,
  body: Record<string, unknown>,
  addLog: (type: DebugEntry["type"], label: string, data: unknown) => void
) {
  const { action, ...rest } = body;
  addLog("request", `POST ${endpoint} [${action}]`, rest);

  const start = performance.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const elapsed = Math.round(performance.now() - start);
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    addLog("error", `Response parse failed (${res.status}, ${elapsed}ms)`, text);
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    addLog("error", `${res.status} Error (${elapsed}ms)`, data);
    throw new Error(data.error as string || data.message as string || `Request failed (${res.status})`);
  }

  if (data.error || data.message) {
    addLog("error", `API Error (${elapsed}ms)`, data);
    throw new Error(data.error as string || data.message as string);
  }

  addLog("response", `${res.status} OK (${elapsed}ms)`, data);
  return data;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  AWAITING_PAYMENT: "#3b82f6",
  OPTIMISTIC_CONFIRMED: "#22c55e",
  AWAITING_CONFIRMATION: "#8b5cf6",
  EXECUTING_ORDER: "#8b5cf6",
  COMPLETED: "#22c55e",
  FAILED: "#ef4444",
  EXPIRED: "#6b7280",
  REFUNDED: "#f59e0b",
};

function formatUsd(val: number | undefined): string {
  if (val === undefined || val === null) return "$0.00";
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmount(val: string | number | undefined): string {
  if (!val) return "0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (n < 0.0001) return n.toExponential(4);
  if (n < 1) return n.toFixed(6);
  if (n < 1000) return n.toFixed(4);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function isCrossChain(srcChainId: number, dstChainId: number): boolean {
  return srcChainId !== dstChainId;
}

function getChainType(chainId: number): ChainType {
  if (chainId === 30000000000001) return ChainType.SOL;
  if (chainId === 30000000000002) return ChainType.SUI;
  if (chainId === 20000000000001) return ChainType.UTXO;
  return ChainType.EVM;
}

export default function SwapContent() {
  const walletReady = useWalletReady();

  if (!walletReady) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#666", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  return <SwapContentInner />;
}

function SwapContentInner() {
  const { apiKey } = useApiKeys();

  // Source chain
  const [srcChainId, setSrcChainId] = useState<number>(8453);
  const [srcTokenIdx, setSrcTokenIdx] = useState<number>(1); // USDC on Base
  const [amount, setAmount] = useState("");

  // Destination chain
  const [dstChainId, setDstChainId] = useState<number>(8453);
  const [dstTokenIdx, setDstTokenIdx] = useState<number>(0); // ETH on Base

  // Chain types
  const srcChainType = getChainType(srcChainId);
  const dstChainType = getChainType(dstChainId);
  const isCrossType = srcChainType !== dstChainType;

  // Wallets — separate source (sending) and destination (receiving)
  const { account: srcAccount } = useAccount({ chainType: srcChainType, selectedWallet: undefined });
  const { account: dstAccount } = useAccount({ chainType: dstChainType, selectedWallet: undefined });
  const srcWallets = useInstalledWallets(srcChainType);
  const dstWallets = useInstalledWallets(dstChainType);
  const { connect } = useUniversalConnect({
    onError: (err) => setError(err?.message || "Wallet connection failed"),
  });
  const { switchChainAsync } = useSwitchChain();
  const [showWalletPicker, setShowWalletPicker] = useState<"source" | "dest" | null>(null);

  // Settings
  const [swapMode, setSwapMode] = useState<SwapMode>("ExactIn");
  const [slippageBps, setSlippageBps] = useState<number>(100);
  const [receivingAddressManual, setReceivingAddressManual] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Destination address state — always explicit, never auto-filled from source
  const [dstAddress, setDstAddress] = useState("");
  const [pendingDstCapture, setPendingDstCapture] = useState(false);
  const receivingAddress = receivingAddressManual || dstAddress || "";

  // Capture destination wallet address after connection
  useEffect(() => {
    if (pendingDstCapture && dstAccount?.isConnected && dstAccount.address) {
      setDstAddress(dstAccount.address);
      setPendingDstCapture(false);
    }
  }, [pendingDstCapture, dstAccount?.isConnected, dstAccount?.address]);

  // State
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [swapData, setSwapData] = useState<SwapDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"configure" | "review" | "execute">("configure");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wallet TX execution (source chain)
  const preparedTx = usePrepareTransaction(srcChainType);

  // Debug
  const [debugLogs, setDebugLogs] = useState<DebugEntry[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const debugRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: DebugEntry["type"], label: string, data: unknown) => {
    const entry: DebugEntry = {
      id: ++debugId,
      time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions),
      type,
      label,
      data,
    };
    setDebugLogs((prev) => [...prev.slice(-50), entry]);
    setTimeout(() => debugRef.current?.scrollTo({ top: debugRef.current.scrollHeight, behavior: "smooth" }), 50);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const pollOrderStatus = useCallback((orderId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const data = await apiCall("/api/sale", {
          action: "status",
          apiKey,
          payorder_id: orderId,
        }, addLog);
        if (data.status) {
          setSwapData((prev: SwapDataResponse) => prev ? { ...prev, status: data.status } : prev);
          if (["COMPLETED", "FAILED", "EXPIRED", "REFUNDED"].includes(data.status as string)) {
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch {
        // Silently continue polling
      }
    }, 5000);
  }, [apiKey, addLog]);

  const srcTokens = POPULAR_TOKENS[srcChainId] || [];
  const dstTokens = POPULAR_TOKENS[dstChainId] || [];
  const srcToken = srcTokens[srcTokenIdx] || srcTokens[0];
  const dstToken = dstTokens[dstTokenIdx] || dstTokens[0];
  const crossChain = isCrossChain(srcChainId, dstChainId);

  const buildIntent = useCallback(() => {
    return {
      amount: amount,
      destination_currency: {
        chain_id: dstChainId,
        ...(dstToken?.address ? { address: dstToken.address } : {}),
      },
      payment_rail: "CRYPTO",
      swap_mode: swapMode,
      crypto: {
        sender_address: srcAccount?.address || undefined,
        slippage_bps: slippageBps,
        source_currency: {
          chain_id: srcChainId,
          ...(srcToken?.address ? { address: srcToken.address } : {}),
        },
      },
    };
  }, [srcChainId, srcToken, dstChainId, dstToken, amount, swapMode, slippageBps, srcAccount?.address]);

  const handleSwapDirection = () => {
    setSrcChainId(dstChainId);
    setDstChainId(srcChainId);
    setSrcTokenIdx(dstTokenIdx);
    setDstTokenIdx(srcTokenIdx);
    fullReset();
  };

  const getQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter an amount");
      return;
    }
    if (!apiKey) {
      setError("API key required — set it on the main page");
      return;
    }

    setLoading(true);
    setError(null);
    setQuote(null);
    addLog("info", "Getting quote...", buildIntent());

    try {
      const data = await apiCall("/api/swap", {
        action: "quote",
        apiKey,
        intent: buildIntent(),
      }, addLog);

      setQuote({ data });
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get quote");
    } finally {
      setLoading(false);
    }
  };

  const getSwapData = async () => {
    const addr = receivingAddress;
    if (!addr) {
      if (isCrossType) {
        setError(`Connect a ${dstChainType} wallet or enter a ${dstChainType} receiving address in Settings`);
      } else {
        setError("Connect wallet or enter a receiving address");
      }
      return;
    }

    setLoading(true);
    setError(null);
    addLog("info", "Getting swap data...", { receiving_address: addr });

    try {
      const data = await apiCall("/api/swap", {
        action: "data",
        apiKey,
        intent: buildIntent(),
        receiving_address: addr,
      }, addLog);

      setSwapData(data);
      setStep("execute");
      if (data.payorder_id) pollOrderStatus(data.payorder_id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get swap data");
    } finally {
      setLoading(false);
    }
  };

  const executeSwapFromWallet = async () => {
    if (!swapData?.data || !srcAccount?.address) {
      setError("Wallet not connected or swap data not ready");
      return;
    }
    if (!preparedTx) {
      setError("Transaction preparation not available for this chain");
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const paymentData = swapData.data;
      const src = paymentData.src;

      // Switch chain if needed (EVM only)
      if (srcChainType === ChainType.EVM && srcAccount.chainId !== srcChainId) {
        addLog("info", "Switching chain...", { from: srcAccount.chainId, to: srcChainId });
        try {
          await switchChainAsync({ chainId: srcChainId });
          addLog("response", "Chain switched", { chainId: srcChainId });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to switch chain";
          addLog("error", "Chain switch failed", msg);
          setError(`Please switch to the correct network in your wallet. ${msg}`);
          setLoading(false);
          return;
        }
      }

      // Check if there's a transaction step with calldata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txStep = paymentData.steps?.find((s: any) => s.kind === "transaction" && s.data?.crypto);

      let hash: string | undefined;

      if (txStep?.data?.crypto) {
        addLog("info", "Executing with calldata", txStep.data.crypto);
        hash = await preparedTx.execute({
          from: srcAccount.address,
          paymentData: txStep.data.crypto,
        });
      } else {
        // Deposit step: transfer to deposit address
        const depositAddress = paymentData.deposit_address;
        if (!depositAddress) {
          setError("No deposit address found");
          setLoading(false);
          return;
        }

        const isNativeToken = !src.address;
        addLog("info", "Executing wallet transfer", {
          from: srcAccount.address,
          to: depositAddress,
          amount: src.total?.raw_amount,
          token: isNativeToken ? "native" : src.address,
          chainId: src.chain_id,
        });

        hash = await preparedTx.execute({
          from: srcAccount.address,
          to: depositAddress,
          amount: BigInt(src.total?.raw_amount || src.currency_amount?.raw_amount || "0"),
          chainId: src.chain_id,
          ...(!isNativeToken && src.address ? {
            token: {
              address: src.address,
              decimals: src.decimals,
            },
          } : {}),
        });
      }

      if (hash) {
        setTxHash(hash);
        addLog("response", "Transaction sent", { hash });
      } else {
        addLog("error", "Transaction returned no hash", null);
        setError("Transaction was not completed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      addLog("error", "Transaction failed", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setQuote(null);
    setSwapData(null);
    setError(null);
    setTxHash(null);
    setStep("configure");
  };

  const fullReset = () => {
    reset();
    setDstAddress("");
    setReceivingAddressManual("");
  };

  const srcChain = CHAINS.find((c) => c.id === srcChainId);
  const dstChain = CHAINS.find((c) => c.id === dstChainId);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "24px" }}>
      {/* Header */}
      <div style={{ maxWidth: 520, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>
          ← Back
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>
          {crossChain ? "Bridge" : "Swap"}
        </h1>
        <Link href="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>
          Dashboard →
        </Link>
      </div>

      {/* Main Card */}
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "var(--card-bg)",
          border: "1px solid #1a1a1a",
          borderRadius: 16,
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Wallet Connect Bar */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Source wallet */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {srcAccount?.isConnected ? (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  <span style={{ fontSize: 13, color: "#fff", fontFamily: "monospace" }}>
                    {srcAccount.address?.slice(0, 6)}...{srcAccount.address?.slice(-4)}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,0,51,0.15)", color: "var(--pink-primary)", fontWeight: 600 }}>
                    {srcChainType}
                  </span>
                </>
              ) : (
                <button
                  onClick={() => setShowWalletPicker(showWalletPicker === "source" ? null : "source")}
                  style={{ background: "var(--pink-primary)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer" }}
                >
                  Connect Source
                </button>
              )}
            </div>

            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: crossChain ? "#8b5cf6" : "var(--pink-primary)", background: crossChain ? "rgba(139,92,246,0.1)" : "rgba(255,0,51,0.1)", padding: "4px 10px", borderRadius: 4 }}>
              {crossChain ? "BRIDGE" : "SWAP"}
            </span>
          </div>

          {/* Destination wallet — always shown */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px solid #111" }}>
            <span style={{ fontSize: 11, color: "#666", marginRight: 4, flexShrink: 0 }}>To:</span>
            {receivingAddress ? (
              <>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: dstAddress ? "#8b5cf6" : "#f59e0b", display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#fff", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {receivingAddress.slice(0, 6)}...{receivingAddress.slice(-4)}
                </span>
                <span style={{ fontSize: 10, color: "#666", flexShrink: 0 }}>
                  {dstAddress ? "(wallet)" : "(manual)"}
                </span>
                <button
                  onClick={() => { setDstAddress(""); setReceivingAddressManual(""); }}
                  style={{ background: "none", border: "1px solid #222", borderRadius: 6, color: "#666", fontSize: 11, padding: "2px 6px", cursor: "pointer", marginLeft: "auto", flexShrink: 0 }}
                >
                  Change
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowWalletPicker(showWalletPicker === "dest" ? null : "dest")}
                  style={{ background: "#8b5cf6", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer" }}
                >
                  Connect {dstChainType} Wallet
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  style={{ background: "none", border: "1px solid #222", borderRadius: 6, color: "#666", fontSize: 11, padding: "4px 8px", cursor: "pointer", marginLeft: "auto" }}
                >
                  Paste Address
                </button>
              </>
            )}
          </div>
        </div>

        {/* Wallet Picker */}
        {showWalletPicker && (
          <div style={{ padding: "12px 24px", borderBottom: "1px solid #1a1a1a" }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              {showWalletPicker === "source"
                ? `Connect ${srcChainType} wallet (sending)`
                : `Connect ${dstChainType} wallet (receiving)`}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(showWalletPicker === "source" ? srcWallets : dstWallets).map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={async () => {
                    if (wallet.connectors[0]) {
                      const picking = showWalletPicker;
                      await connect({ walletConnector: wallet.connectors[0] });
                      if (picking === "dest") {
                        setPendingDstCapture(true);
                      }
                      setShowWalletPicker(null);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    background: "#111",
                    border: "1px solid #222",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {wallet.icon && (
                    <img src={wallet.icon} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} />
                  )}
                  {wallet.name}
                </button>
              ))}
              {(showWalletPicker === "source" ? srcWallets : dstWallets).length === 0 && (
                <div style={{ fontSize: 12, color: "#666" }}>
                  No {showWalletPicker === "source" ? srcChainType : dstChainType} wallets detected.
                  {showWalletPicker === "dest" && " You can paste an address manually in Settings."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FROM Section ── */}
        <div style={{ padding: "16px 24px" }}>
          <label style={{ fontSize: 12, color: "#666", fontWeight: 500, display: "block", marginBottom: 8 }}>
            From
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select
              value={srcChainId}
              onChange={(e) => {
                setSrcChainId(Number(e.target.value));
                setSrcTokenIdx(0);
                reset();
              }}
              style={{ flex: 1, fontSize: 14 }}
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <select
              value={srcTokenIdx}
              onChange={(e) => {
                setSrcTokenIdx(Number(e.target.value));
                reset();
              }}
              style={{ flex: 1, fontSize: 14 }}
            >
              {srcTokens.map((t, i) => (
                <option key={i} value={i}>
                  {t.ticker}
                </option>
              ))}
            </select>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (quote) reset();
              }}
              style={{
                fontSize: 28,
                fontWeight: 600,
                padding: "16px",
                background: "var(--input-bg)",
                border: "1px solid #1a1a1a",
                borderRadius: 12,
                letterSpacing: -0.5,
              }}
            />
            <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, color: "#666", fontWeight: 500 }}>{srcToken?.ticker}</span>
            </div>
          </div>
        </div>

        {/* ── Swap Direction Button ── */}
        <div style={{ display: "flex", justifyContent: "center", margin: "-8px 0", position: "relative", zIndex: 1 }}>
          <button
            onClick={handleSwapDirection}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#111",
              border: "2px solid #1a1a1a",
              color: "var(--pink-primary)",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--pink-primary)";
              e.currentTarget.style.transform = "rotate(180deg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1a1a1a";
              e.currentTarget.style.transform = "rotate(0deg)";
            }}
          >
            ↕
          </button>
        </div>

        {/* ── TO Section ── */}
        <div style={{ padding: "0 24px 16px" }}>
          <label style={{ fontSize: 12, color: "#666", fontWeight: 500, display: "block", marginBottom: 8 }}>
            To
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select
              value={dstChainId}
              onChange={(e) => {
                setDstChainId(Number(e.target.value));
                setDstTokenIdx(0);
                reset();
              }}
              style={{ flex: 1, fontSize: 14 }}
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <select
              value={dstTokenIdx}
              onChange={(e) => {
                setDstTokenIdx(Number(e.target.value));
                reset();
              }}
              style={{ flex: 1, fontSize: 14 }}
            >
              {dstTokens.map((t, i) => (
                <option key={i} value={i}>
                  {t.ticker}
                </option>
              ))}
            </select>
          </div>

          {/* Quote output preview */}
          <div
            style={{
              background: "var(--input-bg)",
              border: "1px solid #1a1a1a",
              borderRadius: 12,
              padding: "16px",
              minHeight: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {quote?.data ? (
              <>
                <span style={{ fontSize: 28, fontWeight: 600, color: "#fff", letterSpacing: -0.5 }}>
                  {formatAmount(quote.data.output?.currency_amount?.ui_amount)}
                </span>
                <span style={{ fontSize: 14, color: "#666", fontWeight: 500 }}>{dstToken?.ticker}</span>
              </>
            ) : (
              <span style={{ fontSize: 28, fontWeight: 600, color: "#333" }}>0.0</span>
            )}
          </div>
        </div>

        {/* ── Settings Toggle ── */}
        <div style={{ padding: "0 24px" }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              fontSize: 13,
              cursor: "pointer",
              padding: "8px 0",
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
            }}
          >
            <span style={{ fontSize: 16 }}>⚙</span>
            Settings
            <span style={{ marginLeft: "auto", fontSize: 10 }}>{showSettings ? "▲" : "▼"}</span>
          </button>

          {showSettings && (
            <div style={{ padding: "8px 0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Swap mode */}
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Swap Mode</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["ExactIn", "ExactOut"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setSwapMode(m); reset(); }}
                      style={{
                        flex: 1,
                        padding: "8px",
                        fontSize: 13,
                        fontWeight: 500,
                        borderRadius: 8,
                        border: `1px solid ${swapMode === m ? "var(--pink-primary)" : "#1a1a1a"}`,
                        background: swapMode === m ? "rgba(255,0,51,0.1)" : "transparent",
                        color: swapMode === m ? "var(--pink-primary)" : "#666",
                        cursor: "pointer",
                      }}
                    >
                      {m === "ExactIn" ? "Exact Input" : "Exact Output"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slippage */}
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>
                  Slippage Tolerance
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[50, 100, 200, 500].map((bps) => (
                    <button
                      key={bps}
                      onClick={() => setSlippageBps(bps)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        fontSize: 13,
                        borderRadius: 8,
                        border: `1px solid ${slippageBps === bps ? "var(--pink-primary)" : "#1a1a1a"}`,
                        background: slippageBps === bps ? "rgba(255,0,51,0.1)" : "transparent",
                        color: slippageBps === bps ? "var(--pink-primary)" : "#666",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {bps / 100}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Receiving address */}
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>
                  Receiving Address
                  {isCrossType
                    ? ` (${dstChainType} address required)`
                    : srcAccount?.address ? " (auto-filled from wallet)" : ""}
                </label>
                <input
                  type="text"
                  placeholder={isCrossType ? `Enter ${dstChainType} address...` : "0x... or wallet address"}
                  value={receivingAddressManual}
                  onChange={(e) => setReceivingAddressManual(e.target.value)}
                  style={{ fontSize: 13, padding: "10px 12px", borderRadius: 8 }}
                />
                {receivingAddress && receivingAddress !== receivingAddressManual && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                    Using: <span style={{ color: "#fff", fontFamily: "monospace" }}>{receivingAddress.slice(0, 10)}...{receivingAddress.slice(-6)}</span>
                    {" "}(from {dstAddress ? "dest wallet" : "source wallet"})
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Quote Details ── */}
        {quote?.data && step === "review" && (
          <div style={{ margin: "0 24px", padding: 16, background: "#0d0d0d", borderRadius: 12, border: "1px solid #1a1a1a" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 12 }}>
              Route Details
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666" }}>Route</span>
                <span style={{ color: "#fff" }}>
                  {srcChain?.icon} {srcToken?.ticker}
                  <span style={{ color: crossChain ? "#8b5cf6" : "var(--pink-primary)", margin: "0 6px" }}>→</span>
                  {dstChain?.icon} {dstToken?.ticker}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666" }}>You Pay</span>
                <span style={{ color: "#fff" }}>
                  {formatAmount(quote.data.input?.currency_amount?.ui_amount)} {quote.data.input?.ticker || srcToken?.ticker}
                  <span style={{ color: "#666", marginLeft: 6 }}>
                    ({formatUsd(quote.data.input?.currency_amount?.value_usd)})
                  </span>
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666" }}>You Receive</span>
                <span style={{ color: "#22c55e" }}>
                  {formatAmount(quote.data.output?.currency_amount?.ui_amount)} {quote.data.output?.ticker || dstToken?.ticker}
                  <span style={{ color: "#666", marginLeft: 6 }}>
                    ({formatUsd(quote.data.output?.currency_amount?.value_usd)})
                  </span>
                </span>
              </div>

              {quote.data.price_impact !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>Price Impact</span>
                  <span
                    style={{
                      color:
                        Math.abs(quote.data.price_impact) > 5
                          ? "#ef4444"
                          : Math.abs(quote.data.price_impact) > 2
                            ? "#f59e0b"
                            : "#22c55e",
                    }}
                  >
                    {quote.data.price_impact.toFixed(4)}%
                  </span>
                </div>
              )}

              {quote.data.slippage_bps !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>Slippage</span>
                  <span style={{ color: "#fff" }}>{quote.data.slippage_bps / 100}%</span>
                </div>
              )}

              {quote.data.input?.fees?.total_fee && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>Fees</span>
                  <span style={{ color: "#f59e0b" }}>
                    {formatUsd(quote.data.input.fees.total_fee.value_usd)}
                  </span>
                </div>
              )}

              {quote.data.input?.gas && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>Est. Gas</span>
                  <span style={{ color: "#fff" }}>{formatUsd(quote.data.input.gas.value_usd)}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666" }}>Mode</span>
                <span style={{ color: "#fff" }}>
                  {quote.data.swap_mode === "ExactIn" ? "Exact Input" : "Exact Output"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Swap Data / Execution Details ── */}
        {swapData?.data && step === "execute" && (
          <div style={{ margin: "0 24px", padding: 16, background: "#0d0d0d", borderRadius: 12, border: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>
                {txHash ? "Transaction Sent" : "Transaction Ready"}
              </div>
              {swapData.status && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: `${STATUS_COLORS[swapData.status] || "#666"}20`,
                  color: STATUS_COLORS[swapData.status] || "#666",
                }}>
                  {swapData.status}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              {swapData.payorder_id && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>Order ID</span>
                  <span
                    style={{ color: "#888", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}
                    onClick={() => navigator.clipboard.writeText(swapData.payorder_id)}
                    title="Click to copy"
                  >
                    {swapData.payorder_id}
                  </span>
                </div>
              )}

              {swapData.data.src && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>You Pay</span>
                  <span style={{ color: "#fff" }}>
                    {formatAmount(swapData.data.src.total?.ui_amount)} {swapData.data.src.ticker}
                    <span style={{ color: "#666", marginLeft: 6 }}>
                      ({formatUsd(swapData.data.src.total?.value_usd)})
                    </span>
                  </span>
                </div>
              )}

              {swapData.data.dst && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>You Receive</span>
                  <span style={{ color: "#22c55e" }}>
                    {formatAmount(swapData.data.dst.currency_amount?.ui_amount)} {swapData.data.dst.ticker}
                    <span style={{ color: "#666", marginLeft: 6 }}>
                      ({formatUsd(swapData.data.dst.currency_amount?.value_usd)})
                    </span>
                  </span>
                </div>
              )}

              {!txHash && swapData.data.deposit_address && (
                <div>
                  <span style={{ color: "#666", display: "block", marginBottom: 4 }}>Deposit Address</span>
                  <div
                    style={{
                      background: "#111",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#fff",
                      wordBreak: "break-all",
                      cursor: "pointer",
                    }}
                    onClick={() => navigator.clipboard.writeText(swapData.data.deposit_address)}
                    title="Click to copy"
                  >
                    {swapData.data.deposit_address}
                  </div>
                </div>
              )}

              {swapData.data.expires_at && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>Expires</span>
                  <span style={{ color: "#f59e0b" }}>
                    {new Date(swapData.data.expires_at).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* TX Hash */}
              {txHash && (
                <div>
                  <span style={{ color: "#666", display: "block", marginBottom: 4 }}>Transaction Hash</span>
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#22c55e",
                      wordBreak: "break-all",
                      cursor: "pointer",
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.3)",
                    }}
                    onClick={() => navigator.clipboard.writeText(txHash)}
                    title="Click to copy"
                  >
                    {txHash}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ margin: "12px 24px 0", padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#ef4444" }}>
            {error}
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div style={{ padding: "16px 24px 24px" }}>
          {step === "configure" && (
            <button
              onClick={!srcAccount?.isConnected ? () => setShowWalletPicker("source") : getQuote}
              disabled={loading || (srcAccount?.isConnected ? !amount : false)}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 12,
                border: "none",
                background: !srcAccount?.isConnected || amount ? "var(--pink-primary)" : "#1a1a1a",
                color: !srcAccount?.isConnected || amount ? "#fff" : "#666",
                cursor: !srcAccount?.isConnected || amount ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {!srcAccount?.isConnected
                ? "Connect Wallet"
                : loading
                  ? "Getting Quote..."
                  : amount
                    ? "Get Quote"
                    : "Enter an amount"}
            </button>
          )}

          {step === "review" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={reset}
                style={{
                  flex: 1,
                  padding: "14px",
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 12,
                  border: "1px solid #1a1a1a",
                  background: "transparent",
                  color: "#666",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={getSwapData}
                disabled={loading}
                style={{
                  flex: 2,
                  padding: "14px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 12,
                  border: "none",
                  background: "var(--pink-primary)",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Preparing..." : `${crossChain ? "Bridge" : "Swap"} Now`}
              </button>
            </div>
          )}

          {step === "execute" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {srcAccount?.isConnected && !txHash && (
                <button
                  onClick={executeSwapFromWallet}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, var(--pink-primary) 0%, #8b5cf6 100%)",
                    color: "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    letterSpacing: 0.5,
                  }}
                >
                  {loading ? "Signing..." : `Sign & Send ${crossChain ? "Bridge" : "Swap"}`}
                </button>
              )}

              {!srcAccount?.isConnected && !txHash && (
                <button
                  onClick={() => setShowWalletPicker("source")}
                  style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: 12,
                    border: "none",
                    background: "var(--pink-primary)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Connect Wallet to Sign
                </button>
              )}

              <button
                onClick={reset}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 12,
                  border: "1px solid #1a1a1a",
                  background: "transparent",
                  color: "#666",
                  cursor: "pointer",
                }}
              >
                {txHash ? "New" : "Cancel"} {crossChain ? "Bridge" : "Swap"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div style={{ maxWidth: 520, margin: "16px auto 0", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#444" }}>
          {crossChain
            ? "Cross-chain bridge powered by CoinVoyage routing aggregation"
            : "Swap powered by CoinVoyage DEX aggregation"}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: 12 }}>
          <span style={{ color: "#333" }}>{CHAINS.length} chains</span>
          <span style={{ color: "#333" }}>·</span>
          <span style={{ color: "#333" }}>Best route optimization</span>
          <span style={{ color: "#333" }}>·</span>
          <span style={{ color: "#333" }}>MEV protected</span>
        </div>
      </div>

      {/* Debug Console */}
      <div
        style={{
          maxWidth: 720,
          margin: "24px auto 0",
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "#0d0d0d",
            borderBottom: "1px solid #1a1a1a",
            cursor: "pointer",
          }}
          onClick={() => setShowDebug(!showDebug)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: debugLogs.some((l) => l.type === "error") ? "#ef4444" : "#22c55e" }}>●</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#888", fontFamily: "monospace" }}>
              Debug Console
            </span>
            <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>
              ({debugLogs.length} entries)
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {debugLogs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDebugLogs([]);
                }}
                style={{
                  background: "none",
                  border: "1px solid #222",
                  borderRadius: 4,
                  color: "#666",
                  fontSize: 11,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                Clear
              </button>
            )}
            <span style={{ fontSize: 10, color: "#444" }}>{showDebug ? "▲" : "▼"}</span>
          </div>
        </div>

        {showDebug && (
          <div
            ref={debugRef}
            style={{
              maxHeight: 400,
              overflowY: "auto",
              padding: "8px 0",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            {debugLogs.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#333" }}>
                No logs yet. Connect wallet and get a quote to see API requests in real time.
              </div>
            ) : (
              debugLogs.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "6px 16px",
                    borderBottom: "1px solid #111",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#333", fontSize: 11, flexShrink: 0 }}>{entry.time}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 3,
                        flexShrink: 0,
                        ...(entry.type === "request"
                          ? { background: "rgba(59,130,246,0.15)", color: "#3b82f6" }
                          : entry.type === "response"
                            ? { background: "rgba(34,197,94,0.15)", color: "#22c55e" }
                            : entry.type === "error"
                              ? { background: "rgba(239,68,68,0.15)", color: "#ef4444" }
                              : { background: "rgba(168,162,158,0.15)", color: "#a8a29e" }),
                      }}
                    >
                      {entry.type.toUpperCase()}
                    </span>
                    <span style={{ color: "#ccc", fontSize: 12 }}>{entry.label}</span>
                  </div>
                  {entry.data !== undefined && entry.data !== null && (
                    <pre
                      style={{
                        margin: 0,
                        padding: "6px 10px",
                        background: "#080808",
                        borderRadius: 6,
                        color: entry.type === "error" ? "#f87171" : "#888",
                        fontSize: 11,
                        lineHeight: 1.4,
                        overflowX: "auto",
                        maxHeight: 200,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {typeof entry.data === "string"
                        ? entry.data
                        : JSON.stringify(entry.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
