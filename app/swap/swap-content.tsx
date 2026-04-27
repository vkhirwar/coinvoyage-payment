"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useApiKeys, useWalletReady } from "../providers";
import { useAccount, useAccountDisconnect, usePrepareTransaction } from "@coin-voyage/crypto/hooks";
import { ChainType } from "@coin-voyage/shared/types";
import { useSwitchChain } from "wagmi";
import TokenChainPicker, { type PickerToken, TokenIcon } from "./components/TokenChainPicker";
import { VS } from "./components/theme";
import ThemeToggle from "./components/ThemeToggle";
import WalletSidebar from "./components/WalletSidebar";
import WalletConnectModal from "./components/WalletConnectModal";
import RecipientDropdown from "./components/RecipientDropdown";
import RouteSummary from "./components/RouteSummary";
import TransactionFlowModal from "./components/TransactionFlowModal";

// How long a quote stays "fresh" before we silently re-fetch.
const QUOTE_TTL_MS = 30_000;
// Debounce window for input-change auto-quotes.
const QUOTE_DEBOUNCE_MS = 500;

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
type TokenInfo = {
  name: string;
  ticker: string;
  address?: string;
  uiAmount?: number; // present when sourced from wallet balances
};
const POPULAR_TOKENS: Record<number, TokenInfo[]> = {
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

// Chains that show in "Starred Chains" section of the picker.
const STARRED_CHAIN_IDS = [8453, 1, 42161, 10, 137, 30000000000001];

// TODO: replace with final Vaporswap logo
function VaporswapLogo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/swap" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Vaporswap">
        <defs>
          <linearGradient id="vs-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7c5cff" />
            <stop offset="0.5" stopColor="#4fd1ff" />
            <stop offset="1" stopColor="#ff5cf1" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#vs-logo-grad)" />
        <path
          d="M10 14c3 0 4 5 7 5s4-5 7-5 4 5 7 5M10 22c3 0 4 5 7 5s4-5 7-5 4 5 7 5"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
      </svg>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: -0.3,
          color: VS.text,
          fontFeatureSettings: '"ss01"',
        }}
      >
        Vaporswap
      </span>
    </Link>
  );
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

  // Selected source/destination tokens (object form; replaces chainId+tokenIdx).
  const [srcToken, setSrcToken] = useState<PickerToken>({
    name: "USDC",
    ticker: "USDC",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chain_id: 8453,
  });
  const [dstToken, setDstToken] = useState<PickerToken>({
    name: "Ethereum",
    ticker: "ETH",
    chain_id: 8453,
  });
  const [amount, setAmount] = useState("");

  // Picker (modal) — open for "src" or "dst" panel, null when closed.
  const [pickerSide, setPickerSide] = useState<"src" | "dst" | null>(null);

  // Derived chain ids (used widely below).
  const srcChainId = srcToken.chain_id;
  const dstChainId = dstToken.chain_id;

  // Chain types
  const srcChainType = getChainType(srcChainId);
  const dstChainType = getChainType(dstChainId);
  const isCrossType = srcChainType !== dstChainType;

  // Wallets — separate source (sending) and destination (receiving)
  const { account: srcAccount } = useAccount({ chainType: srcChainType, selectedWallet: undefined });
  const { account: dstAccount } = useAccount({ chainType: dstChainType, selectedWallet: undefined });
  const disconnectAccount = useAccountDisconnect();
  const { switchChainAsync } = useSwitchChain();
  // Wallet connect modal — open for "src" or "dst" side; null when closed.
  const [walletModalSide, setWalletModalSide] = useState<"src" | "dst" | null>(null);
  // Transaction flow modal — opens when user confirms the swap and stays open
  // through preparing → signing → executing → completed.
  const [flowModalOpen, setFlowModalOpen] = useState(false);

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
  const [quoteFetchedAt, setQuoteFetchedAt] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapData, setSwapData] = useState<SwapDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"configure" | "review" | "execute">("configure");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tick once a second so the route summary's countdown stays live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const quoteAgeMs = quoteFetchedAt ? now - quoteFetchedAt : null;
  const quoteIsStale = quoteAgeMs !== null && quoteAgeMs > QUOTE_TTL_MS;
  const secondsUntilRefresh =
    quoteFetchedAt && !quoteIsStale
      ? Math.max(0, Math.ceil((QUOTE_TTL_MS - (quoteAgeMs ?? 0)) / 1000))
      : null;

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
        // GET /pay-orders/:id returns the full order: { id, status, payment, ... }
        // POST /swap/data returns { status, data, payorder_id }. Normalize so
        // swapData.data is always the freshest order body — that's what the
        // modal's per-leg timeline + destination_tx_hash read from.
        const order = await apiCall("/api/sale", {
          action: "status",
          apiKey,
          payorder_id: orderId,
        }, addLog);
        if (order && order.status) {
          setSwapData((prev: SwapDataResponse) => {
            if (!prev) return prev;
            const nextData = order.payment ?? order.data ?? prev.data;
            return { ...prev, status: order.status, data: nextData };
          });
          if (["COMPLETED", "FAILED", "EXPIRED", "REFUNDED"].includes(order.status as string)) {
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch {
        // Silently continue polling
      }
    }, 5000);
  }, [apiKey, addLog]);

  // Wallet-held tokens for the connected source address on the current src chain.
  // Fetched from /api/wallet-tokens (GoldRush under the hood). Merged with
  // POPULAR_TOKENS so the "From" dropdown shows whatever the user actually holds.
  const [walletTokens, setWalletTokens] = useState<TokenInfo[]>([]);
  const [walletTokensLoading, setWalletTokensLoading] = useState(false);

  useEffect(() => {
    const addr = srcAccount?.address;
    if (!addr) {
      setWalletTokens([]);
      return;
    }
    let cancelled = false;
    setWalletTokensLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/wallet-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chainId: srcChainId, address: addr }),
        });
        const json = (await res.json()) as {
          tokens?: Array<{
            name: string;
            ticker: string;
            address?: string;
            uiAmount?: number;
          }>;
        };
        if (cancelled) return;
        const next = (json.tokens ?? []).map((t) => ({
          name: t.name,
          ticker: t.ticker,
          address: t.address,
          uiAmount: t.uiAmount,
        }));
        setWalletTokens(next);
        // No auto-selection: the picker surfaces balances directly so the
        // user can pick deliberately rather than have selection swap under
        // them on chain change.
      } catch {
        if (!cancelled) setWalletTokens([]);
      } finally {
        if (!cancelled) setWalletTokensLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [srcAccount?.address, srcChainId]);

  // Wallet balance entry for the currently-selected source token (used to
  // render the "Balance: X" line in the From panel).
  const srcWalletBalance = useMemo(() => {
    const wantAddr = srcToken.address?.toLowerCase();
    return walletTokens.find((t) =>
      wantAddr ? t.address?.toLowerCase() === wantAddr : !t.address,
    );
  }, [walletTokens, srcToken.address]);

  // Picker pool — wallet tokens (with balances) for the active source chain,
  // plus POPULAR_TOKENS across all chains so the user can browse anything.
  const pickerWalletTokens: PickerToken[] = useMemo(
    () => walletTokens.map((t) => ({ ...t, chain_id: srcChainId })),
    [walletTokens, srcChainId],
  );

  const popularByChain: Record<number, PickerToken[]> = useMemo(() => {
    const out: Record<number, PickerToken[]> = {};
    for (const cidStr of Object.keys(POPULAR_TOKENS)) {
      const cid = Number(cidStr);
      out[cid] = (POPULAR_TOKENS[cid] || []).map((t) => ({
        name: t.name,
        ticker: t.ticker,
        address: t.address,
        chain_id: cid,
      }));
    }
    return out;
  }, []);

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
    const oldSrc = srcToken;
    setSrcToken(dstToken);
    setDstToken(oldSrc);
    fullReset();
  };

  // Silent quote fetch — runs from auto-quote effects and the manual refresh
  // button. Doesn't toggle the global `loading` state and doesn't set errors
  // unless the user is actively in `configure` and inputs look complete.
  const fetchQuote = useCallback(async (opts?: { silent?: boolean }) => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (!apiKey) return;

    setQuoteLoading(true);
    if (!opts?.silent) setError(null);
    addLog("info", "Getting quote...", buildIntent());

    try {
      const data = await apiCall("/api/swap", {
        action: "quote",
        apiKey,
        intent: buildIntent(),
      }, addLog);
      setQuote({ data });
      setQuoteFetchedAt(Date.now());
    } catch (e) {
      // Only surface quote errors when not running silently — auto-quote
      // shouldn't constantly clobber the error banner.
      if (!opts?.silent) {
        setError(e instanceof Error ? e.message : "Failed to get quote");
      }
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, apiKey, buildIntent, addLog]);

  // Auto-quote: when inputs change, fetch a fresh quote (debounced).
  useEffect(() => {
    if (step !== "configure") return; // freeze during execution
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setQuoteFetchedAt(null);
      return;
    }
    if (!apiKey) return;
    const handle = setTimeout(() => {
      fetchQuote({ silent: false });
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // We intentionally don't depend on fetchQuote — it captures everything
    // we care about via its own deps and changes on every input edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    amount,
    apiKey,
    step,
    srcToken.chain_id,
    srcToken.address,
    dstToken.chain_id,
    dstToken.address,
    swapMode,
    slippageBps,
    srcAccount?.address,
  ]);

  // Stale-quote refresh: once the current quote ages out, silently refetch.
  useEffect(() => {
    if (step !== "configure") return;
    if (!quoteIsStale) return;
    fetchQuote({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteIsStale, step]);

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
    setQuoteFetchedAt(null);
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
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(1200px 600px at 50% -200px, rgba(124,92,255,0.18), transparent 60%), radial-gradient(900px 500px at 100% 10%, rgba(79,209,255,0.10), transparent 60%), ${VS.bg}`,
        paddingBottom: 48,
        fontFeatureSettings: '"tnum","cv11"',
      }}
    >
      {/* Sticky Top Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "saturate(140%) blur(12px)",
          WebkitBackdropFilter: "saturate(140%) blur(12px)",
          background: VS.glassBg,
          borderBottom: `1px solid ${VS.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <VaporswapLogo />

          {/* Swap / Bridge — single unified label */}
          <div
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              background: VS.gradientSoft,
              border: `1px solid ${VS.borderStrong}`,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: VS.text,
            }}
          >
            Swap / Bridge
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ThemeToggle />
            {srcAccount?.isConnected && srcAccount.address ? (
              <button
                onClick={() => setWalletModalSide("src")}
                title="Change source wallet"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  background: VS.surface,
                  border: `1px solid ${VS.borderStrong}`,
                  borderRadius: 999,
                  color: VS.text,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "monospace",
                  letterSpacing: -0.2,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: VS.gradient,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {srcAccount.address.slice(0, 6)}…{srcAccount.address.slice(-4)}
              </button>
            ) : (
              <button
                onClick={() => setWalletModalSide("src")}
                style={{
                  background: VS.gradient,
                  border: "none",
                  borderRadius: 999,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 16px",
                  cursor: "pointer",
                  letterSpacing: 0.4,
                }}
              >
                Connect
              </button>
            )}
            <Link
              href="/"
              style={{
                fontSize: 13,
                color: VS.textMuted,
                textDecoration: "none",
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${VS.border}`,
              }}
            >
              ← Home
            </Link>
            <Link
              href="/dashboard"
              style={{
                fontSize: 13,
                color: VS.text,
                textDecoration: "none",
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${VS.borderStrong}`,
                background: VS.surface,
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
      <div style={{ flex: 1, minWidth: 0, padding: "32px 24px 0" }}>

      {/* Main Card — gradient border via padded wrapper */}
      <div
        style={{
          maxWidth: 540,
          margin: "0 auto",
          padding: 1,
          borderRadius: 22,
          background: VS.gradient,
          boxShadow: VS.shadow,
        }}
      >
      <div
        style={{
          background: VS.surface,
          borderRadius: 21,
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Wallet Connect Bar — source side only; recipient lives on the To panel. */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: `1px solid ${VS.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {srcAccount?.isConnected ? (
            <>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: VS.success,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 13, color: VS.text, fontFamily: "monospace" }}>
                {srcAccount.address?.slice(0, 6)}…{srcAccount.address?.slice(-4)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: VS.gradientSoft,
                  color: VS.text,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                }}
              >
                {srcChainType}
              </span>
              <button
                onClick={() => setWalletModalSide("src")}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: `1px solid ${VS.border}`,
                  borderRadius: 8,
                  color: VS.textMuted,
                  fontSize: 11,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Change
              </button>
            </>
          ) : (
            <button
              onClick={() => setWalletModalSide("src")}
              style={{
                background: VS.gradient,
                border: "none",
                borderRadius: 999,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 16px",
                cursor: "pointer",
                letterSpacing: 0.4,
              }}
            >
              Connect Source Wallet
            </button>
          )}
        </div>

        {/* ── FROM Section ── */}
        <SwapPanel
          label="From"
          token={srcToken}
          chain={srcChain}
          onPickToken={() => setPickerSide("src")}
          amountInput={
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
              aria-label="Amount to send"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 32,
                fontWeight: 700,
                color: VS.text,
                letterSpacing: -0.8,
                fontVariantNumeric: "tabular-nums",
                padding: 0,
              }}
            />
          }
          usdValue={quote?.data?.input?.currency_amount?.value_usd}
          balance={srcWalletBalance?.uiAmount}
          balanceLoading={walletTokensLoading}
          onPercent={(pct) => {
            const bal = srcWalletBalance?.uiAmount;
            if (typeof bal === "number" && bal > 0) {
              const next = pct === 1 ? bal : bal * pct;
              // 6 decimals is enough for stable presentation; user can edit.
              setAmount(next.toString());
            }
          }}
        />

        {/* ── Swap Direction Button ── */}
        <div style={{ display: "flex", justifyContent: "center", margin: "-8px 0", position: "relative", zIndex: 1 }}>
          <button
            onClick={handleSwapDirection}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: VS.surface,
              border: `1px solid ${VS.borderStrong}`,
              color: VS.text,
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 250ms cubic-bezier(.5,1.5,.5,1), border-color 200ms",
              boxShadow: "0 8px 24px -12px rgba(0,0,0,0.8)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = VS.accent2;
              e.currentTarget.style.transform = "rotate(180deg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = VS.borderStrong;
              e.currentTarget.style.transform = "rotate(0deg)";
            }}
          >
            ⇅
          </button>
        </div>

        {/* ── TO Section ── */}
        <SwapPanel
          label="To"
          token={dstToken}
          chain={dstChain}
          onPickToken={() => setPickerSide("dst")}
          rightHeader={
            <RecipientDropdown
              chainType={dstChainType}
              currentAddress={receivingAddress}
              isFromWallet={!!dstAddress && !receivingAddressManual}
              connectedAddress={dstAccount?.isConnected ? dstAccount.address : undefined}
              onSelectConnected={(addr) => {
                setDstAddress(addr);
                setReceivingAddressManual("");
              }}
              onClear={() => {
                setDstAddress("");
                setReceivingAddressManual("");
              }}
              onPasteAddress={(addr) => {
                setReceivingAddressManual(addr);
                setDstAddress("");
              }}
              onConnectNewWallet={() => {
                setPendingDstCapture(true);
                setWalletModalSide("dst");
              }}
            />
          }
          amountInput={
            <ReadOnlyAmount
              value={quote?.data?.output?.currency_amount?.ui_amount}
              loading={quoteLoading}
            />
          }
          usdValue={quote?.data?.output?.currency_amount?.value_usd}
        />

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
                        border: `1px solid ${swapMode === m ? VS.borderStrong : VS.border}`,
                        background: swapMode === m ? VS.gradientSoft : "transparent",
                        color: swapMode === m ? VS.text : VS.textMuted,
                        cursor: "pointer",
                      }}
                    >
                      {m === "ExactIn" ? "Exact Input" : "Exact Output"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slippage now lives on the route summary card (the
                  "Auto x.xx%" chip). Removed from Settings to avoid
                  duplication. */}

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

        {/* ── Compact Route Summary ── */}
        {step === "configure" && (quote?.data || quoteLoading) && (
          <RouteSummary
            quote={quote?.data ?? null}
            isLoading={quoteLoading}
            isStale={quoteIsStale}
            srcTicker={srcToken?.ticker || "—"}
            dstTicker={dstToken?.ticker || "—"}
            slippageBps={slippageBps}
            onSlippageChange={(bps) => {
              setSlippageBps(bps);
              setQuoteFetchedAt(null); // forces auto-refetch via deps
            }}
            secondsUntilRefresh={secondsUntilRefresh}
            onRefresh={() => fetchQuote({ silent: false })}
          />
        )}

        {/* In-flight order details have moved into the TransactionFlowModal
            (mounted at the bottom of the page). Keeping the inline panel
            removed avoids duplicating state between two surfaces. */}

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              margin: "12px 24px 0",
              padding: "10px 14px",
              background: "rgba(255, 92, 122, 0.08)",
              border: "1px solid rgba(255, 92, 122, 0.3)",
              borderRadius: 8,
              fontSize: 13,
              color: VS.danger,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div style={{ padding: "16px 24px 24px" }}>
          {step === "configure" && (() => {
            // Single state-aware CTA. Auto-quote runs in the background; the
            // button label tells the user exactly what's missing.
            const noWallet = !srcAccount?.isConnected;
            const noAmount = !amount || parseFloat(amount) <= 0;
            const noRecipient = !receivingAddress;
            // Only flag insufficient balance when we have a known balance for
            // the selected source token and chain (i.e. EVM source + Goldrush
            // returned a value). Avoids false negatives for non-EVM chains.
            const insufficient =
              !noAmount &&
              srcWalletBalance?.uiAmount !== undefined &&
              parseFloat(amount) > srcWalletBalance.uiAmount;
            const ready =
              !noWallet && !noAmount && !noRecipient && !insufficient && !!quote?.data && !quoteLoading;
            const onClick = noWallet
              ? () => setWalletModalSide("src")
              : noRecipient && isCrossType
                ? undefined // RecipientDropdown is the right affordance
                : ready
                  ? () => {
                      setFlowModalOpen(true);
                      getSwapData();
                    }
                  : undefined;
            const label = noWallet
              ? "Connect Wallet"
              : noAmount
                ? "Enter an amount"
                : noRecipient
                  ? `Set ${dstChainType} recipient`
                  : insufficient
                    ? `Insufficient ${srcToken.ticker} balance`
                    : quoteLoading && !quote?.data
                      ? "Fetching quote…"
                      : !quote?.data
                        ? "No route available"
                        : loading
                          ? "Preparing…"
                          : `${crossChain ? "Bridge" : "Swap"} Now`;
            const enabled = !!onClick && !loading;
            return (
              <button
                onClick={onClick}
                disabled={!enabled}
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 12,
                  border: "none",
                  background: enabled ? VS.gradient : VS.surface2,
                  color: enabled ? "#fff" : VS.textDim,
                  cursor: enabled ? "pointer" : "not-allowed",
                  transition: "all 200ms ease-out",
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: 0.3,
                  boxShadow: enabled ? "0 12px 32px -12px rgba(124,92,255,0.55)" : "none",
                }}
              >
                {label}
              </button>
            );
          })()}

          {step === "execute" && (
            <button
              onClick={() => setFlowModalOpen(true)}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 12,
                border: `1px solid ${VS.borderStrong}`,
                background: VS.surface,
                color: VS.text,
                cursor: "pointer",
              }}
            >
              {txHash ? "View transaction" : "Resume signing"}
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Info footer */}
      <div style={{ maxWidth: 540, margin: "20px auto 0", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: VS.textMuted, margin: 0 }}>
          {crossChain
            ? `Vaporswap · cross-chain routing across ${CHAINS.length} chains`
            : `Vaporswap · best-route DEX aggregation`}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10, fontSize: 11, color: VS.textDim, letterSpacing: 0.3 }}>
          <span>{CHAINS.length} CHAINS</span>
          <span>•</span>
          <span>BEST ROUTE</span>
          <span>•</span>
          <span>MEV PROTECTED</span>
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
      {srcChainType === ChainType.EVM && srcAccount?.isConnected && srcAccount.address && (
        <WalletSidebar
          address={srcAccount.address}
          chains={CHAINS}
          onDisconnect={() => {
            disconnectAccount(srcAccount).catch(() => {});
          }}
        />
      )}
      </div>

      {/* Token + Chain picker modal */}
      <TokenChainPicker
        isOpen={pickerSide !== null}
        side={pickerSide}
        chains={CHAINS}
        popularByChain={popularByChain}
        walletTokens={pickerWalletTokens}
        initialChainId={pickerSide === "src" ? srcChainId : dstChainId}
        starredChainIds={STARRED_CHAIN_IDS}
        onSelect={(t) => {
          if (pickerSide === "src") setSrcToken(t);
          else if (pickerSide === "dst") setDstToken(t);
          reset();
        }}
        onClose={() => setPickerSide(null)}
      />

      {/* Wallet connect modal — used by the top-bar Connect button, the
          in-card "Connect Source Wallet" CTA, and the recipient dropdown's
          "Connect a new wallet" entry. */}
      <WalletConnectModal
        isOpen={walletModalSide !== null}
        chainType={walletModalSide === "dst" ? dstChainType : srcChainType}
        title={
          walletModalSide === "dst"
            ? `Connect ${dstChainType} wallet to receive`
            : "Log in or sign up"
        }
        onClose={() => setWalletModalSide(null)}
      />

      {/* Transaction flow modal — owns the post-confirm experience: route
          visual + per-leg timeline + completion view. */}
      <TransactionFlowModal
        isOpen={flowModalOpen}
        onClose={() => {
          setFlowModalOpen(false);
          // If we landed on a terminal status, fully reset so the user can
          // start a new swap from a clean state.
          if (
            swapData?.status === "COMPLETED" ||
            swapData?.status === "FAILED" ||
            swapData?.status === "EXPIRED" ||
            swapData?.status === "REFUNDED"
          ) {
            reset();
          }
        }}
        srcToken={srcToken}
        dstToken={dstToken}
        srcChain={srcChain}
        dstChain={dstChain}
        orderData={swapData?.data ?? null}
        orderStatus={swapData?.status}
        depositTxHash={txHash}
        isPreparing={loading && !swapData}
        isSigning={loading && !!swapData && !txHash}
        signError={error}
        onSign={() => {
          setError(null);
          executeSwapFromWallet();
        }}
        onRetrySign={() => {
          setError(null);
          executeSwapFromWallet();
        }}
      />
    </div>
  );
}

// ── Swap panel (Sell / Buy block) ──────────────────────────────────────────
// Layout: label + optional rightHeader on top, big amount input + token pill
// on the body row, USD value + balance/percent buttons in the footer.
type SwapPanelProps = {
  label: string;
  token: PickerToken;
  chain: { id: number; name: string; icon: string } | undefined;
  amountInput: React.ReactNode;
  usdValue?: number | undefined;
  balance?: number | undefined;
  balanceLoading?: boolean;
  onPickToken: () => void;
  onPercent?: (pct: number) => void;
  rightHeader?: React.ReactNode;
};

function SwapPanel({
  label,
  token,
  chain,
  amountInput,
  usdValue,
  balance,
  balanceLoading,
  onPickToken,
  onPercent,
  rightHeader,
}: SwapPanelProps) {
  const showBalance = typeof balance === "number";
  const showPercents = !!onPercent && showBalance && (balance ?? 0) > 0;
  return (
    <div
      style={{
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <label style={{ fontSize: 12, color: VS.textMuted, fontWeight: 500 }}>
          {label}
        </label>
        {rightHeader}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>{amountInput}</div>
        <TokenPill token={token} chain={chain} onClick={onPickToken} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
          color: VS.textMuted,
          minHeight: 20,
        }}
      >
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {typeof usdValue === "number" ? formatUsd(usdValue) : "$0.00"}
        </span>
        {showBalance ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              Balance: {formatAmount(balance)}
            </span>
            {showPercents && (
              <>
                <PercentButton onClick={() => onPercent?.(0.2)}>20%</PercentButton>
                <PercentButton onClick={() => onPercent?.(0.5)}>50%</PercentButton>
                <PercentButton onClick={() => onPercent?.(1)}>MAX</PercentButton>
              </>
            )}
          </div>
        ) : balanceLoading ? (
          <span style={{ color: VS.textDim }}>Loading balances…</span>
        ) : null}
      </div>
    </div>
  );
}

function PercentButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: `1px solid ${VS.border}`,
        borderRadius: 999,
        color: VS.textMuted,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        cursor: "pointer",
        letterSpacing: 0.4,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = VS.borderStrong;
        e.currentTarget.style.color = VS.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = VS.border;
        e.currentTarget.style.color = VS.textMuted;
      }}
    >
      {children}
    </button>
  );
}

// ── Compact token pill ─────────────────────────────────────────────────────
// Auto-width pill placed beside the amount input. Shows token icon (with
// chain badge), ticker, chain name, and a chevron. Click → opens picker.
function TokenPill({
  token,
  chain,
  onClick,
}: {
  token: PickerToken;
  chain: { id: number; name: string; icon: string } | undefined;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px 6px 8px",
        background: VS.surface2,
        border: `1px solid ${VS.border}`,
        borderRadius: 999,
        color: VS.text,
        cursor: "pointer",
        textAlign: "left",
        flexShrink: 0,
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = VS.borderStrong;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = VS.border;
      }}
    >
      <TokenIcon
        token={token}
        chain={chain ? { ...chain, ticker: chain.name } : undefined}
        size={26}
      />
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2 }}>
          {token.ticker}
        </span>
        <span style={{ fontSize: 10, color: VS.textMuted, marginTop: 2 }}>
          {chain?.name ?? `Chain ${token.chain_id}`}
        </span>
      </span>
      <span style={{ color: VS.textMuted, fontSize: 12, marginLeft: 4 }} aria-hidden>
        ▾
      </span>
    </button>
  );
}

// ── Read-only output amount ────────────────────────────────────────────────
// Renders the destination amount in the To panel. Shimmer when loading and
// no prior value, big tabular display otherwise.
function ReadOnlyAmount({
  value,
  loading,
}: {
  value: number | undefined;
  loading: boolean;
}) {
  if (loading && (value === undefined || value === 0)) {
    return (
      <div
        style={{
          height: 38,
          width: "60%",
          background: `linear-gradient(90deg, ${VS.surface2}, ${VS.border}, ${VS.surface2})`,
          backgroundSize: "200% 100%",
          borderRadius: 8,
          animation: "vs-shimmer 1.4s ease-in-out infinite",
        }}
        aria-busy
      />
    );
  }
  return (
    <div
      style={{
        fontSize: 32,
        fontWeight: 700,
        color: value ? VS.text : VS.textDim,
        letterSpacing: -0.8,
        fontVariantNumeric: "tabular-nums",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {value ? formatAmount(value) : "0"}
    </div>
  );
}
