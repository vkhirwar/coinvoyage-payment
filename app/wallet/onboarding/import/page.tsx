"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidMnemonic } from "@/lib/wallet/core";
import { saveMnemonic } from "@/lib/wallet/store";

export default function ImportWalletPage() {
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    const trimmed = phrase.trim().split(/\s+/).join(" ");
    if (!isValidMnemonic(trimmed)) {
      setError("That doesn't look like a valid 12 or 24-word recovery phrase.");
      return;
    }
    saveMnemonic(trimmed);
    router.push("/wallet");
  }

  const wordCount = phrase.trim() === "" ? 0 : phrase.trim().split(/\s+/).length;
  const looksReady = wordCount === 12 || wordCount === 24;

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
        <h1 className="text-lg font-semibold">Import wallet</h1>
      </header>

      <p className="text-sm px-1" style={{ color: "var(--color-slush-ink-muted)" }}>
        Paste your 12 or 24-word recovery phrase. Words separated by spaces.
      </p>

      <section className="rounded-3xl p-4" style={{ background: "var(--color-slush-card)" }}>
        <textarea
          value={phrase}
          onChange={(e) => {
            setPhrase(e.target.value);
            setError(null);
          }}
          rows={5}
          placeholder="word one word two word three…"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full bg-transparent resize-none text-sm font-mono"
          style={{ border: "1px solid var(--color-slush-divider)", borderRadius: 12, padding: "10px 12px" }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--color-slush-ink-muted)" }}>
            {wordCount} word{wordCount === 1 ? "" : "s"}
          </span>
          {error && (
            <span className="text-xs" style={{ color: "#d04848" }}>
              {error}
            </span>
          )}
        </div>
      </section>

      <button
        type="button"
        disabled={!looksReady}
        onClick={submit}
        className="w-full rounded-full py-3.5 font-semibold transition-colors"
        style={{
          background: !looksReady ? "var(--color-slush-divider)" : "var(--color-slush-blue)",
          color: !looksReady ? "var(--color-slush-ink-muted)" : "white",
        }}
      >
        Import
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
