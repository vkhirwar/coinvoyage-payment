"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO_MNEMONIC, deriveOne } from "@/lib/wallet/core";
import { loadMnemonic } from "@/lib/wallet/store";

const sections: { heading: string; rows: { href?: string; label: string; sub?: string; chev?: boolean }[] }[] = [
  {
    heading: "Wallet",
    rows: [
      { href: "/wallet/profile/accounts", label: "Manage Accounts", sub: "Passphrases, addresses, keys", chev: true },
      { label: "Connected Apps" },
      { label: "Address Book" },
    ],
  },
  {
    heading: "Settings",
    rows: [{ label: "Auto-Lock" }, { label: "Currency" }, { label: "Network" }],
  },
];

export default function ProfilePage() {
  // SSR-safe: render demo on first paint, hydrate to user's address on mount.
  const [suiAddr, setSuiAddr] = useState<string>(() => deriveOne(DEMO_MNEMONIC, "sui").address);

  useEffect(() => {
    setSuiAddr(deriveOne(loadMnemonic(), "sui").address);
  }, []);

  return (
    <div className="space-y-4 mt-3">
      <section
        className="rounded-3xl p-5 flex items-center gap-4"
        style={{ background: "var(--color-slush-card)" }}
      >
        <div
          className="size-14 rounded-full grid place-items-center"
          style={{ background: "var(--color-slush-card-tint)" }}
        >
          <Image src="/wallet/brand/symbol.svg" alt="" width={28} height={28} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Account 1</div>
          <div className="text-sm font-mono truncate" style={{ color: "var(--color-slush-ink-muted)" }}>
            {truncate(suiAddr)}
          </div>
        </div>
      </section>

      {sections.map((s) => (
        <section key={s.heading} className="rounded-3xl overflow-hidden" style={{ background: "var(--color-slush-card)" }}>
          <h3 className="px-5 pt-4 pb-2 text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--color-slush-ink-muted)" }}>
            {s.heading}
          </h3>
          <ul className="divide-y" style={{ borderColor: "var(--color-slush-divider)" }}>
            {s.rows.map((r) => {
              const inner = (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{r.label}</div>
                    {r.sub && (
                      <div className="text-xs" style={{ color: "var(--color-slush-ink-muted)" }}>
                        {r.sub}
                      </div>
                    )}
                  </div>
                  {r.chev && <Chevron />}
                </>
              );
              return (
                <li key={r.label}>
                  {r.href ? (
                    <Link href={r.href} className="flex items-center gap-3 px-5 py-3.5">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-5 py-3.5" style={{ color: "var(--color-slush-ink-muted)" }}>
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function truncate(addr: string): string {
  if (addr.length <= 18) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
