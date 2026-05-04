import Image from "next/image";
import Link from "next/link";
import { ActionGrid } from "./components/action-grid";
import { AssetList } from "./components/asset-list";
import { SlushCard } from "./card/components/slush-card";
import { CARD } from "@/lib/wallet/card";
import { TOKENS, balanceOf } from "@/lib/wallet/swap/tokens";

function totalUsd(): number {
  return TOKENS.reduce((sum, t) => sum + balanceOf(t.id) * t.priceUsd, 0);
}

export default function WalletHome() {
  const total = totalUsd();
  return (
    <div className="space-y-4">
      <section className="rounded-3xl p-5 mt-3" style={{ background: "var(--color-slush-card)" }}>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold" style={{ color: "var(--color-slush-ink)" }}>
            ${total.toFixed(2)}
          </span>
          <span className="text-sm" style={{ color: "var(--color-slush-ink-muted)" }}>
            across {new Set(TOKENS.filter((t) => balanceOf(t.id) > 0).map((t) => t.chain)).size} chains
          </span>
        </div>
        <ActionGrid />
      </section>

      <CardTeaser />

      <EarnTeaser />

      <section className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
        <h2
          className="text-xs font-semibold tracking-wider uppercase mb-3"
          style={{ color: "var(--color-slush-ink-muted)" }}
        >
          Your Coins
        </h2>
        <AssetList />
      </section>
    </div>
  );
}

function CardTeaser() {
  return (
    <section className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
      <div className="flex items-baseline justify-between mb-3">
        <h2
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: "var(--color-slush-ink-muted)" }}
        >
          Slush Card
        </h2>
        <Link
          href="/wallet/card"
          className="text-xs font-semibold"
          style={{ color: "var(--color-slush-blue)" }}
        >
          Manage →
        </Link>
      </div>
      <Link href="/wallet/card" className="block">
        <SlushCard
          last4={CARD.last4}
          holder={CARD.holder}
          expiry={CARD.expiry}
          balanceUsd={CARD.balanceUsd}
          compact
        />
      </Link>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Link
          href="/wallet/card/load"
          className="rounded-full py-2.5 text-sm font-semibold text-center transition-colors hover:brightness-95"
          style={{ background: "var(--color-slush-blue)", color: "white" }}
        >
          Load
        </Link>
        <Link
          href="/wallet/card/withdraw"
          className="rounded-full py-2.5 text-sm font-semibold text-center transition-colors hover:brightness-95"
          style={{ background: "var(--color-slush-card-tint)", color: "var(--color-slush-ink)" }}
        >
          Withdraw
        </Link>
      </div>
    </section>
  );
}

function EarnTeaser() {
  return (
    <Link
      href="/wallet/earn"
      className="block rounded-3xl p-4 text-white"
      style={{ background: "linear-gradient(135deg, var(--color-slush-blue) 0%, var(--color-slush-blue-deep) 100%)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Earn up to 27.50% APY</div>
          <div className="text-sm opacity-90">Start earning with Strategies</div>
        </div>
        <Image
          src="/wallet/brand/symbol.svg"
          alt=""
          width={36}
          height={36}
          className="opacity-80 invert"
          aria-hidden
        />
      </div>
    </Link>
  );
}
