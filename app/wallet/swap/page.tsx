"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApiKeys, useWalletReady } from "@/app/providers";
import { balanceOf, findToken, TOKENS, type Token } from "@/lib/wallet/swap/tokens";
import { formatDuration, quoteSwap, type SwapQuote } from "@/lib/wallet/swap/router";
import { fetchLiveQuote } from "@/lib/wallet/swap/api";
import { REAL_EXECUTION_ENABLED } from "@/lib/wallet/swap/execute";
import { ChainGlyph } from "../components/chain-glyph";
import { TokenPicker } from "./components/token-picker";
import { useRealSwap } from "./use-real-swap";

const EVM_KINDS = new Set(["eth", "arb", "base", "op", "polygon", "bsc"]);

type Stage = "edit" | "review" | "pending" | "success";
type Phase = "broadcasting" | "bridging" | "settling" | "done";

// Outer gates on `useWalletReady` so wagmi-dependent hooks inside Inner only
// run after the parent provider's `mounted` flag flips. Without this, static
// prerender fails with "useConfig must be used within WagmiProvider".
export default function SwapPage() {
  const ready = useWalletReady();
  if (!ready) {
    return (
      <div className="mt-6 text-center text-sm" style={{ color: "var(--color-slush-ink-muted)" }}>
        Loading swap…
      </div>
    );
  }
  return <SwapPageInner />;
}

function SwapPageInner() {
  const [fromId, setFromId] = useState("sui-sui");
  const [toId, setToId] = useState("btc-btc");
  const [amountStr, setAmountStr] = useState("");
  const [picker, setPicker] = useState<null | "from" | "to">(null);
  const [stage, setStage] = useState<Stage>("edit");
  const [phase, setPhase] = useState<Phase>("broadcasting");
  const [liveQuote, setLiveQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const { apiKey } = useApiKeys();

  const from = findToken(fromId)!;
  const to = findToken(toId)!;
  const amountIn = parseFloat(amountStr) || 0;
  const mockQuote = useMemo(() => quoteSwap(fromId, toId, amountIn), [fromId, toId, amountIn]);
  // Live quote when CV agrees with us, otherwise show the local one so the
  // amount field never goes blank.
  const quote = liveQuote ?? mockQuote;
  const balance = balanceOf(fromId);

  // Real-execution path is gated behind a flag and only available for
  // EVM-source swaps (the only chain we have a working derived-key
  // connector for so far).
  const canExecuteReal = REAL_EXECUTION_ENABLED && EVM_KINDS.has(from.chain);
  const realSwap = useRealSwap(apiKey);

  // Kick off a live quote whenever inputs settle. Debounced so we don't slam
  // the backend while the user is typing.
  useEffect(() => {
    setLiveQuote(null);
    if (!apiKey || amountIn <= 0 || stage !== "edit") return;
    let cancelled = false;
    setQuoteLoading(true);
    const handle = setTimeout(async () => {
      const live = await fetchLiveQuote(from, to, amountIn, apiKey);
      if (cancelled) return;
      setLiveQuote(live);
      setQuoteLoading(false);
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(handle);
      setQuoteLoading(false);
    };
  }, [apiKey, amountIn, fromId, toId, stage, from, to]);

  function flip() {
    setFromId(toId);
    setToId(fromId);
    setAmountStr("");
  }

  function setPercent(pct: number) {
    setAmountStr((balance * pct).toFixed(Math.min(from.decimals, 6)));
  }

  // Mock progression through bridge phases. Real version (canExecuteReal)
  // subscribes to paykit's order state machine via useRealSwap.
  useEffect(() => {
    if (stage !== "pending" || !quote) return;
    if (canExecuteReal) return; // real path drives its own state
    setPhase("broadcasting");
    const t1 = setTimeout(() => setPhase(quote.isCrossChain ? "bridging" : "settling"), 1200);
    const t2 = setTimeout(() => setPhase("settling"), quote.isCrossChain ? 2800 : 1800);
    const t3 = setTimeout(() => {
      setPhase("done");
      setStage("success");
    }, quote.isCrossChain ? 4200 : 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [stage, quote, canExecuteReal]);

  // Real-execution status → success transition.
  useEffect(() => {
    if (!canExecuteReal) return;
    if (stage !== "pending") return;
    if (realSwap.state.status === "completed") setStage("success");
  }, [canExecuteReal, stage, realSwap.state.status]);

  function handleConfirm() {
    setStage("pending");
    if (canExecuteReal) {
      realSwap.start(from, to, amountStr);
    }
  }

  return (
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3 px-1">
        <Link
          href="/wallet"
          aria-label="Back"
          className="size-9 rounded-full grid place-items-center"
          style={{ background: "var(--color-slush-card)" }}
        >
          <BackArrow />
        </Link>
        <h1 className="text-lg font-semibold">Swap</h1>
      </header>

      {(stage === "edit" || stage === "review") && (
        <div className="space-y-2">
          <SwapBox
            label="You Pay"
            token={from}
            balance={balance}
            amount={amountStr}
            editable
            onChangeAmount={setAmountStr}
            onPickToken={() => setPicker("from")}
            onPercent={setPercent}
          />
          <div className="flex justify-center -my-1 relative z-10">
            <button
              type="button"
              aria-label="Flip swap direction"
              onClick={flip}
              className="size-10 rounded-full grid place-items-center shadow-sm"
              style={{ background: "var(--color-slush-blue)", color: "white" }}
            >
              <FlipArrows />
            </button>
          </div>
          <SwapBox
            label="You Receive"
            token={to}
            balance={balanceOf(toId)}
            amount={quote ? quote.amountOut.toFixed(6).replace(/\.?0+$/, "") : ""}
            editable={false}
            onChangeAmount={() => {}}
            onPickToken={() => setPicker("to")}
            onPercent={() => {}}
          />

          {quote && <RouteSummary quote={quote} loading={quoteLoading} />}

          <div className="pt-2">
            <PrimaryButton
              disabled={!quote || amountIn > balance}
              onClick={() => setStage("review")}
            >
              {!quote
                ? "Enter an amount"
                : amountIn > balance
                ? `Insufficient ${from.symbol}`
                : "Review Swap"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {stage === "pending" && quote && (
        <>
          <PendingSheet
            quote={quote}
            phase={phase}
            realState={canExecuteReal ? realSwap.state : undefined}
          />
          {canExecuteReal && realSwap.state.status === "failed" && (
            <button
              type="button"
              onClick={() => {
                setStage("edit");
                realSwap.reset();
              }}
              className="w-full rounded-full py-3 mt-3 font-semibold"
              style={{ background: "var(--color-slush-card-tint)" }}
            >
              Back to swap
            </button>
          )}
        </>
      )}

      {stage === "success" && quote && (
        <SuccessSheet
          quote={quote}
          onDone={() => {
            setStage("edit");
            setAmountStr("");
            realSwap.reset();
          }}
        />
      )}

      {picker && (
        <TokenPicker
          tokens={TOKENS}
          selectedId={picker === "from" ? fromId : toId}
          excludeId={picker === "from" ? toId : fromId}
          onPick={(t) => {
            if (picker === "from") setFromId(t.id);
            else setToId(t.id);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {stage === "review" && quote && (
        <ReviewSheet
          quote={quote}
          onCancel={() => setStage("edit")}
          onConfirm={handleConfirm}
          isReal={canExecuteReal}
        />
      )}
    </div>
  );
}

function SwapBox({
  label,
  token,
  balance,
  amount,
  editable,
  onChangeAmount,
  onPickToken,
  onPercent,
}: {
  label: string;
  token: Token;
  balance: number;
  amount: string;
  editable: boolean;
  onChangeAmount: (v: string) => void;
  onPickToken: () => void;
  onPercent: (pct: number) => void;
}) {
  return (
    <div className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--color-slush-ink-muted)" }}>
          {label}
        </span>
        <span className="text-[11px] font-mono" style={{ color: "var(--color-slush-ink-muted)" }}>
          balance: {balance.toFixed(Math.min(token.decimals, 6)).replace(/\.?0+$/, "") || "0"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          inputMode="decimal"
          placeholder="0"
          readOnly={!editable}
          value={amount}
          onChange={(e) => onChangeAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className="flex-1 bg-transparent border-none text-3xl font-bold p-0 focus:ring-0 focus:outline-none"
          style={{ minWidth: 0, padding: 0, border: "none", boxShadow: "none" }}
        />
        <button
          type="button"
          onClick={onPickToken}
          className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 shrink-0"
          style={{ background: "var(--color-slush-card-tint)" }}
        >
          <ChainGlyph chain={token.chain} size={28} />
          <span className="font-semibold text-sm">{token.symbol}</span>
          <DownChevron />
        </button>
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        ${(parseFloat(amount || "0") * token.priceUsd).toFixed(2)}
      </div>
      {editable && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[0.25, 0.5, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPercent(p)}
              className="rounded-full py-1.5 text-sm font-semibold"
              style={{ background: "var(--color-slush-card-tint)" }}
            >
              {p === 1 ? "Max" : `${p * 100}%`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RouteSummary({ quote, loading }: { quote: SwapQuote; loading?: boolean }) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-4 py-3 text-xs"
      style={{ background: "var(--color-slush-card)", color: "var(--color-slush-ink-muted)" }}
    >
      <span>
        1 {quote.from.symbol} ≈ {quote.rate.toFixed(6).replace(/\.?0+$/, "")} {quote.to.symbol}
      </span>
      <span className="flex items-center gap-1.5">
        {quote.source === "live" ? (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: "#0a9c5c", color: "white" }}
          >
            LIVE
          </span>
        ) : loading ? (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: "var(--color-slush-divider)", color: "var(--color-slush-ink-muted)" }}
          >
            QUOTING…
          </span>
        ) : (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: "var(--color-slush-divider)", color: "var(--color-slush-ink-muted)" }}
          >
            EST
          </span>
        )}
        {quote.isCrossChain && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: "var(--color-slush-blue)", color: "white" }}
          >
            CROSS-CHAIN
          </span>
        )}
        <span>{formatDuration(quote.estimatedSeconds)}</span>
      </span>
    </div>
  );
}

function ReviewSheet({
  quote,
  onCancel,
  onConfirm,
  isReal,
}: {
  quote: SwapQuote;
  onCancel: () => void;
  onConfirm: () => void;
  isReal?: boolean;
}) {
  return (
    <BottomSheet onDismiss={onCancel}>
      <h2 className="text-lg font-semibold mb-3">Review Swap</h2>
      <RoutePreview quote={quote} />

      <dl className="text-sm mt-4 space-y-2">
        <Row k="Rate" v={`1 ${quote.from.symbol} = ${quote.rate.toFixed(6).replace(/\.?0+$/, "")} ${quote.to.symbol}`} />
        <Row k="Network fee" v={`$${quote.feeUsd.toFixed(2)}`} />
        <Row k="Price impact" v={`${quote.priceImpactPct.toFixed(2)}%`} />
        <Row k="Estimated time" v={formatDuration(quote.estimatedSeconds)} />
        <Row k="Route" v={quote.protocol} />
      </dl>

      {isReal && (
        <div
          className="mt-3 rounded-xl px-3 py-2 text-[11px] flex items-start gap-2"
          style={{ background: "rgba(10, 156, 92, 0.08)", color: "#0a9c5c" }}
        >
          <span>●</span>
          <span>
            Real execution enabled. Confirming will broadcast a transaction
            from your derived EVM address.
          </span>
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full py-3 font-semibold"
          style={{ background: "var(--color-slush-card-tint)" }}
        >
          Cancel
        </button>
        <PrimaryButton onClick={onConfirm}>{isReal ? "Confirm & Broadcast" : "Confirm Swap"}</PrimaryButton>
      </div>
    </BottomSheet>
  );
}

function PendingSheet({
  quote,
  phase,
  realState,
}: {
  quote: SwapQuote;
  phase: Phase;
  realState?: import("@/lib/wallet/swap/execute").SwapExecutionState;
}) {
  const realLabel = realState
    ? {
        preparing: "Preparing order…",
        awaiting_signature: "Signing transaction…",
        broadcasting: "Broadcasting on source chain…",
        awaiting_confirmation: "Awaiting confirmation…",
        executing: `Executing via ${quote.protocol}…`,
        completed: "Done",
        failed: realState.error ?? "Swap failed",
      }[realState.status]
    : null;

  const mockLabels: Record<Phase, string> = {
    broadcasting: "Broadcasting transaction…",
    bridging: `Bridging via ${quote.protocol}…`,
    settling: `Settling on ${chainLabel(quote.to.chain)}…`,
    done: "Done",
  };

  const heading = realState ? "Swapping (live)" : "Swapping…";
  const subLabel = realLabel ?? mockLabels[phase];
  const isFailed = realState?.status === "failed";

  return (
    <div className="rounded-3xl p-6 mt-2 text-center" style={{ background: "var(--color-slush-card)" }}>
      {isFailed ? (
        <div
          className="mx-auto size-12 rounded-full grid place-items-center"
          style={{ background: "#d04848", color: "white", fontSize: 24 }}
        >
          ✕
        </div>
      ) : (
        <Spinner />
      )}
      <h2 className="text-lg font-semibold mt-4">{isFailed ? "Swap failed" : heading}</h2>
      <p className="text-sm mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        {subLabel}
      </p>
      <RoutePreview quote={quote} className="mt-5" />

      {realState ? (
        <div className="mt-5 flex flex-col gap-2 text-left text-sm">
          <PhaseRow
            label="Sign + broadcast"
            active={["broadcasting", "awaiting_confirmation", "executing", "completed"].includes(realState.status)}
          />
          <PhaseRow
            label={quote.isCrossChain ? `Bridge via ${quote.protocol}` : "Settle on source"}
            active={["executing", "completed"].includes(realState.status)}
          />
          <PhaseRow
            label={`Arrives on ${chainLabel(quote.to.chain)}`}
            active={realState.status === "completed"}
          />
          {realState.txHash && (
            <p className="text-[10px] font-mono mt-1 break-all" style={{ color: "var(--color-slush-ink-muted)" }}>
              tx: {realState.txHash}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2 text-left text-sm">
          <PhaseRow label="Source transaction" active={phase !== "broadcasting"} />
          {quote.isCrossChain && (
            <PhaseRow label={`Bridge: ${quote.protocol}`} active={phase === "settling" || phase === "done"} />
          )}
          <PhaseRow label={`Arrives on ${chainLabel(quote.to.chain)}`} active={phase === "done"} />
        </div>
      )}
    </div>
  );
}

function SuccessSheet({ quote, onDone }: { quote: SwapQuote; onDone: () => void }) {
  return (
    <div className="rounded-3xl p-6 mt-2 text-center" style={{ background: "var(--color-slush-card)" }}>
      <div
        className="mx-auto size-16 rounded-full grid place-items-center"
        style={{ background: "var(--color-slush-blue)", color: "white" }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mt-4">You&rsquo;re All Set</h2>
      <p className="text-sm mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        Received <strong>{quote.amountOut.toFixed(6).replace(/\.?0+$/, "")} {quote.to.symbol}</strong> on {chainLabel(quote.to.chain)}.
      </p>
      <RoutePreview quote={quote} className="mt-5" />
      <div className="mt-5">
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </div>
    </div>
  );
}

function RoutePreview({ quote, className = "" }: { quote: SwapQuote; className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${className}`}
      style={{ background: "var(--color-slush-card-tint)" }}
    >
      <ChainGlyph chain={quote.from.chain} size={32} />
      <div className="flex-1 text-sm text-left">
        <div className="font-semibold">
          {quote.amountIn.toFixed(6).replace(/\.?0+$/, "")} {quote.from.symbol}
        </div>
        <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
          on {chainLabel(quote.from.chain)}
        </div>
      </div>
      <svg width="24" height="14" viewBox="0 0 24 14" style={{ color: "var(--color-slush-ink-muted)" }}>
        <path d="M0 7h22m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <ChainGlyph chain={quote.to.chain} size={32} />
      <div className="flex-1 text-sm text-right">
        <div className="font-semibold">
          {quote.amountOut.toFixed(6).replace(/\.?0+$/, "")} {quote.to.symbol}
        </div>
        <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
          on {chainLabel(quote.to.chain)}
        </div>
      </div>
    </div>
  );
}

function PhaseRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
      style={{
        background: active ? "var(--color-slush-card-tint)" : "transparent",
        color: active ? "var(--color-slush-ink)" : "var(--color-slush-ink-muted)",
        opacity: active ? 1 : 0.6,
      }}
    >
      <span
        className="size-5 rounded-full grid place-items-center text-[10px]"
        style={{ background: active ? "var(--color-slush-blue)" : "var(--color-slush-divider)", color: "white" }}
      >
        {active ? "✓" : ""}
      </span>
      <span>{label}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt style={{ color: "var(--color-slush-ink-muted)" }}>{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-full py-3.5 font-semibold transition-colors"
      style={{
        background: disabled ? "var(--color-slush-divider)" : "var(--color-slush-blue)",
        color: disabled ? "var(--color-slush-ink-muted)" : "white",
      }}
    >
      {children}
    </button>
  );
}

function BottomSheet({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(10,22,38,0.4)" }} onClick={onDismiss}>
      <div
        className="w-full max-w-[420px] rounded-t-3xl p-5 pb-8"
        style={{ background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-12 h-1 rounded-full mb-4" style={{ background: "var(--color-slush-divider)" }} />
        {children}
      </div>
    </div>
  );
}

function chainLabel(c: string): string {
  return { sui: "Sui", btc: "Bitcoin", sol: "Solana", eth: "Ethereum", arb: "Arbitrum", base: "Base", op: "Optimism", polygon: "Polygon", bsc: "BNB Chain" }[c] ?? c;
}

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function DownChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FlipArrows() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="mx-auto block size-12 rounded-full"
      style={{
        border: "4px solid var(--color-slush-divider)",
        borderTopColor: "var(--color-slush-blue)",
        animation: "vs-spin 0.9s linear infinite",
      }}
    />
  );
}
