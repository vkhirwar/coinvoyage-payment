// Vaporswap palette — values are CSS custom properties so dark/light mode can
// switch via a `data-theme` attribute on <html> without rerendering the tree.
// Variable definitions live in app/globals.css.
export const VS = {
  bg: "var(--vs-bg)",
  surface: "var(--vs-surface)",
  surface2: "var(--vs-surface-2)",
  border: "var(--vs-border)",
  borderStrong: "var(--vs-border-strong)",
  text: "var(--vs-text)",
  textMuted: "var(--vs-text-muted)",
  textDim: "var(--vs-text-dim)",
  accent: "var(--vs-accent)",
  accent2: "var(--vs-accent-2)",
  accent3: "var(--vs-accent-3)",
  success: "var(--vs-success)",
  warning: "var(--vs-warning)",
  danger: "var(--vs-danger)",
  gradient: "var(--vs-gradient)",
  gradientSoft: "var(--vs-gradient-soft)",
  glassBg: "var(--vs-glass-bg)",
  overlay: "var(--vs-overlay)",
  shadow: "var(--vs-shadow)",
} as const;

export type VSColors = typeof VS;

// Light/dark theme management.
export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "vs-theme";

export function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}

// Inline script that sets data-theme before React hydrates, preventing a
// dark-mode flash on a saved-light user. Mount once in <head> (or layout).
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var s = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var m = s === "light" || s === "dark"
      ? s
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", m);
  } catch (e) {}
})();
`;
