import type { ChainKey } from "@/lib/wallet/core";

const palette: Record<ChainKey, { bg: string; letter: string }> = {
  sui: { bg: "#4DA2FF", letter: "S" },
  btc: { bg: "#F7931A", letter: "₿" },
  sol: { bg: "linear-gradient(135deg,#9945FF,#14F195)", letter: "◎" },
  eth: { bg: "#627EEA", letter: "Ξ" },
  arb: { bg: "#28A0F0", letter: "A" },
  base: { bg: "#0052FF", letter: "B" },
  op: { bg: "#FF0420", letter: "O" },
  polygon: { bg: "#8247E5", letter: "P" },
  bsc: { bg: "#F3BA2F", letter: "B" },
};

export function ChainGlyph({ chain, size = 36 }: { chain: ChainKey; size?: number }) {
  const p = palette[chain];
  return (
    <span
      className="rounded-full grid place-items-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: p.bg, fontSize: size * 0.45 }}
    >
      {p.letter}
    </span>
  );
}
