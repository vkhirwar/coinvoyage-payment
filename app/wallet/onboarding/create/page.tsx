"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { newMnemonic } from "@/lib/wallet/core";
import { saveMnemonic } from "@/lib/wallet/store";

export default function CreateWalletPage() {
  const [mnemonic, setMnemonic] = useState<string>("");
  const [revealed, setRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMnemonic(newMnemonic());
  }, []);

  const words = mnemonic.split(" ");

  function finish() {
    saveMnemonic(mnemonic);
    router.push("/wallet");
  }

  return (
    <div className="space-y-4 mt-3">
      <header className="flex items-center gap-3 px-1">
        <Link
          href="/wallet/onboarding"
          aria-label="Back"
          className="size-9 rounded-full grid place-items-center"
          style={{ background: "var(--color-slush-card)" }}
        >
          <BackArrow />
        </Link>
        <h1 className="text-lg font-semibold">Recovery phrase</h1>
      </header>

      <p className="text-sm px-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        Write these 12 words down in order. Anyone with this phrase can access
        your wallet.
      </p>

      <section
        className="rounded-3xl p-4 relative"
        style={{ background: "var(--color-slush-card)" }}
      >
        <div className={`grid grid-cols-3 gap-2 ${revealed ? "" : "blur-md select-none"}`}>
          {(words.length === 12 ? words : Array(12).fill("•••")).map((w, i) => (
            <div
              key={i}
              className="rounded-xl px-2 py-2 text-sm flex items-center gap-1.5"
              style={{ background: "var(--color-slush-card-tint)" }}
            >
              <span className="text-[10px] tabular-nums" style={{ color: "var(--color-slush-ink-muted)" }}>
                {i + 1}
              </span>
              <span className="font-medium">{w}</span>
            </div>
          ))}
        </div>
        {!revealed && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="absolute inset-0 rounded-3xl flex items-center justify-center font-semibold"
            style={{ background: "rgba(255,255,255,0.4)", color: "var(--color-slush-blue-deep)" }}
          >
            Tap to reveal
          </button>
        )}
      </section>

      {revealed && (
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(mnemonic).catch(() => {})}
          className="w-full rounded-full py-2 text-sm font-medium"
          style={{ background: "var(--color-slush-card)", color: "var(--color-slush-blue-deep)" }}
        >
          Copy phrase
        </button>
      )}

      <label className="flex items-start gap-2 px-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 size-4 shrink-0"
          style={{ width: 16, height: 16 }}
        />
        <span style={{ color: "var(--color-slush-ink-muted)" }}>
          I&rsquo;ve written it down. I understand Slush can&rsquo;t recover this
          phrase if I lose it.
        </span>
      </label>

      <button
        type="button"
        disabled={!confirmed || !revealed}
        onClick={finish}
        className="w-full rounded-full py-3.5 font-semibold transition-colors"
        style={{
          background: !confirmed || !revealed ? "var(--color-slush-divider)" : "var(--color-slush-blue)",
          color: !confirmed || !revealed ? "var(--color-slush-ink-muted)" : "white",
        }}
      >
        Continue
      </button>
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
