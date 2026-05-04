import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

export function newMnemonic(strengthBits: 128 | 256 = 128): string {
  return generateMnemonic(wordlist, strengthBits);
}

export function isValidMnemonic(phrase: string): boolean {
  return validateMnemonic(phrase.trim(), wordlist);
}

export function seedFromMnemonic(phrase: string, passphrase = ""): Uint8Array {
  return mnemonicToSeedSync(phrase.trim(), passphrase);
}
