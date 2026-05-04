// LocalStorage-backed seed store for the prototype.
// PRODUCTION: replace with browser-encrypted-at-rest (e.g. WebAuthn-wrapped key,
// password-derived AES) — never ship raw mnemonic to localStorage in real shipped product.

import { DEMO_MNEMONIC } from "./core";

const KEY = "slush:mnemonic";

export function loadMnemonic(): string {
  if (typeof window === "undefined") return DEMO_MNEMONIC;
  try {
    return window.localStorage.getItem(KEY) ?? DEMO_MNEMONIC;
  } catch {
    return DEMO_MNEMONIC;
  }
}

export function saveMnemonic(phrase: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, phrase.trim());
}

export function clearMnemonic(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function hasMnemonic(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.localStorage.getItem(KEY);
  } catch {
    return false;
  }
}
