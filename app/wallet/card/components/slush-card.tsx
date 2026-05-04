import Image from "next/image";

interface Props {
  last4: string;
  holder: string;
  expiry: string;
  balanceUsd: number;
  /** Compact variant — used on the wallet home teaser. */
  compact?: boolean;
}

export function SlushCard({ last4, holder, expiry, balanceUsd, compact }: Props) {
  return (
    <div
      className="relative rounded-2xl text-white overflow-hidden"
      style={{
        aspectRatio: compact ? "16 / 9" : "1.586 / 1",
        background:
          "linear-gradient(135deg, #4DA2FF 0%, #2660E8 45%, #0a1626 100%)",
        boxShadow: "0 8px 24px rgba(38, 96, 232, 0.35)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 45%)",
        }}
      />
      <div className="relative h-full flex flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/wallet/brand/symbol.svg"
              alt=""
              width={compact ? 22 : 28}
              height={compact ? 22 : 28}
              className="invert opacity-95"
              aria-hidden
            />
            <span className={compact ? "text-xs font-semibold tracking-wide" : "text-sm font-semibold tracking-wide"}>
              Slush
            </span>
          </div>
          <span className={compact ? "text-[10px] uppercase tracking-widest opacity-80" : "text-xs uppercase tracking-widest opacity-80"}>
            Debit
          </span>
        </div>

        <div>
          <div className={compact ? "text-[10px] uppercase tracking-wider opacity-70" : "text-xs uppercase tracking-wider opacity-70"}>
            Available
          </div>
          <div className={compact ? "text-xl font-bold" : "text-3xl font-bold"}>
            ${balanceUsd.toFixed(2)}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className={compact ? "font-mono text-sm tracking-[0.15em]" : "font-mono text-base tracking-[0.2em]"}>
              •••• {last4}
            </div>
            {!compact && (
              <div className="text-[11px] uppercase opacity-80 mt-1">{holder}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {!compact && (
              <div className="text-[10px] uppercase opacity-70">Expires {expiry}</div>
            )}
            <VisaMark />
          </div>
        </div>
      </div>
    </div>
  );
}

function VisaMark() {
  return (
    <span
      className="text-base font-extrabold italic tracking-tight"
      style={{ fontFamily: "Georgia, serif", letterSpacing: "-0.02em" }}
    >
      VISA
    </span>
  );
}
