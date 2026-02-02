"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// Subscribe to nothing (we just need the snapshot)
const emptySubscribe = () => () => {};

// Custom hook for hydration-safe state
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // Client snapshot
    () => false // Server snapshot
  );
}

// Type definitions
export type ThemeValue =
  | "auto"
  | "web95"
  | "retro"
  | "soft"
  | "midnight"
  | "minimal"
  | "rounded"
  | "nouns";

export type ModeValue = "light" | "dark" | "auto";

export type CustomTheme = Record<string, string>;

interface ThemeContextValue {
  theme: ThemeValue;
  mode: ModeValue;
  customTheme: CustomTheme;
  setTheme: (theme: ThemeValue) => void;
  setMode: (mode: ModeValue) => void;
  setCustomTheme: (customTheme: CustomTheme) => void;
  updateCustomThemeVar: (key: string, value: string) => void;
  clearCustomThemeVar: (key: string) => void;
  resetAll: () => void;
  isHydrated: boolean;
}

// Cyberpunk theme preset (preserved from original)
export const CYBERPUNK_THEME: CustomTheme = {
  "--ck-body-background": "#000000",
  "--ck-body-background-transparent": "rgba(0, 0, 0, 0.9)",
  "--ck-body-background-secondary": "#000000",
  "--ck-body-background-secondary-hover-background": "#0a0000",
  "--ck-body-background-secondary-hover-outline": "#ff0033",
  "--ck-body-background-tertiary": "#000000",
  "--ck-body-color": "#ffffff",
  "--ck-body-color-muted": "#ff3333",
  "--ck-body-color-muted-hover": "#532222ff",
  "--ck-body-action-color": "#ffffff",
  "--ck-body-color-danger": "#c97082ff",
  "--ck-body-color-valid": "#cc7a28ff",
  "--ck-body-divider": "#ff0033",
  "--ck-body-divider-secondary": "#330000",
  "--ck-primary-button-background": "#ff0033",
  "--ck-primary-button-color": "#ffffff",
  "--ck-primary-button-hover-background": "#cc0022",
  "--ck-primary-button-hover-color": "#ffffff",
  "--ck-primary-button-active-background": "#aa0000",
  "--ck-primary-button-border-radius": "0px",
  "--ck-primary-button-font-weight": "700",
  "--ck-primary-button-box-shadow": "0 0 20px rgba(255, 0, 51, 0.5)",
  "--ck-primary-button-hover-box-shadow": "0 0 30px rgba(255, 0, 51, 0.7)",
  "--ck-secondary-button-background": "#000000",
  "--ck-secondary-button-color": "#ff3333",
  "--ck-secondary-button-border-radius": "0px",
  "--ck-secondary-button-font-weight": "600",
  "--ck-secondary-button-box-shadow": "inset 0 0 0 1px #ff0033",
  "--ck-secondary-button-hover-background": "#0a0000",
  "--ck-tertiary-button-background": "#000000",
  "--ck-connectbutton-font-size": "16px",
  "--ck-connectbutton-background": "#000000",
  "--ck-connectbutton-background-secondary": "#000000",
  "--ck-connectbutton-color": "#ff3333",
  "--ck-connectbutton-hover-color": "#ff5555",
  "--ck-connectbutton-hover-background": "#0a0000",
  "--ck-connectbutton-active-color": "#ffffff",
  "--ck-connectbutton-active-background": "#1a0000",
  "--ck-connectbutton-balance-color": "#ffffff",
  "--ck-connectbutton-balance-background": "#000000",
  "--ck-connectbutton-balance-box-shadow": "inset 0 0 0 1px #ff0033",
  "--ck-connectbutton-balance-hover-background": "#0a0000",
  "--ck-connectbutton-balance-hover-box-shadow": "inset 0 0 0 1px #ff3333",
  "--ck-connectbutton-balance-active-background": "#1a0000",
  "--ck-connectbutton-balance-active-box-shadow": "inset 0 0 0 1px #ff0033",
  "--ck-dropdown-button-color": "#ffffff",
  "--ck-dropdown-button-background": "#000000",
  "--ck-dropdown-button-box-shadow": "inset 0 0 0 1px #ff0033",
  "--ck-dropdown-button-hover-color": "#ff3333",
  "--ck-dropdown-button-hover-background": "#0a0000",
  "--ck-modal-box-shadow":
    "0 0 60px rgba(255, 0, 51, 0.4), inset 0 0 0 1px #ff0033",
  "--ck-overlay-background": "rgba(0, 0, 0, 0.95)",
  "--ck-siwe-border": "#ff0033",
  "--ck-body-disclaimer-background": "#0a0000",
  "--ck-body-disclaimer-box-shadow": "inset 0 0 0 1px #330000",
  "--ck-body-disclaimer-color": "#ff6666",
  "--ck-body-disclaimer-link-color": "#ff3333",
  "--ck-body-disclaimer-link-hover-color": "#ff5555",
  "--ck-tooltip-background": "#000000",
  "--ck-tooltip-background-secondary": "#0a0000",
  "--ck-tooltip-color": "#ff3333",
  "--ck-tooltip-shadow":
    "0 0 20px rgba(255, 0, 51, 0.5), inset 0 0 0 1px #ff0033",
  "--ck-qr-dot-color": "#ff0033",
};

// Default values
const DEFAULT_THEME: ThemeValue = "auto";
const DEFAULT_MODE: ModeValue = "dark";
const DEFAULT_CUSTOM_THEME: CustomTheme = CYBERPUNK_THEME;

// localStorage keys
const STORAGE_KEYS = {
  theme: "paykit-theme",
  mode: "paykit-mode",
  customTheme: "paykit-custom-theme",
} as const;

// Context
const ThemeContext = createContext<ThemeContextValue | null>(null);

// Helper to safely parse JSON from localStorage
function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Helper to get initial value from localStorage (client-side only)
function getStoredValue<T>(key: string, fallback: T, parse = false): T {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  if (parse) {
    return safeParseJSON(stored, fallback);
  }
  return stored as T;
}

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use useSyncExternalStore for hydration-safe detection
  const isHydrated = useIsHydrated();

  // Use lazy initialization to read from localStorage
  const [theme, setThemeState] = useState<ThemeValue>(() =>
    getStoredValue(STORAGE_KEYS.theme, DEFAULT_THEME)
  );
  const [mode, setModeState] = useState<ModeValue>(() =>
    getStoredValue(STORAGE_KEYS.mode, DEFAULT_MODE)
  );
  const [customTheme, setCustomThemeState] = useState<CustomTheme>(() =>
    getStoredValue(STORAGE_KEYS.customTheme, DEFAULT_CUSTOM_THEME, true)
  );

  // Persist theme to localStorage
  const setTheme = useCallback((newTheme: ThemeValue) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.theme, newTheme);
  }, []);

  // Persist mode to localStorage
  const setMode = useCallback((newMode: ModeValue) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEYS.mode, newMode);
  }, []);

  // Persist customTheme to localStorage
  const setCustomTheme = useCallback((newCustomTheme: CustomTheme) => {
    setCustomThemeState(newCustomTheme);
    localStorage.setItem(STORAGE_KEYS.customTheme, JSON.stringify(newCustomTheme));
  }, []);

  // Update a single CSS variable
  const updateCustomThemeVar = useCallback((key: string, value: string) => {
    setCustomThemeState((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEYS.customTheme, JSON.stringify(next));
      return next;
    });
  }, []);

  // Clear a single CSS variable
  const clearCustomThemeVar = useCallback((key: string) => {
    setCustomThemeState((prev) => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem(STORAGE_KEYS.customTheme, JSON.stringify(next));
      return next;
    });
  }, []);

  // Reset all to defaults
  const resetAll = useCallback(() => {
    setThemeState(DEFAULT_THEME);
    setModeState(DEFAULT_MODE);
    setCustomThemeState({});
    localStorage.setItem(STORAGE_KEYS.theme, DEFAULT_THEME);
    localStorage.setItem(STORAGE_KEYS.mode, DEFAULT_MODE);
    localStorage.setItem(STORAGE_KEYS.customTheme, JSON.stringify({}));
  }, []);

  const value: ThemeContextValue = {
    theme,
    mode,
    customTheme,
    setTheme,
    setMode,
    setCustomTheme,
    updateCustomThemeVar,
    clearCustomThemeVar,
    resetAll,
    isHydrated,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Hook to use the theme context
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Theme presets for easy access
export const THEME_PRESETS = {
  cyberpunk: CYBERPUNK_THEME,
  clean: {} as CustomTheme,
} as const;
