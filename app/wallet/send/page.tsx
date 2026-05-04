"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { balanceOf, findToken, TOKENS } from "@/lib/wallet/swap/tokens";
import { validateAddress } from "@/lib/wallet/send/validate";
import { ChainGlyph } from "../components/chain-glyph";
import { TokenPicker } from "../swap/components/token-picker";

type Stage = "edit" | "review" | "pending" | "success";

export default function SendPage() {
  const [tokenId, setTokenId] = useState("sui-sui");
  const [amountStr, setAmountStr] = useState("");
  const [recipient, setRecipient] = useState("");
  const [picker, setPicker] = useState(false);
  const [stage, setStage] = useState<Stage>("edit");

  const token = findToken(tokenId)!;
  const balance = balanceOf(tokenId);
  const amount = parseFloat(amountStr) || 0;
  const validation = useMemo(() => validateAddress(token.chain, recipient), [token.chain, recipient]);

  // Mock send: brief broadcasting state, then success.
  useEffect(() => {
    if (stage !== "pending") return;
    const t = setTimeout(() => setStage("success"), 1800);
    return () => clearTimeout(t);
  }, [stage]);

  const canReview = amount > 0 && amount <= balance && validation.valid;

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
        <h1 className="text-lg font-semibold">Send</h1>
      </header>

      {(stage === "edit" || stage === "review") && (
        <>
          <div className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--color-slush-ink-muted)" }}>
                You Send
              </span>
              <span className="text-[11px] font-mono" style={{ color: "var(--color-slush-ink-muted)" }}>
                balance: {balance.toFixed(Math.min(token.decimals, 6)).replace(/\.?0+$/, "") || "0"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                inputMode="decimal"
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
                className="flex-1 bg-transparent border-none text-3xl font-bold p-0"
                style={{ minWidth: 0, padding: 0, border: "none", boxShadow: "none" }}
              />
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 shrink-0"
                style={{ background: "var(--color-slush-card-tint)" }}
              >
                <ChainGlyph chain={token.chain} size={28} />
                <span className="font-semibold text-sm">{token.symbol}</span>
                <DownChevron />
              </button>
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
              ${(amount * token.priceUsd).toFixed(2)}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[0.25, 0.5, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmountStr((balance * p).toFixed(Math.min(token.decimals, 6)))}
                  className="rounded-full py-1.5 text-sm font-semibold"
                  style={{ background: "var(--color-slush-card-tint)" }}
                >
                  {p === 1 ? "Max" : `${p * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
            <label
              htmlFor="recipient"
              className="block text-xs font-medium mb-2"
              style={{ color: "var(--color-slush-ink-muted)" }}
            >
              Recipient on {chainLabel(token.chain)}
            </label>
            <textarea
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={placeholderFor(token.chain)}
              rows={2}
              className="w-full bg-transparent text-sm font-mono resize-none"
              style={{ border: "1px solid var(--color-slush-divider)", borderRadius: 12, padding: "10px 12px" }}
            />
            {recipient && !validation.valid && (
              <p className="text-xs mt-1.5" style={{ color: "#d04848" }}>
                {validation.reason}
              </p>
            )}
            {validation.valid && (
              <p className="text-xs mt-1.5" style={{ color: "var(--color-slush-blue-deep)" }}>
                ✓ Valid {chainLabel(token.chain)} address
              </p>
            )}
          </div>

          <div className="pt-2">
            <PrimaryButton disabled={!canReview} onClick={() => setStage("review")}>
              {amount === 0
                ? "Enter an amount"
                : amount > balance
                ? `Insufficient ${token.symbol}`
                : !recipient
                ? "Enter a recipient"
                : !validation.valid
                ? "Invalid address"
                : "Review Send"}
            </PrimaryButton>
          </div>
        </>
      )}

      {stage === "pending" && (
        <div className="rounded-3xl p-6 mt-2 text-center" style={{ background: "var(--color-slush-card)" }}>
          <Spinner />
          <h2 className="text-lg font-semibold mt-4">Broadcasting…</h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
            Submitting to the {chainLabel(token.chain)} network
          </p>
        </div>
      )}

      {stage === "success" && (
        <div className="rounded-3xl p-6 mt-2 text-center" style={{ background: "var(--color-slush-card)" }}>
          <div
            className="mx-auto size-16 rounded-full grid place-items-center"
            style={{ background: "var(--color-slush-blue)", color: "white" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5L20 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mt-4">Sent</h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-slush-ink-muted)" }}>
            <strong>{amount} {token.symbol}</strong> on its way to{" "}
            <span className="font-mono">{recipient.slice(0, 8)}…{recipient.slice(-6)}</span>
          </p>
          <div className="mt-5">
            <PrimaryButton
              onClick={() => {
                setStage("edit");
                setAmountStr("");
                setRecipient("");
              }}
            >
              Done
            </PrimaryButton>
          </div>
        </div>
      )}

      {stage === "review" && (
        <ReviewSheet
          tokenSymbol={token.symbol}
          chain={token.chain}
          amount={amount}
          recipient={recipient}
          onCancel={() => setStage("edit")}
          onConfirm={() => setStage("pending")}
        />
      )}

      {picker && (
        <TokenPicker
          tokens={TOKENS}
          selectedId={tokenId}
          onPick={(t) => {
            setTokenId(t.id);
            setRecipient(""); // chain may have changed → reset recipient
            setPicker(false);
          }}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  );
}

function ReviewSheet({
  tokenSymbol,
  chain,
  amount,
  recipient,
  onCancel,
  onConfirm,
}: {
  tokenSymbol: string;
  chain: import("@/lib/wallet/core").ChainKey;
  amount: number;
  recipient: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(10,22,38,0.4)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[420px] rounded-t-3xl p-5 pb-8"
        style={{ background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-12 h-1 rounded-full mb-4" style={{ background: "var(--color-slush-divider)" }} />
        <h2 className="text-lg font-semibold mb-3">Review Send</h2>

        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: "var(--color-slush-card-tint)" }}
        >
          <ChainGlyph chain={chain} size={36} />
          <div className="flex-1">
            <div className="font-semibold">
              {amount} {tokenSymbol}
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
              on {chainLabel(chain)}
            </div>
          </div>
        </div>

        <dl className="text-sm mt-4 space-y-2">
          <div>
            <dt className="text-xs" style={{ color: "var(--color-slush-ink-muted)" }}>
              Recipient
            </dt>
            <dd className="font-mono break-all text-xs mt-0.5">{recipient}</dd>
          </div>
        </dl>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full py-3 font-semibold"
            style={{ background: "var(--color-slush-card-tint)" }}
          >
            Cancel
          </button>
          <PrimaryButton onClick={onConfirm}>Confirm Send</PrimaryButton>
        </div>
      </div>
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

function placeholderFor(c: import("@/lib/wallet/core").ChainKey): string {
  return {
    sui: "0x… (Sui address)",
    btc: "bc1q… (Bitcoin Native SegWit)",
    sol: "Solana base58 address",
    eth: "0x… (Ethereum)",
    arb: "0x… (Arbitrum)",
    base: "0x… (Base)",
    op: "0x… (Optimism)",
    polygon: "0x… (Polygon)",
    bsc: "0x… (BNB Chain)",
  }[c];
}

function chainLabel(c: import("@/lib/wallet/core").ChainKey): string {
  return {
    sui: "Sui",
    btc: "Bitcoin",
    sol: "Solana",
    eth: "Ethereum",
    arb: "Arbitrum",
    base: "Base",
    op: "Optimism",
    polygon: "Polygon",
    bsc: "BNB Chain",
  }[c];
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
