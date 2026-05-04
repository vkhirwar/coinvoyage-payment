import Link from "next/link";
import { CARD } from "@/lib/wallet/card";
import { SlushCard } from "./components/slush-card";

export default function CardPage() {
  return (
    <div className="space-y-4 mt-3">
      <header className="flex items-center gap-3 px-1">
        <Link
          href="/wallet"
          aria-label="Back"
          className="size-9 rounded-full grid place-items-center"
          style={{ background: "var(--color-slush-card)" }}
        >
          <BackArrow />
        </Link>
        <h1 className="text-lg font-semibold">Slush Card</h1>
      </header>

      <SlushCard
        last4={CARD.last4}
        holder={CARD.holder}
        expiry={CARD.expiry}
        balanceUsd={CARD.balanceUsd}
      />

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/wallet/card/load"
          className="rounded-2xl py-4 flex flex-col items-center justify-center gap-1.5 transition-colors hover:brightness-95"
          style={{ background: "var(--color-slush-blue)", color: "white" }}
        >
          <LoadIcon />
          <span className="text-base font-semibold">Load</span>
        </Link>
        <Link
          href="/wallet/card/withdraw"
          className="rounded-2xl py-4 flex flex-col items-center justify-center gap-1.5 transition-colors hover:brightness-95"
          style={{ background: "var(--color-slush-card-tint)", color: "var(--color-slush-ink)" }}
        >
          <WithdrawIcon />
          <span className="text-base font-semibold">Withdraw</span>
        </Link>
      </div>

      <section className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
        <div className="flex items-baseline justify-between mb-3">
          <h2
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: "var(--color-slush-ink-muted)" }}
          >
            Recent Transactions
          </h2>
          <span className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
            Funded via USDC.base
          </span>
        </div>
        <ul className="space-y-1">
          {CARD.transactions.map((tx) => (
            <li key={tx.id} className="flex items-center gap-3 px-1 py-2.5">
              <span
                className="size-9 rounded-full grid place-items-center"
                style={{ background: "var(--color-slush-card-tint)", color: "var(--color-slush-ink)" }}
              >
                {tx.merchant.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{tx.merchant}</div>
                <div className="text-xs" style={{ color: "var(--color-slush-ink-muted)" }}>
                  {tx.category} · {tx.date}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">−${tx.amountUsd.toFixed(2)}</div>
                <div className="text-[11px]" style={{ color: "var(--color-slush-ink-muted)" }}>
                  {tx.status}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function LoadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v12" />
      <path d="m6 10 6-6 6 6" />
      <path d="M4 20h16" />
    </svg>
  );
}

function WithdrawIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V8" />
      <path d="m6 14 6 6 6-6" />
      <path d="M4 4h16" />
    </svg>
  );
}
