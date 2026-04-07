"use client";

import dynamic from "next/dynamic";

const SwapContent = dynamic(() => import("./swap-content"), { ssr: false });

export default function SwapPage() {
  return <SwapContent />;
}
