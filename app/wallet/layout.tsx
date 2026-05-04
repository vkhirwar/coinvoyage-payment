import "./wallet.css";
import type { ReactNode } from "react";
import { AutoConnect } from "./components/auto-connect";
import { BottomNav } from "./components/bottom-nav";
import { TopBar } from "./components/top-bar";

export const metadata = {
  title: "Slush — Omnichain wallet (prototype)",
};

export default function WalletLayout({ children }: { children: ReactNode }) {
  return (
    <div className="slush-scope">
      <AutoConnect />
      <div className="mx-auto max-w-[420px] min-h-screen flex flex-col pb-24">
        <TopBar />
        <main className="flex-1 px-4">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
