"use client";

import { PayKitProvider, WalletProvider, PayButton } from "@coin-voyage/paykit";
import { ChainId } from "@coin-voyage/paykit/server";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useTheme,
  THEME_PRESETS,
  type ThemeValue,
  type ModeValue,
  type CustomTheme,
} from "./ThemeContext";

// Available base themes
const BASE_THEMES: { value: ThemeValue; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "web95", label: "Web95" },
  { value: "retro", label: "Retro" },
  { value: "soft", label: "Soft" },
  { value: "midnight", label: "Midnight" },
  { value: "minimal", label: "Minimal" },
  { value: "rounded", label: "Rounded" },
  { value: "nouns", label: "Nouns" },
];

const MODES: { value: ModeValue; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
];

// CSS Variable definitions grouped by category
interface CSSVariable {
  key: string;
  label: string;
  type: "color" | "dimension" | "shadow";
  defaultValue?: string;
}

interface VariableGroup {
  name: string;
  description: string;
  variables: CSSVariable[];
  defaultOpen?: boolean;
}

const CSS_VARIABLE_GROUPS: VariableGroup[] = [
  {
    name: "Modal",
    description: "Modal container and overlay styling",
    variables: [
      { key: "--ck-modal-box-shadow", label: "Box Shadow", type: "shadow", defaultValue: "0 4px 32px rgba(0,0,0,0.3)" },
      { key: "--ck-overlay-background", label: "Overlay Background", type: "color", defaultValue: "rgba(0,0,0,0.8)" },
    ],
  },
  {
    name: "Body",
    description: "Main content area colors and backgrounds",
    variables: [
      { key: "--ck-body-background", label: "Background", type: "color", defaultValue: "#ffffff" },
      { key: "--ck-body-background-transparent", label: "Background Transparent", type: "color", defaultValue: "rgba(255,255,255,0.9)" },
      { key: "--ck-body-background-secondary", label: "Secondary Background", type: "color", defaultValue: "#f5f5f5" },
      { key: "--ck-body-background-secondary-hover-background", label: "Secondary Hover BG", type: "color", defaultValue: "#eeeeee" },
      { key: "--ck-body-background-secondary-hover-outline", label: "Secondary Hover Outline", type: "color", defaultValue: "#dddddd" },
      { key: "--ck-body-background-tertiary", label: "Tertiary Background", type: "color", defaultValue: "#eeeeee" },
      { key: "--ck-body-color", label: "Text Color", type: "color", defaultValue: "#000000" },
      { key: "--ck-body-color-muted", label: "Muted Text", type: "color", defaultValue: "#666666" },
      { key: "--ck-body-color-muted-hover", label: "Muted Text Hover", type: "color", defaultValue: "#333333" },
      { key: "--ck-body-action-color", label: "Action Color", type: "color", defaultValue: "#0066cc" },
      { key: "--ck-body-color-danger", label: "Danger Color", type: "color", defaultValue: "#ff4444" },
      { key: "--ck-body-color-valid", label: "Valid/Success Color", type: "color", defaultValue: "#44aa44" },
      { key: "--ck-body-divider", label: "Divider", type: "color", defaultValue: "#dddddd" },
      { key: "--ck-body-divider-secondary", label: "Secondary Divider", type: "color", defaultValue: "#eeeeee" },
    ],
  },
  {
    name: "Primary Button",
    description: "Main action buttons (Pay, Connect)",
    defaultOpen: true,
    variables: [
      { key: "--ck-primary-button-background", label: "Background", type: "color", defaultValue: "#0066cc" },
      { key: "--ck-primary-button-color", label: "Text Color", type: "color", defaultValue: "#ffffff" },
      { key: "--ck-primary-button-hover-background", label: "Hover Background", type: "color", defaultValue: "#0055aa" },
      { key: "--ck-primary-button-hover-color", label: "Hover Text", type: "color", defaultValue: "#ffffff" },
      { key: "--ck-primary-button-active-background", label: "Active Background", type: "color", defaultValue: "#004488" },
      { key: "--ck-primary-button-border-radius", label: "Border Radius", type: "dimension", defaultValue: "8px" },
      { key: "--ck-primary-button-font-weight", label: "Font Weight", type: "dimension", defaultValue: "600" },
      { key: "--ck-primary-button-box-shadow", label: "Box Shadow", type: "shadow", defaultValue: "none" },
      { key: "--ck-primary-button-hover-box-shadow", label: "Hover Box Shadow", type: "shadow", defaultValue: "none" },
    ],
  },
  {
    name: "Secondary Button",
    description: "Secondary action buttons",
    variables: [
      { key: "--ck-secondary-button-background", label: "Background", type: "color", defaultValue: "#f0f0f0" },
      { key: "--ck-secondary-button-color", label: "Text Color", type: "color", defaultValue: "#333333" },
      { key: "--ck-secondary-button-hover-background", label: "Hover Background", type: "color", defaultValue: "#e0e0e0" },
      { key: "--ck-secondary-button-border-radius", label: "Border Radius", type: "dimension", defaultValue: "8px" },
      { key: "--ck-secondary-button-font-weight", label: "Font Weight", type: "dimension", defaultValue: "500" },
      { key: "--ck-secondary-button-box-shadow", label: "Box Shadow", type: "shadow", defaultValue: "none" },
    ],
  },
  {
    name: "Tertiary Button",
    description: "Tertiary/ghost buttons",
    variables: [
      { key: "--ck-tertiary-button-background", label: "Background", type: "color", defaultValue: "transparent" },
    ],
  },
  {
    name: "Connect Button",
    description: "The wallet connect button appearance",
    variables: [
      { key: "--ck-connectbutton-font-size", label: "Font Size", type: "dimension", defaultValue: "16px" },
      { key: "--ck-connectbutton-background", label: "Background", type: "color", defaultValue: "#ffffff" },
      { key: "--ck-connectbutton-background-secondary", label: "Secondary Background", type: "color", defaultValue: "#f5f5f5" },
      { key: "--ck-connectbutton-color", label: "Text Color", type: "color", defaultValue: "#000000" },
      { key: "--ck-connectbutton-hover-color", label: "Hover Text", type: "color", defaultValue: "#333333" },
      { key: "--ck-connectbutton-hover-background", label: "Hover Background", type: "color", defaultValue: "#f5f5f5" },
      { key: "--ck-connectbutton-active-color", label: "Active Text", type: "color", defaultValue: "#000000" },
      { key: "--ck-connectbutton-active-background", label: "Active Background", type: "color", defaultValue: "#eeeeee" },
      { key: "--ck-connectbutton-balance-color", label: "Balance Text", type: "color", defaultValue: "#000000" },
      { key: "--ck-connectbutton-balance-background", label: "Balance Background", type: "color", defaultValue: "#f0f0f0" },
      { key: "--ck-connectbutton-balance-box-shadow", label: "Balance Box Shadow", type: "shadow", defaultValue: "none" },
      { key: "--ck-connectbutton-balance-hover-background", label: "Balance Hover BG", type: "color", defaultValue: "#e5e5e5" },
      { key: "--ck-connectbutton-balance-hover-box-shadow", label: "Balance Hover Shadow", type: "shadow", defaultValue: "none" },
      { key: "--ck-connectbutton-balance-active-background", label: "Balance Active BG", type: "color", defaultValue: "#dddddd" },
      { key: "--ck-connectbutton-balance-active-box-shadow", label: "Balance Active Shadow", type: "shadow", defaultValue: "none" },
    ],
  },
  {
    name: "Dropdown Button",
    description: "Dropdown menu buttons",
    variables: [
      { key: "--ck-dropdown-button-color", label: "Text Color", type: "color", defaultValue: "#000000" },
      { key: "--ck-dropdown-button-background", label: "Background", type: "color", defaultValue: "#ffffff" },
      { key: "--ck-dropdown-button-box-shadow", label: "Box Shadow", type: "shadow", defaultValue: "0 2px 8px rgba(0,0,0,0.1)" },
      { key: "--ck-dropdown-button-hover-color", label: "Hover Text", type: "color", defaultValue: "#333333" },
      { key: "--ck-dropdown-button-hover-background", label: "Hover Background", type: "color", defaultValue: "#f5f5f5" },
    ],
  },
  {
    name: "Tooltip",
    description: "Tooltip styling",
    variables: [
      { key: "--ck-tooltip-background", label: "Background", type: "color", defaultValue: "#333333" },
      { key: "--ck-tooltip-background-secondary", label: "Secondary Background", type: "color", defaultValue: "#444444" },
      { key: "--ck-tooltip-color", label: "Text Color", type: "color", defaultValue: "#ffffff" },
      { key: "--ck-tooltip-shadow", label: "Shadow", type: "shadow", defaultValue: "0 4px 12px rgba(0,0,0,0.2)" },
    ],
  },
  {
    name: "Disclaimer",
    description: "Disclaimer/legal text area",
    variables: [
      { key: "--ck-body-disclaimer-background", label: "Background", type: "color", defaultValue: "#f5f5f5" },
      { key: "--ck-body-disclaimer-box-shadow", label: "Box Shadow", type: "shadow", defaultValue: "none" },
      { key: "--ck-body-disclaimer-color", label: "Text Color", type: "color", defaultValue: "#666666" },
      { key: "--ck-body-disclaimer-link-color", label: "Link Color", type: "color", defaultValue: "#0066cc" },
      { key: "--ck-body-disclaimer-link-hover-color", label: "Link Hover Color", type: "color", defaultValue: "#0055aa" },
    ],
  },
  {
    name: "SIWE & QR",
    description: "Sign-In with Ethereum and QR code",
    variables: [
      { key: "--ck-siwe-border", label: "SIWE Border", type: "color", defaultValue: "#dddddd" },
      { key: "--ck-qr-dot-color", label: "QR Dot Color", type: "color", defaultValue: "#000000" },
    ],
  },
];

// Convert any color format to 7-character hex for <input type="color">
// Returns #000000 if conversion fails (picker only - text input keeps original)
function ensureHex(value: string): string {
  if (!value || value.trim() === "") return "#000000";

  const trimmed = value.trim();

  // Already valid 7-char hex (case insensitive)
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // 3-char hex (#fff -> #ffffff)
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  // 8-char hex with alpha (#ffffffaa -> #ffffff)
  if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
    return trimmed.slice(0, 7).toLowerCase();
  }

  // 4-char hex with alpha (#fffa -> #ffffff)
  if (/^#[0-9a-fA-F]{4}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  // For rgba, rgb, or named colors - use canvas to convert
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000000"; // Reset first
        ctx.fillStyle = trimmed; // Try to set the color
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const hex = `#${data[0].toString(16).padStart(2, "0")}${data[1].toString(16).padStart(2, "0")}${data[2].toString(16).padStart(2, "0")}`;
        return hex;
      }
    } catch {
      // Fall through
    }
  }

  return "#000000";
}

// Color input component
function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  // Convert to valid hex for the color picker (picker requires #rrggbb format)
  const pickerValue = useMemo(() => {
    const hex = ensureHex(value);
    console.log("ColorInput:", { label, value, pickerValue: hex });
    return hex;
  }, [value, label]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 rounded overflow-hidden border border-zinc-700">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0 m-0"
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            backgroundColor: pickerValue,
          }}
          title={label}
        />
        {/* Color swatch overlay to ensure color is visible */}
        <div
          className="absolute inset-0 pointer-events-none rounded"
          style={{ backgroundColor: pickerValue }}
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
      />
    </div>
  );
}

// Text input for dimensions/shadows
function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
    />
  );
}

// Collapsible section component
function Section({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      >
        <div className="text-left">
          <div className="font-medium text-white">{title}</div>
          <div className="text-xs text-zinc-400">{description}</div>
        </div>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-4 space-y-3 bg-zinc-900/50">{children}</div>}
    </div>
  );
}

// Variable editor row
function VariableEditor({
  variable,
  value,
  onChange,
}: {
  variable: CSSVariable;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-zinc-400 block">{variable.label}</label>
      {variable.type === "color" ? (
        <ColorInput value={value} onChange={onChange} label={variable.label} />
      ) : (
        <TextInput value={value} onChange={onChange} placeholder={variable.defaultValue} />
      )}
    </div>
  );
}

// Generate code snippet
function generateCodeSnippet(
  theme: ThemeValue,
  mode: ModeValue,
  customTheme: CustomTheme
): string {
  const filteredTheme = Object.fromEntries(
    Object.entries(customTheme).filter(([, v]) => v !== "")
  );

  const hasCustomTheme = Object.keys(filteredTheme).length > 0;

  let code = `<PayKitProvider
  apiKey={process.env.NEXT_PUBLIC_COIN_VOYAGE_API_KEY}`;

  if (theme !== "auto") {
    code += `\n  theme="${theme}"`;
  }

  code += `\n  mode="${mode}"`;

  if (hasCustomTheme) {
    code += `\n  customTheme={${JSON.stringify(filteredTheme, null, 4).replace(/\n/g, "\n  ")}}`;
  }

  code += `\n>
  {children}
</PayKitProvider>`;

  return code;
}

// Generate standalone customTheme object
function generateThemeObject(customTheme: CustomTheme): string {
  const filteredTheme = Object.fromEntries(
    Object.entries(customTheme).filter(([, v]) => v !== "")
  );

  if (Object.keys(filteredTheme).length === 0) {
    return "// No custom theme variables set";
  }

  return `const customTheme = ${JSON.stringify(filteredTheme, null, 2)};`;
}

export default function ThemeBuilder() {
  const router = useRouter();
  const {
    theme: savedTheme,
    mode: savedMode,
    customTheme: savedCustomTheme,
    setTheme: setSavedTheme,
    setMode: setSavedMode,
    setCustomTheme: setSavedCustomTheme,
    resetAll: resetGlobal,
    isHydrated,
  } = useTheme();

  // Draft state - local to this component
  // Initialize with saved values from context
  const [draftTheme, setDraftTheme] = useState<ThemeValue>(savedTheme);
  const [draftMode, setDraftMode] = useState<ModeValue>(savedMode);
  const [draftCustomTheme, setDraftCustomTheme] = useState<CustomTheme>(savedCustomTheme);

  // Track if we've synced with hydrated values
  const [hasSyncedWithHydrated, setHasSyncedWithHydrated] = useState(false);

  // Sync draft state with saved state after hydration completes
  // This ensures localStorage values are loaded into draft state
  useEffect(() => {
    if (isHydrated && !hasSyncedWithHydrated) {
      setDraftTheme(savedTheme);
      setDraftMode(savedMode);
      setDraftCustomTheme(savedCustomTheme);
      setHasSyncedWithHydrated(true);
    }
  }, [isHydrated, hasSyncedWithHydrated, savedTheme, savedMode, savedCustomTheme]);

  // UI state
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  const apiKey = process.env.NEXT_PUBLIC_COIN_VOYAGE_API_KEY;

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (draftTheme !== savedTheme) return true;
    if (draftMode !== savedMode) return true;
    if (JSON.stringify(draftCustomTheme) !== JSON.stringify(savedCustomTheme)) return true;
    return false;
  }, [draftTheme, draftMode, draftCustomTheme, savedTheme, savedMode, savedCustomTheme]);

  // Generate preview key to force remount when theme changes
  const previewKey = useMemo(
    () => `${draftTheme}-${draftMode}-${JSON.stringify(draftCustomTheme)}`,
    [draftTheme, draftMode, draftCustomTheme]
  );

  // Code generation uses DRAFT state so users see what they're building
  const codeSnippet = useMemo(
    () => generateCodeSnippet(draftTheme, draftMode, draftCustomTheme),
    [draftTheme, draftMode, draftCustomTheme]
  );

  const themeObject = useMemo(
    () => generateThemeObject(draftCustomTheme),
    [draftCustomTheme]
  );

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Update a single draft CSS variable
  const updateDraftVar = useCallback((key: string, value: string) => {
    console.log("Draft Update:", key, value);
    setDraftCustomTheme((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear a single draft CSS variable
  const clearDraftVar = useCallback((key: string) => {
    setDraftCustomTheme((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Load a preset into draft state
  const loadPreset = useCallback((presetName: keyof typeof THEME_PRESETS) => {
    setDraftCustomTheme(THEME_PRESETS[presetName]);
  }, []);

  // Save draft to global state
  const saveChanges = useCallback(() => {
    setSavedTheme(draftTheme);
    setSavedMode(draftMode);
    setSavedCustomTheme(draftCustomTheme);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [draftTheme, draftMode, draftCustomTheme, setSavedTheme, setSavedMode, setSavedCustomTheme]);

  // Reset draft to saved state
  const resetToSaved = useCallback(() => {
    setDraftTheme(savedTheme);
    setDraftMode(savedMode);
    setDraftCustomTheme(savedCustomTheme);
  }, [savedTheme, savedMode, savedCustomTheme]);

  // Reset everything (draft and global)
  const resetAll = useCallback(() => {
    resetGlobal();
    setDraftTheme("auto");
    setDraftMode("dark");
    setDraftCustomTheme({});
  }, [resetGlobal]);

  const activeVariablesCount = Object.values(draftCustomTheme).filter((v) => v !== "").length;

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-400">Loading theme...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              title="Back to App"
            >
              <svg
                className="w-5 h-5 text-zinc-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold">Theme Builder Playground</h1>
              <p className="text-sm text-zinc-400">
                Customize your PayKit widget theme in real-time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                Unsaved changes
              </span>
            )}
            <span className="text-sm text-zinc-500">
              {activeVariablesCount} variable{activeVariablesCount !== 1 ? "s" : ""} customized
            </span>
            {/* Preset buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => loadPreset("cyberpunk")}
                className="px-3 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded transition-colors"
              >
                Cyberpunk
              </button>
              <button
                onClick={() => loadPreset("clean")}
                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                Clean
              </button>
            </div>
            {/* Reset to Saved */}
            <button
              onClick={resetToSaved}
              disabled={!hasUnsavedChanges}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                hasUnsavedChanges
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                  : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
              }`}
            >
              Reset to Saved
            </button>
            {/* Reset All */}
            <button
              onClick={resetAll}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Reset All
            </button>
            {/* Save Changes */}
            <button
              onClick={saveChanges}
              disabled={!hasUnsavedChanges && saveStatus === "idle"}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                saveStatus === "saved"
                  ? "bg-green-600 text-white"
                  : hasUnsavedChanges
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-600/50 text-blue-300 cursor-not-allowed"
              }`}
            >
              {saveStatus === "saved" ? "Saved!" : "Save Changes"}
            </button>
            {/* Show Code */}
            <button
              onClick={() => setShowCode(!showCode)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                showCode ? "bg-purple-600 hover:bg-purple-700" : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {showCode ? "Hide Code" : "Show Code"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto flex">
        {/* Left Panel - Controls */}
        <div className="w-[420px] border-r border-zinc-800 h-[calc(100vh-73px)] overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Base Theme Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Base Theme</label>
              <select
                value={draftTheme}
                onChange={(e) => setDraftTheme(e.target.value as ThemeValue)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
              >
                {BASE_THEMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Mode</label>
              <div className="flex gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setDraftMode(m.value)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      draftMode === m.value
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* CSS Variable Groups */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-300">CSS Variables</h2>
              {CSS_VARIABLE_GROUPS.map((group) => (
                <Section
                  key={group.name}
                  title={group.name}
                  description={group.description}
                  defaultOpen={group.defaultOpen}
                >
                  {group.variables.map((variable) => (
                    <div key={variable.key} className="relative">
                      <VariableEditor
                        variable={variable}
                        value={draftCustomTheme[variable.key] || ""}
                        onChange={(value) => updateDraftVar(variable.key, value)}
                      />
                      {draftCustomTheme[variable.key] && (
                        <button
                          onClick={() => clearDraftVar(variable.key)}
                          className="absolute top-0 right-0 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                          title="Clear this variable"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  ))}
                </Section>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Preview & Code */}
        <div className="flex-1 h-[calc(100vh-73px)] overflow-y-auto">
          {/* Code Panel (Collapsible) */}
          {showCode && (
            <div className="border-b border-zinc-800 bg-zinc-900/30 p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-300">
                      Custom Theme Object
                      <span className="ml-2 text-xs text-zinc-500">(draft)</span>
                    </h3>
                    <button
                      onClick={() => copyToClipboard(themeObject)}
                      className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 overflow-x-auto max-h-64">
                    <code>{themeObject}</code>
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-300">
                      Provider Usage
                      <span className="ml-2 text-xs text-zinc-500">(draft)</span>
                    </h3>
                    <button
                      onClick={() => copyToClipboard(codeSnippet)}
                      className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 overflow-x-auto">
                    <code>{codeSnippet}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Preview Area */}
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-white">Live Preview</h2>
              <p className="text-sm text-zinc-400">
                Click the button to see the modal with your draft theme applied.
                Click &quot;Save Changes&quot; to apply globally.
              </p>
            </div>

            {(() => {
              console.log("Rendering Preview with:", { draftTheme, draftMode, customThemeKeys: Object.keys(draftCustomTheme), previewKey: previewKey.slice(0, 50) + "..." });
              return null;
            })()}

            {apiKey ? (
              <div key={previewKey} className="space-y-6">
                <WalletProvider>
                  <PayKitProvider
                    apiKey={apiKey}
                    theme={draftTheme}
                    mode={draftMode}
                    customTheme={draftCustomTheme}
                  >
                    {/* Widget Preview Section */}
                    <div className="rounded-xl border border-zinc-800 overflow-hidden">
                      <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
                        <h3 className="text-sm font-medium text-zinc-300">Widget Preview</h3>
                        <p className="text-xs text-zinc-500">Click button to open the payment modal</p>
                      </div>
                      <div
                        className="p-8 flex items-center justify-center min-h-[200px]"
                        style={{
                          background: `
                            linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
                            linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
                            linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
                          `,
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                          backgroundColor: "#0f0f0f",
                        }}
                      >
                        <PayButton
                          intent="Pay With Crypto"
                          toChain={ChainId.SUI}
                          toAddress="0x7b8e0864967427679b4e129f79dc332a885c6087ec9e187b53451a9006ee15f2"
                          toAmount="9.99"
                        />
                      </div>
                    </div>

                    {/* PayButton Styles Section */}
                    <div className="rounded-xl border border-zinc-800 overflow-hidden">
                      <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
                        <h3 className="text-sm font-medium text-zinc-300">PayButton Styles</h3>
                        <p className="text-xs text-zinc-500">Different button variations</p>
                      </div>
                      <div
                        className="p-8"
                        style={{
                          background: `
                            linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
                            linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
                            linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
                          `,
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                          backgroundColor: "#0f0f0f",
                        }}
                      >
                        <div className="flex flex-wrap gap-4 justify-center">
                          <div className="text-center">
                            <p className="text-xs text-zinc-500 mb-2">Default</p>
                            <PayButton
                              intent="Pay Now"
                              toChain={ChainId.SUI}
                              toAddress="0x7b8e0864967427679b4e129f79dc332a885c6087ec9e187b53451a9006ee15f2"
                              toAmount="19.99"
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-zinc-500 mb-2">Checkout</p>
                            <PayButton
                              intent="Checkout"
                              toChain={ChainId.SUI}
                              toAddress="0x7b8e0864967427679b4e129f79dc332a885c6087ec9e187b53451a9006ee15f2"
                              toAmount="49.99"
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-zinc-500 mb-2">Donate</p>
                            <PayButton
                              intent="Donate"
                              toChain={ChainId.SUI}
                              toAddress="0x7b8e0864967427679b4e129f79dc332a885c6087ec9e187b53451a9006ee15f2"
                              toAmount="5.00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Theme Info */}
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <p>
                        Theme: <span className="text-zinc-300">{draftTheme}</span>
                        {draftTheme !== savedTheme && <span className="text-amber-400 ml-1">(changed)</span>}
                      </p>
                      <p>
                        Mode: <span className="text-zinc-300">{draftMode}</span>
                        {draftMode !== savedMode && <span className="text-amber-400 ml-1">(changed)</span>}
                      </p>
                    </div>
                  </PayKitProvider>
                </WalletProvider>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">
                <p className="text-lg mb-2">API Key Required</p>
                <p className="text-sm">
                  Set{" "}
                  <code className="text-zinc-400">
                    NEXT_PUBLIC_COIN_VOYAGE_API_KEY
                  </code>{" "}
                  to see the preview
                </p>
              </div>
            )}

            {/* Theme Info */}
            <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Quick Tips</h3>
              <ul className="text-sm text-zinc-400 space-y-2">
                <li>
                  <span className="text-zinc-500">•</span> Changes are previewed instantly but not saved until you click &quot;Save Changes&quot;
                </li>
                <li>
                  <span className="text-zinc-500">•</span> Use &quot;Reset to Saved&quot; to discard your current changes
                </li>
                <li>
                  <span className="text-zinc-500">•</span> Use preset buttons to quickly load Cyberpunk or Clean themes
                </li>
                <li>
                  <span className="text-zinc-500">•</span> Click &quot;Show Code&quot; to copy the configuration for production use
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
