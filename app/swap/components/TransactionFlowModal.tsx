"use client";

import { useEffect, useMemo } from "react";
import { VS } from "./theme";
import { TokenIcon, type PickerToken, type PickerChain } from "./TokenChainPicker";

// Provider display names + colors per CoinVoyage execution leg.
const PROVIDER_COPY: Record<string, { label: string; description: string }> = {
  UNISWAP: { label: "Uniswap", description: "Swap via Uniswap" },
  JUPITER: { label: "Jupiter", description: "Swap via Jupiter" },
  CETUS: { label: "Cetus", description: "Swap via Cetus" },
  CCTP: { label: "CCTP", description: "Bridge via Circle CCTP" },
  DIRECT_TRANSFER: { label: "Fee transfer", description: "Protocol fee" },
};

type StepState = "pending" | "active" | "complete" | "error";

type ExecutionLeg = {
  id: string;
  status?: "pending" | "completed" | "error";
  provider?: string;
  source_tx_hash?: string | null;
  destination_tx_hash?: string | null;
  error?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;

  // Tokens / chains for display.
  srcToken: PickerToken;
  dstToken: PickerToken;
  srcChain: PickerChain | undefined;
  dstChain: PickerChain | undefined;

  // /swap/data response payload (the `.data` shape — what swapData.data is).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderData: any | null;

  // Overall order status (PENDING / AWAITING_PAYMENT / EXECUTING_ORDER / COMPLETED / FAILED / EXPIRED / REFUNDED).
  orderStatus?: string;

  // User-side deposit tx hash (set once the wallet broadcasts).
  depositTxHash: string | null;

  // True while we're calling /swap/data or the user is being prompted to sign.
  isPreparing: boolean;
  isSigning: boolean;
  signError?: string | null;

  // Action: sign the deposit tx (called when user hits "Sign in wallet").
  onSign: () => void;

  // Action: try again after a wallet failure / explicit retry.
  onRetrySign?: () => void;
};

function shortHash(hash: string | null | undefined): string {
  if (!hash) return "";
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-6)}`;
}

function formatAmount(n: number | string | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (!Number.isFinite(v)) return "—";
  if (v < 0.0001) return v.toExponential(3);
  if (v < 1) return v.toFixed(6);
  if (v < 1000) return v.toFixed(4);
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function TransactionFlowModal({
  isOpen,
  onClose,
  srcToken,
  dstToken,
  srcChain,
  dstChain,
  orderData,
  orderStatus,
  depositTxHash,
  isPreparing,
  isSigning,
  signError,
  onSign,
  onRetrySign,
}: Props) {
  // Esc to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const srcAmountUi: number | undefined =
    orderData?.src?.total?.ui_amount ?? orderData?.src?.currency_amount?.ui_amount;
  const dstAmountUi: number | undefined =
    orderData?.dst?.currency_amount?.ui_amount;
  const srcTicker = orderData?.src?.ticker ?? srcToken.ticker;
  const dstTicker = orderData?.dst?.ticker ?? dstToken.ticker;
  const finalDestTxHash: string | null = orderData?.destination_tx_hash ?? null;

  const finalDestTxHashEarly: string | null = orderData?.destination_tx_hash ?? null;
  // Treat presence of the destination tx as "delivered" — the user has the
  // funds even if the backend hasn't formally flipped the order to COMPLETED
  // (fee sweeps and reconciliation can lag). Strict failure/refund states
  // still take precedence.
  const isCompleted =
    orderStatus === "COMPLETED" ||
    (!!finalDestTxHashEarly &&
      orderStatus !== "FAILED" &&
      orderStatus !== "EXPIRED" &&
      orderStatus !== "REFUNDED");
  const isFailed = orderStatus === "FAILED" || orderStatus === "EXPIRED";
  const isRefunded = orderStatus === "REFUNDED";

  // Derive the timeline.
  const steps = useMemo(() => {
    const out: Array<{
      key: string;
      state: StepState;
      title: string;
      sub?: string;
      hash?: string | null;
      hashLabel?: string;
      error?: string;
    }> = [];

    // Step 1 — user-side deposit (sign + broadcast).
    let depositState: StepState = "pending";
    if (signError) depositState = "error";
    else if (depositTxHash) depositState = "complete";
    else if (isSigning || isPreparing) depositState = "active";
    out.push({
      key: "deposit",
      state: depositState,
      title: `Send ${srcTicker} on ${srcChain?.name ?? "source"}`,
      sub:
        depositState === "active"
          ? "Confirm in your wallet"
          : depositState === "complete"
            ? "Sent"
            : depositState === "error"
              ? "Couldn't send"
              : "Waiting to sign",
      hash: depositTxHash,
      hashLabel: "Tx",
      error: signError ?? undefined,
    });

    // Steps 2..N — backend execution legs from orderData.execution[].
    const legs: ExecutionLeg[] = Array.isArray(orderData?.execution)
      ? orderData.execution
      : [];
    legs.forEach((leg, idx) => {
      const provider = leg.provider ?? "UNKNOWN";
      const copy = PROVIDER_COPY[provider] ?? {
        label: provider,
        description: "Routing",
      };
      let state: StepState = "pending";
      if (leg.status === "completed") state = "complete";
      else if (leg.status === "error") state = "error";
      else if (depositState === "complete") state = idx === 0 ? "active" : "pending";
      // Only one leg should be "active" — the first non-completed one after
      // a completed deposit.
      out.push({
        key: `leg-${idx}-${provider}`,
        state,
        title: copy.description,
        sub: copy.label,
        hash: leg.destination_tx_hash || leg.source_tx_hash || null,
        hashLabel: "Tx",
        error: leg.error,
      });
    });
    // Re-thread "active": only the earliest pending step after the deposit.
    let foundActive = false;
    for (let i = 1; i < out.length; i++) {
      if (out[i].state === "active") {
        if (foundActive) out[i].state = "pending";
        else foundActive = true;
      } else if (out[i].state === "pending" && depositState === "complete" && !foundActive) {
        out[i].state = "active";
        foundActive = true;
      }
    }

    // Final step — receive on destination chain. Show complete as soon as
    // a destination tx hash exists, even if the overall order status hasn't
    // settled yet.
    const finalState: StepState = finalDestTxHash
      ? "complete"
      : isFailed || isRefunded
        ? "error"
        : depositState === "complete"
          ? "active"
          : "pending";
    out.push({
      key: "receive",
      state: finalState,
      title: `Receive ${dstTicker} on ${dstChain?.name ?? "destination"}`,
      sub: isCompleted ? "Delivered" : isFailed ? "Failed" : isRefunded ? "Refunded" : "Pending",
      hash: finalDestTxHash,
      hashLabel: "Tx",
    });

    return out;
  }, [
    orderData,
    isCompleted,
    isFailed,
    isRefunded,
    depositTxHash,
    isSigning,
    isPreparing,
    signError,
    srcTicker,
    dstTicker,
    srcChain,
    dstChain,
    finalDestTxHash,
  ]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Transaction details"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: VS.overlay,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "min(720px, 92vh)",
          background: VS.surface,
          border: `1px solid ${VS.borderStrong}`,
          borderRadius: 18,
          color: VS.text,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 30px 80px -30px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${VS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
            {isCompleted
              ? "Transaction Completed"
              : isFailed
                ? "Transaction Failed"
                : isRefunded
                  ? "Refunded"
                  : "Transaction Details"}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: VS.textMuted,
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>
          {isCompleted ? (
            <CompletionView
              srcTicker={srcTicker}
              srcAmount={srcAmountUi}
              srcHash={depositTxHash}
              dstTicker={dstTicker}
              dstAmount={dstAmountUi}
              dstHash={finalDestTxHash}
            />
          ) : (
            <>
              {/* Visual route */}
              <RouteVisual
                srcToken={srcToken}
                dstToken={dstToken}
                srcChain={srcChain}
                dstChain={dstChain}
                srcAmount={srcAmountUi}
                dstAmount={dstAmountUi}
                srcTicker={srcTicker}
                dstTicker={dstTicker}
              />

              {/* Timeline */}
              <div style={{ marginTop: 18 }}>
                {steps.map((s, i) => (
                  <TimelineRow
                    key={s.key}
                    state={s.state}
                    title={s.title}
                    sub={s.sub}
                    hash={s.hash}
                    error={s.error}
                    isLast={i === steps.length - 1}
                  />
                ))}
              </div>

              {/* Sign error inline */}
              {signError && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    background: "rgba(255, 92, 122, 0.08)",
                    border: "1px solid rgba(255, 92, 122, 0.3)",
                    color: VS.danger,
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                >
                  {signError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 18px",
            borderTop: `1px solid ${VS.border}`,
            display: "flex",
            gap: 10,
          }}
        >
          {isCompleted ? (
            <>
              {finalDestTxHash && (
                <button
                  onClick={() => {
                    /* Future: deep link to explorer */
                    onClose();
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "transparent",
                    border: `1px solid ${VS.borderStrong}`,
                    borderRadius: 10,
                    color: VS.text,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  View Details
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: VS.gradient,
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: 0.4,
                }}
              >
                Done
              </button>
            </>
          ) : !depositTxHash ? (
            <>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "transparent",
                  border: `1px solid ${VS.border}`,
                  borderRadius: 10,
                  color: VS.textMuted,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={signError && onRetrySign ? onRetrySign : onSign}
                disabled={isSigning || isPreparing}
                style={{
                  flex: 2,
                  padding: "12px",
                  background: VS.gradient,
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isSigning || isPreparing ? "wait" : "pointer",
                  letterSpacing: 0.4,
                  opacity: isSigning || isPreparing ? 0.7 : 1,
                }}
              >
                {isPreparing
                  ? "Preparing…"
                  : isSigning
                    ? "Sign in your wallet…"
                    : signError
                      ? "Try again"
                      : "Confirm & Sign"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                background: "transparent",
                border: `1px solid ${VS.border}`,
                borderRadius: 10,
                color: VS.textMuted,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Hide
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function RouteVisual({
  srcToken,
  dstToken,
  srcChain,
  dstChain,
  srcAmount,
  dstAmount,
  srcTicker,
  dstTicker,
}: {
  srcToken: PickerToken;
  dstToken: PickerToken;
  srcChain: PickerChain | undefined;
  dstChain: PickerChain | undefined;
  srcAmount: number | undefined;
  dstAmount: number | undefined;
  srcTicker: string;
  dstTicker: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 14,
        background: VS.surface2,
        border: `1px solid ${VS.border}`,
        borderRadius: 12,
      }}
    >
      <RouteSide token={srcToken} chain={srcChain} amount={srcAmount} ticker={srcTicker} />
      <div
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: VS.textMuted,
          fontSize: 18,
        }}
      >
        →
      </div>
      <RouteSide token={dstToken} chain={dstChain} amount={dstAmount} ticker={dstTicker} />
    </div>
  );
}

function RouteSide({
  token,
  chain,
  amount,
  ticker,
}: {
  token: PickerToken;
  chain: PickerChain | undefined;
  amount: number | undefined;
  ticker: string;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
      <TokenIcon token={token} chain={chain} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: VS.textMuted,
            letterSpacing: 0.2,
          }}
        >
          {chain?.name ?? "—"}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: -0.2,
            fontVariantNumeric: "tabular-nums",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatAmount(amount)} {ticker}
        </div>
      </div>
    </div>
  );
}

function TimelineRow({
  state,
  title,
  sub,
  hash,
  error,
  isLast,
}: {
  state: StepState;
  title: string;
  sub?: string;
  hash?: string | null;
  error?: string;
  isLast: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
      <div
        style={{
          flexShrink: 0,
          width: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <StepDot state={state} />
        {!isLast && (
          <div
            style={{
              flex: 1,
              width: 2,
              minHeight: 16,
              marginTop: 4,
              marginBottom: 4,
              background:
                state === "complete" ? VS.success : VS.border,
              borderRadius: 1,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color:
              state === "error"
                ? VS.danger
                : state === "complete"
                  ? VS.text
                  : state === "active"
                    ? VS.text
                    : VS.textMuted,
          }}
        >
          {title}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 11,
              color: VS.textMuted,
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
        {error && (
          <div
            style={{
              fontSize: 11,
              color: VS.danger,
              marginTop: 4,
              fontFamily: "monospace",
              wordBreak: "break-word",
            }}
          >
            {error}
          </div>
        )}
        {hash && (
          <div
            style={{
              fontSize: 11,
              color: VS.textDim,
              marginTop: 4,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
            onClick={() => navigator.clipboard?.writeText(hash)}
            title="Click to copy"
          >
            {shortHash(hash)} ⧉
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({ state }: { state: StepState }) {
  if (state === "complete") {
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: VS.success,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        ✓
      </div>
    );
  }
  if (state === "error") {
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: VS.danger,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        ✕
      </div>
    );
  }
  if (state === "active") {
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "transparent",
          border: `2px solid ${VS.accent}`,
          borderTopColor: "transparent",
          animation: "vs-spin 0.9s linear infinite",
        }}
        aria-hidden
      />
    );
  }
  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: "transparent",
        border: `2px solid ${VS.border}`,
        marginTop: 6,
        marginBottom: 6,
      }}
      aria-hidden
    />
  );
}

function CompletionView({
  srcTicker,
  srcAmount,
  srcHash,
  dstTicker,
  dstAmount,
  dstHash,
}: {
  srcTicker: string;
  srcAmount: number | undefined;
  srcHash: string | null;
  dstTicker: string;
  dstAmount: number | undefined;
  dstHash: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 4px" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(34, 211, 154, 0.12)",
          color: VS.success,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 12,
        }}
      >
        ✓
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>
        Transaction Completed
      </div>
      <div
        style={{
          width: "100%",
          background: VS.surface2,
          border: `1px solid ${VS.border}`,
          borderRadius: 12,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <CompletionRow
          label="Sent"
          amount={`${formatAmount(srcAmount)} ${srcTicker}`}
          hash={srcHash}
        />
        <div style={{ height: 1, background: VS.border }} />
        <CompletionRow
          label="Received"
          amount={`${formatAmount(dstAmount)} ${dstTicker}`}
          hash={dstHash}
          color={VS.success}
        />
      </div>
    </div>
  );
}

function CompletionRow({
  label,
  amount,
  hash,
  color,
}: {
  label: string;
  amount: string;
  hash: string | null;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div>
        <div style={{ fontSize: 11, color: VS.textMuted, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: color ?? VS.text,
            fontVariantNumeric: "tabular-nums",
            marginTop: 2,
          }}
        >
          {amount}
        </div>
      </div>
      {hash && (
        <button
          onClick={() => navigator.clipboard?.writeText(hash)}
          title="Copy tx hash"
          style={{
            background: "transparent",
            border: `1px solid ${VS.border}`,
            borderRadius: 8,
            padding: "6px 10px",
            color: VS.textMuted,
            fontSize: 11,
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          {shortHash(hash)} ⧉
        </button>
      )}
    </div>
  );
}
