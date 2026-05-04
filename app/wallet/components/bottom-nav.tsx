"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const items: NavItem[] = [
  { href: "/wallet", label: "Home", icon: <HomeIcon /> },
  { href: "/wallet/earn", label: "Earn", icon: <EarnIcon /> },
  { href: "/wallet/assets", label: "Assets", icon: <AssetsIcon /> },
  { href: "/wallet/apps", label: "Apps", icon: <AppsIcon /> },
  { href: "/wallet/activity", label: "Activity", icon: <ActivityIcon /> },
  { href: "/wallet/profile", label: "Profile", icon: <ProfileIcon /> },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/wallet/onboarding")) return null;

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[396px]">
      <ul
        className="flex items-center justify-between rounded-full px-2 py-2 shadow-lg"
        style={{ background: "rgba(220, 233, 245, 0.95)", backdropFilter: "blur(12px)" }}
      >
        {items.map((item) => {
          const isActive =
            item.href === "/wallet" ? pathname === "/wallet" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-full text-[11px] font-medium"
                style={{
                  background: isActive ? "white" : "transparent",
                  color: "var(--color-slush-ink)",
                }}
              >
                <span className="size-5 grid place-items-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const stroke = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke}>
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}
function EarnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke}>
      <path d="M5 8h11a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6a3 3 0 0 1 2-2.83" />
      <path d="M16 14h2" />
      <circle cx="9" cy="6" r="2.5" />
    </svg>
  );
}
function AssetsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="m3 13 4-3 4 3 4-2 6 4" />
      <circle cx="8" cy="10" r="1" />
    </svg>
  );
}
function AppsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12 12 9l3 3-3 3z" />
    </svg>
  );
}
function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke}>
      <path d="M5 17 9 7l4 8 2-4 4 6" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}
