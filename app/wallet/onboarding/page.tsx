import Image from "next/image";
import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="mt-3 space-y-5">
      <div className="text-center pt-6">
        <Image
          src="/wallet/brand/symbol-3d-blue.png"
          alt="Slush"
          width={120}
          height={120}
          className="mx-auto"
          priority
        />
        <h1 className="text-2xl font-bold mt-3">Welcome to Slush</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-slush-ink-muted)" }}>
          One passphrase. Addresses on every chain.
        </p>
      </div>

      <div className="space-y-3 pt-4">
        <Link
          href="/wallet/onboarding/create"
          className="block rounded-3xl p-5"
          style={{ background: "var(--color-slush-blue)", color: "white" }}
        >
          <div className="text-base font-semibold">Create new wallet</div>
          <div className="text-sm opacity-90 mt-0.5">
            Generate a 12-word recovery phrase
          </div>
        </Link>

        <Link
          href="/wallet/onboarding/import"
          className="block rounded-3xl p-5"
          style={{ background: "var(--color-slush-card)" }}
        >
          <div className="text-base font-semibold">I already have a wallet</div>
          <div className="text-sm mt-0.5" style={{ color: "var(--color-slush-ink-muted)" }}>
            Import an existing recovery phrase
          </div>
        </Link>
      </div>

      <p
        className="text-[11px] text-center mt-4 px-4 leading-relaxed"
        style={{ color: "var(--color-slush-ink-muted)" }}
      >
        Once your wallet is created, you&rsquo;ll have addresses on Sui, Bitcoin,
        Solana, Ethereum, Arbitrum, Base, Optimism, Polygon, and BNB Chain — all
        derived from the same phrase.
      </p>
    </div>
  );
}
