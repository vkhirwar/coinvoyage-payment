"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { findToken, TOKENS, type Token } from "@/lib/wallet/swap/tokens";
import { CARD, fundingToken } from "@/lib/wallet/card";
import { formatDuration, quoteSwap, type SwapQuote } from "@/lib/wallet/swap/router";
import { ChainGlyph } from "../../components/chain-glyph";
import { TokenPicker } from "../../swap/components/token-picker";

type Stage = "edit" | "review" | "pending" | "success";
type Phase = "debiting" | "routing" | "settling" | "done";

export default function WithdrawPage() {
  const [toId, setToId] = useState("sui-usdc");
  const [usdStr, setUsdStr] = useState("");
  const [picker, setPicker] = useState(false);
  const [stage, setStage] = useState<Stage>("edit");
  const [phase, setPhase] = useState<Phase>("debiting");

  const card = fundingToken();
  const to = findToken(toId)!;
  const usdAmount = parseFloat(usdStr) || 0;
  // The card holds USDC.base; user picks how many USD to pull off, which
  // maps 1:1 to USDC.base amountIn.
  const quote = useMemo(() => quoteSwap(card.id, toId, usdAmount), [card.id, toId, usdAmount]);

  useEffect(() => {
    if (stage !== "pending" || !quote) return;
    setPhase("debiting");
    const t1 = setTimeout(() => setPhase(quote.isCrossChain ? "routing" : "settling"), 1200);
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
  }, [stage, quote]);

  const overBalance = usdAmount > CARD.balanceUsd;

  return (
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3 px-1">
        <Link
          href="/wallet/card"
          aria-label="Back"
          className="size-9 rounded-full grid place-items-center"
          style={{ background: "var(--color-slush-card)" }}
        >
          <BackArrow />
        </Link>
        <h1 className="text-lg font-semibold">Withdraw from Card</h1>
      </header>

      {(stage === "edit" || stage === "review") && (
        <div className="space-y-2">
          <div className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--color-slush-ink-muted)" }}>
                From Card
              </span>
              <span className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
                available: ${CARD.balanceUsd.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold" style={{ color: "var(--color-slush-ink-muted)" }}>$</span>
              <input
                inputMode="decimal"
                placeholder="0"
                value={usdStr}
                onChange={(e) => setUsdStr(e.target.value.replace(/[^0-9.]/g, ""))}
                className="flex-1 bg-transparent border-none text-3xl font-bold p-0 focus:ring-0 focus:outline-none"
                style={{ minWidth: 0, padding: 0, border: "none", boxShadow: "none" }}
              />
              <span
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 shrink-0"
                style={{ background: "var(--color-slush-card-tint)" }}
              >
                <span
                  className="size-7 rounded-full grid place-items-center text-white font-bold"
                  style={{ background: "linear-gradient(135deg, #4DA2FF 0%, #2660E8 100%)", fontSize: 10 }}
                >
                  S
                </span>
                <span className="font-semibold text-sm">•••• {CARD.last4}</span>
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
              Funded in USDC.base
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[0.25, 0.5, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setUsdStr((CARD.balanceUsd * p).toFixed(2))}
                  className="rounded-full py-1.5 text-sm font-semibold"
                  style={{ background: "var(--color-slush-card-tint)" }}
                >
                  {p === 1 ? "Max" : `${p * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center -my-1 relative z-10">
            <div
              className="size-10 rounded-full grid place-items-center shadow-sm"
              style={{ background: "var(--color-slush-blue)", color: "white" }}
              aria-hidden
            >
              <DownArrow />
            </div>
          </div>

          <div className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--color-slush-ink-muted)" }}>
                You Receive
              </span>
              <span className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
                in your wallet
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-3xl font-bold" style={{ color: usdAmount > 0 ? "var(--color-slush-ink)" : "var(--color-slush-ink-muted)" }}>
                {quote ? quote.amountOut.toFixed(6).replace(/\.?0+$/, "") : "0"}
              </span>
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 shrink-0"
                style={{ background: "var(--color-slush-card-tint)" }}
              >
                <ChainGlyph chain={to.chain} size={28} />
                <span className="font-semibold text-sm">{to.symbol}</span>
                <DownChevron />
              </button>
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
              ≈ ${quote ? (quote.amountOut * to.priceUsd).toFixed(2) : "0.00"} on {chainLabel(to.chain)}
            </div>
          </div>

          {quote && <RouteSummary quote={quote} />}

          <div className="pt-2">
            <PrimaryButton
              disabled={!quote || overBalance}
              onClick={() => setStage("review")}
            >
              {!quote
                ? "Enter an amount"
                : overBalance
                ? "Exceeds card balance"
                : "Review Withdrawal"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {stage === "pending" && quote && (
        <PendingSheet quote={quote} phase={phase} />
      )}

      {stage === "success" && quote && (
        <SuccessSheet
          amountOut={quote.amountOut}
          toSymbol={to.symbol}
          toChain={to.chain}
          usdAmount={usdAmount}
          onDone={() => {
            setStage("edit");
            setUsdStr("");
          }}
        />
      )}

      {picker && (
        <TokenPicker
          tokens={TOKENS}
          selectedId={toId}
          excludeId={card.id}
          onPick={(t) => {
            setToId(t.id);
            setPicker(false);
          }}
          onClose={() => setPicker(false)}
        />
      )}

      {stage === "review" && quote && (
        <ReviewSheet
          quote={quote}
          usdAmount={usdAmount}
          onCancel={() => setStage("edit")}
          onConfirm={() => setStage("pending")}
        />
      )}
    </div>
  );
}

function RouteSummary({ quote }: { quote: SwapQuote }) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-4 py-3 text-xs"
      style={{ background: "var(--color-slush-card)", color: "var(--color-slush-ink-muted)" }}
    >
      <span>
        {quote.isCrossChain ? `Routes via ${quote.protocol}` : "Direct on-chain swap"}
      </span>
      <span className="flex items-center gap-1.5">
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
  usdAmount,
  onCancel,
  onConfirm,
}: {
  quote: SwapQuote;
  usdAmount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <BottomSheet onDismiss={onCancel}>
      <h2 className="text-lg font-semibold mb-3">Review Withdrawal</h2>

      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: "var(--color-slush-card-tint)" }}
      >
        <span
          className="size-9 rounded-full grid place-items-center text-white font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, #4DA2FF 0%, #2660E8 100%)", fontSize: 12 }}
        >
          S
        </span>
        <div className="flex-1 text-sm">
          <div className="font-semibold">${usdAmount.toFixed(2)}</div>
          <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
            Slush •••• {CARD.last4}
          </div>
        </div>
        <svg width="24" height="14" viewBox="0 0 24 14" style={{ color: "var(--color-slush-ink-muted)" }}>
          <path d="M0 7h22m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <ChainGlyph chain={quote.to.chain} size={32} />
        <div className="text-right text-sm">
          <div className="font-semibold">
            {quote.amountOut.toFixed(6).replace(/\.?0+$/, "")} {quote.to.symbol}
          </div>
          <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
            on {chainLabel(quote.to.chain)}
          </div>
        </div>
      </div>

      <dl className="text-sm mt-4 space-y-2">
        <Row k="Card debit" v={`$${usdAmount.toFixed(2)}`} />
        <Row k="You receive" v={`${quote.amountOut.toFixed(6).replace(/\.?0+$/, "")} ${quote.to.symbol}`} />
        <Row k="Network + routing fee" v={`$${quote.feeUsd.toFixed(2)}`} />
        <Row k="Estimated time" v={formatDuration(quote.estimatedSeconds)} />
        <Row k="Route" v={quote.protocol} />
      </dl>

      <div
        className="mt-3 rounded-xl px-3 py-2 text-[11px] flex items-start gap-2"
        style={{ background: "var(--color-slush-card-tint)", color: "var(--color-slush-ink-muted)" }}
      >
        <span>●</span>
        <span>
          Card balance is debited immediately. Settlement to your{" "}
          {chainLabel(quote.to.chain)} address completes within the route&apos;s
          window.
        </span>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full py-3 font-semibold"
          style={{ background: "var(--color-slush-card-tint)" }}
        >
          Cancel
        </button>
        <PrimaryButton onClick={onConfirm}>Confirm Withdrawal</PrimaryButton>
      </div>
    </BottomSheet>
  );
}

function PendingSheet({ quote, phase }: { quote: SwapQuote; phase: Phase }) {
  const labels: Record<Phase, string> = {
    debiting: "Debiting card balance…",
    routing: `Routing via ${quote.protocol}…`,
    settling: `Settling on ${chainLabel(quote.to.chain)}…`,
    done: "Done",
  };
  return (
    <div className="rounded-3xl p-6 mt-2 text-center" style={{ background: "var(--color-slush-card)" }}>
      <Spinner />
      <h2 className="text-lg font-semibold mt-4">Withdrawing…</h2>
      <p className="text-sm mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        {labels[phase]}
      </p>
      <div className="mt-5 flex flex-col gap-2 text-left text-sm">
        <PhaseRow label="Card debited" active={phase !== "debiting"} />
        {quote.isCrossChain && (
          <PhaseRow label={`Bridge: ${quote.protocol}`} active={phase === "settling" || phase === "done"} />
        )}
        <PhaseRow label={`Arrives on ${chainLabel(quote.to.chain)}`} active={phase === "done"} />
      </div>
    </div>
  );
}

function SuccessSheet({
  amountOut,
  toSymbol,
  toChain,
  usdAmount,
  onDone,
}: {
  amountOut: number;
  toSymbol: string;
  toChain: Token["chain"];
  usdAmount: number;
  onDone: () => void;
}) {
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
      <h2 className="text-xl font-semibold mt-4">Withdrawn</h2>
      <p className="text-sm mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        ${usdAmount.toFixed(2)} pulled off •••• {CARD.last4} →{" "}
        <strong>{amountOut.toFixed(6).replace(/\.?0+$/, "")} {toSymbol}</strong> on {chainLabel(toChain)}.
      </p>
      <div className="mt-5">
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
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

function PrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
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

function chainLabel(c: Token["chain"]): string {
  return { sui: "Sui", btc: "Bitcoin", sol: "Solana", eth: "Ethereum", arb: "Arbitrum", base: "Base", op: "Optimism", polygon: "Polygon", bsc: "BNB Chain" }[c];
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

function DownArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14m0 0-5-5m5 5 5-5" />
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
