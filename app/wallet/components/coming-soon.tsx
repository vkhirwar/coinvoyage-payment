import Image from "next/image";
import Link from "next/link";

export function ComingSoon({ title, blurb }: { title: string; blurb?: string }) {
  return (
    <div className="mt-8 mx-2">
      <div
        className="rounded-3xl p-8 text-center"
        style={{ background: "var(--color-slush-card)" }}
      >
        <Image
          src="/wallet/brand/symbol-3d-blue.png"
          alt=""
          width={84}
          height={84}
          className="mx-auto opacity-90"
          aria-hidden
        />
        <h1 className="text-xl font-semibold mt-4">{title}</h1>
        {blurb && (
          <p className="text-sm mt-2" style={{ color: "var(--color-slush-ink-muted)" }}>
            {blurb}
          </p>
        )}
        <Link
          href="/wallet"
          className="inline-block mt-5 rounded-full px-5 py-2 text-sm font-semibold"
          style={{ background: "var(--color-slush-blue)", color: "white" }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
