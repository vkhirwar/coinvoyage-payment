"use client";

import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme, VS, type ThemeMode } from "./theme";

export default function ThemeToggle() {
  // Start with "dark" so SSR matches the default. After mount we sync with
  // whatever the head script (in layout.tsx) actually applied — usually the
  // result of getInitialTheme(). The icon will briefly show the wrong glyph
  // before useEffect runs, but the button is always clickable.
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const current =
      (typeof document !== "undefined" &&
        (document.documentElement.dataset.theme as ThemeMode)) ||
      getInitialTheme();
    setMode(current);
  }, []);

  // Follow OS theme changes only when the user hasn't explicitly pinned a
  // choice (no value in localStorage).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const stored = window.localStorage.getItem("vs-theme");
      if (stored === "light" || stored === "dark") return;
      const next: ThemeMode = mq.matches ? "light" : "dark";
      applyTheme(next);
      setMode(next);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const next: ThemeMode = mode === "dark" ? "light" : "dark";
  const isDark = mode === "dark";

  return (
    <button
      onClick={() => {
        applyTheme(next);
        setMode(next);
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        border: `1px solid ${VS.border}`,
        background: VS.surface,
        color: VS.text,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        transition: "background 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--vs-border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--vs-border)";
      }}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
