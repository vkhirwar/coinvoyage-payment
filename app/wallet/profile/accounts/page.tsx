"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO_MNEMONIC, deriveAll, type DerivedAddress } from "@/lib/wallet/core";
import { loadMnemonic } from "@/lib/wallet/store";
import { CopyButton } from "../../components/copy-button";
import { ChainGlyph } from "../../components/chain-glyph";

export default function AccountsPage() {
  // Render demo addresses on first paint, then re-derive from the persisted
  // seed once we hit the browser. Avoids hydration mismatch.
  const [derived, setDerived] = useState<DerivedAddress[]>(() => deriveAll(DEMO_MNEMONIC));
  const [usingDemo, setUsingDemo] = useState(true);

  useEffect(() => {
    const m = loadMnemonic();
    setDerived(deriveAll(m));
    setUsingDemo(m === DEMO_MNEMONIC);
  }, []);

  return (
    <div className="space-y-4 mt-3">
      <header className="flex items-center gap-3 px-1">
        <Link
          href="/wallet/profile"
          aria-label="Back"
          className="size-9 rounded-full grid place-items-center"
          style={{ background: "var(--color-slush-card)" }}
        >
          <BackArrow />
        </Link>
        <h1 className="text-lg font-semibold">Manage Accounts</h1>
      </header>

      {usingDemo && (
        <div
          className="rounded-2xl px-4 py-2.5 text-xs flex items-start gap-2"
          style={{ background: "var(--color-slush-card-tint)", color: "var(--color-slush-ink-muted)" }}
        >
          <span>
            Showing demo addresses.{" "}
            <Link href="/wallet/onboarding" className="font-semibold underline" style={{ color: "var(--color-slush-blue-deep)" }}>
              Create or import a wallet
            </Link>{" "}
            to see your own.
          </span>
        </div>
      )}

      <section className="rounded-3xl overflow-hidden" style={{ background: "var(--color-slush-card)" }}>
        <div
          className="flex items-center justify-between px-5 pt-4 pb-2"
          style={{ color: "var(--color-slush-ink-muted)" }}
        >
          <h2 className="text-xs font-semibold tracking-wider uppercase">Passphrase · Account 1</h2>
          <span className="text-[11px]">{derived.length} chains</span>
        </div>

        <ul className="divide-y" style={{ borderColor: "var(--color-slush-divider)" }}>
          {derived.map((d) => (
            <li key={d.chain.key} className="flex items-center gap-3 px-5 py-3.5">
              <ChainGlyph chain={d.chain.key} />
              <div className="flex-1 min-w-0">
                <div className="font-medium leading-tight">{d.chain.label}</div>
                <div className="text-[11px] font-mono truncate" style={{ color: "var(--color-slush-ink-muted)" }}>
                  {truncate(d.address)}
                </div>
              </div>
              <CopyButton value={d.address} label={`Copy ${d.chain.label} address`} />
            </li>
          ))}
        </ul>
      </section>

      <p className="px-5 text-[11px] leading-relaxed" style={{ color: "var(--color-slush-ink-muted)" }}>
        All addresses derived from a single passphrase via deterministic key
        derivation. EVM chains share one secp256k1 address; Sui, Bitcoin, and
        Solana have their own curve-native derivations.
      </p>
    </div>
  );
}

function truncate(addr: string): string {
  if (addr.length <= 18) return addr;
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`;
}

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
