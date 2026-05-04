import Link from "next/link";
import type { ReactNode } from "react";

interface Action {
  href: string;
  label: string;
  icon: ReactNode;
}

const actions: Action[] = [
  { href: "/wallet/swap", label: "Swap", icon: <SwapIcon /> },
  { href: "/wallet/send", label: "Send", icon: <SendIcon /> },
  { href: "/wallet/buy", label: "Buy/Sell", icon: <BuyIcon /> },
  { href: "/wallet/request", label: "Request", icon: <RequestIcon /> },
];

export function ActionGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="aspect-[2/1] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-colors hover:brightness-95"
          style={{ background: "var(--color-slush-card-tint)", color: "var(--color-slush-ink)" }}
        >
          <span className="size-7 grid place-items-center">{a.icon}</span>
          <span className="text-base font-semibold">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

const s = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...s}>
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...s}>
      <path d="M21 3 3 11l8 3 3 8z" />
    </svg>
  );
}
function BuyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...s}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14 8c-1-1-3-1-4 0s-1 2 0 3l3 2c1 1 1 2 0 3s-3 1-4 0M12 6v2M12 16v2" />
    </svg>
  );
}
function RequestIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...s}>
      <path d="M12 4v14M5 11l7 7 7-7" />
    </svg>
  );
}
