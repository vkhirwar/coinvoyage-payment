"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TOKENS, balanceOf } from "@/lib/wallet/swap/tokens";

function totalUsd(): number {
  return TOKENS.reduce((sum, t) => sum + balanceOf(t.id) * t.priceUsd, 0);
}

export function TopBar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  // Hide on onboarding flow — those screens have their own header.
  if (pathname.startsWith("/wallet/onboarding")) return null;

  const total = totalUsd();

  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-3">
      <button
        type="button"
        aria-label="Account"
        className="size-10 rounded-full bg-white shadow-sm grid place-items-center"
      >
        <Image src="/wallet/brand/symbol.svg" alt="Slush" width={22} height={22} />
      </button>

      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-sm font-medium"
      >
        <span>{hidden ? "$••••" : `$${total.toFixed(2)}`}</span>
        <EyeIcon hidden={hidden} />
      </button>

      <button
        type="button"
        aria-label="Network"
        className="size-10 rounded-full bg-white shadow-sm grid place-items-center"
      >
        <span
          className="size-6 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, var(--color-slush-blue-light), var(--color-slush-blue) 65%, var(--color-slush-blue-deep))",
          }}
        />
      </button>
    </header>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {hidden ? (
        <>
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="m1 1 22 22" />
        </>
      ) : (
        <>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
