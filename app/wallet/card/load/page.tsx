"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { balanceOf, findToken, TOKENS, type Token } from "@/lib/wallet/swap/tokens";
import { CARD, fundingToken } from "@/lib/wallet/card";
import { formatDuration, quoteSwap, type SwapQuote } from "@/lib/wallet/swap/router";
import { ChainGlyph } from "../../components/chain-glyph";
import { TokenPicker } from "../../swap/components/token-picker";

type Stage = "edit" | "review" | "pending" | "success";
type Phase = "broadcasting" | "routing" | "crediting" | "done";

export default function LoadPage() {
  const [fromId, setFromId] = useState("base-usdc");
  const [amountStr, setAmountStr] = useState("");
  const [picker, setPicker] = useState(false);
  const [stage, setStage] = useState<Stage>("edit");
  const [phase, setPhase] = useState<Phase>("broadcasting");

  const from = findToken(fromId)!;
  const card = fundingToken();
  const amountIn = parseFloat(amountStr) || 0;
  const balance = balanceOf(fromId);
  const quote = useMemo(() => quoteSwap(fromId, card.id, amountIn), [fromId, card.id, amountIn]);
  const cardCreditUsd = quote ? quote.amountOut * card.priceUsd : 0;

  useEffect(() => {
    if (stage !== "pending" || !quote) return;
    setPhase("broadcasting");
    const t1 = setTimeout(() => setPhase(quote.isCrossChain ? "routing" : "crediting"), 1200);
    const t2 = setTimeout(() => setPhase("crediting"), quote.isCrossChain ? 2800 : 1800);
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
        <h1 className="text-lg font-semibold">Load Card</h1>
      </header>

      {(stage === "edit" || stage === "review") && (
        <div className="space-y-2">
          <div className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--color-slush-ink-muted)" }}>
                You Pay
              </span>
              <span className="text-[11px] font-mono" style={{ color: "var(--color-slush-ink-muted)" }}>
                balance: {balance.toFixed(Math.min(from.decimals, 6)).replace(/\.?0+$/, "") || "0"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                inputMode="decimal"
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
                className="flex-1 bg-transparent border-none text-3xl font-bold p-0 focus:ring-0 focus:outline-none"
                style={{ minWidth: 0, padding: 0, border: "none", boxShadow: "none" }}
              />
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 shrink-0"
                style={{ background: "var(--color-slush-card-tint)" }}
              >
                <ChainGlyph chain={from.chain} size={28} />
                <span className="font-semibold text-sm">{from.symbol}</span>
                <DownChevron />
              </button>
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
              ${(amountIn * from.priceUsd).toFixed(2)}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[0.25, 0.5, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmountStr((balance * p).toFixed(Math.min(from.decimals, 6)))}
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
                Card Receives
              </span>
              <span className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
                Slush •••• {CARD.last4}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-3xl font-bold" style={{ color: amountIn > 0 ? "var(--color-slush-ink)" : "var(--color-slush-ink-muted)" }}>
                ${cardCreditUsd > 0 ? cardCreditUsd.toFixed(2) : "0.00"}
              </span>
              <span
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 shrink-0"
                style={{ background: "var(--color-slush-card-tint)" }}
              >
                <ChainGlyph chain="base" size={28} />
                <span className="font-semibold text-sm">USDC</span>
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
              Settles to your card on Base
            </div>
          </div>

          {quote && <RouteSummary quote={quote} />}

          <div className="pt-2">
            <PrimaryButton
              disabled={!quote || amountIn > balance}
              onClick={() => setStage("review")}
            >
              {!quote
                ? "Enter an amount"
                : amountIn > balance
                ? `Insufficient ${from.symbol}`
                : "Review Load"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {stage === "pending" && quote && (
        <PendingSheet quote={quote} phase={phase} />
      )}

      {stage === "success" && quote && (
        <SuccessSheet
          creditUsd={quote.amountOut * card.priceUsd}
          fromSymbol={from.symbol}
          amountIn={quote.amountIn}
          onDone={() => {
            setStage("edit");
            setAmountStr("");
          }}
        />
      )}

      {picker && (
        <TokenPicker
          tokens={TOKENS}
          selectedId={fromId}
          onPick={(t) => {
            setFromId(t.id);
            setPicker(false);
          }}
          onClose={() => setPicker(false)}
        />
      )}

      {stage === "review" && quote && (
        <ReviewSheet
          quote={quote}
          creditUsd={quote.amountOut * card.priceUsd}
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
  creditUsd,
  onCancel,
  onConfirm,
}: {
  quote: SwapQuote;
  creditUsd: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <BottomSheet onDismiss={onCancel}>
      <h2 className="text-lg font-semibold mb-3">Review Load</h2>

      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: "var(--color-slush-card-tint)" }}
      >
        <ChainGlyph chain={quote.from.chain} size={32} />
        <div className="flex-1 text-sm">
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
        <div className="text-right text-sm">
          <div className="font-semibold">${creditUsd.toFixed(2)}</div>
          <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
            Slush •••• {CARD.last4}
          </div>
        </div>
      </div>

      <dl className="text-sm mt-4 space-y-2">
        <Row k="You pay" v={`${quote.amountIn.toFixed(6).replace(/\.?0+$/, "")} ${quote.from.symbol}`} />
        <Row k="Card credit" v={`$${creditUsd.toFixed(2)}`} />
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
          Funds settle to USDC on Base, the card&apos;s funding asset. Available
          balance updates within seconds of settlement.
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
        <PrimaryButton onClick={onConfirm}>Confirm Load</PrimaryButton>
      </div>
    </BottomSheet>
  );
}

function PendingSheet({ quote, phase }: { quote: SwapQuote; phase: Phase }) {
  const labels: Record<Phase, string> = {
    broadcasting: "Broadcasting transaction…",
    routing: `Routing via ${quote.protocol}…`,
    crediting: `Crediting card •••• ${CARD.last4}…`,
    done: "Done",
  };
  return (
    <div className="rounded-3xl p-6 mt-2 text-center" style={{ background: "var(--color-slush-card)" }}>
      <Spinner />
      <h2 className="text-lg font-semibold mt-4">Loading card…</h2>
      <p className="text-sm mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        {labels[phase]}
      </p>
      <div className="mt-5 flex flex-col gap-2 text-left text-sm">
        <PhaseRow label="Source transaction" active={phase !== "broadcasting"} />
        {quote.isCrossChain && (
          <PhaseRow label={`Bridge: ${quote.protocol}`} active={phase === "crediting" || phase === "done"} />
        )}
        <PhaseRow label="Card credited" active={phase === "done"} />
      </div>
    </div>
  );
}

function SuccessSheet({
  creditUsd,
  fromSymbol,
  amountIn,
  onDone,
}: {
  creditUsd: number;
  fromSymbol: string;
  amountIn: number;
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
      <h2 className="text-xl font-semibold mt-4">Card Loaded</h2>
      <p className="text-sm mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        <strong>${creditUsd.toFixed(2)}</strong> credited to •••• {CARD.last4} from{" "}
        <strong>{amountIn.toFixed(6).replace(/\.?0+$/, "")} {fromSymbol}</strong>.
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
