import { HDKey } from "@scure/bip32";
import { base58 } from "@scure/base";
import { NETWORK as BTC_MAINNET, p2wpkh } from "@scure/btc-signer";
import { ed25519 } from "@noble/curves/ed25519";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { mnemonicToAccount } from "viem/accounts";

import { CHAINS, type ChainKey, type ChainMeta, type DerivedAddress } from "./types";
import { seedFromMnemonic } from "./seed";
import { derivePrivateKey as deriveEd25519 } from "./slip10-ed25519";

const PATHS = {
  evm: "m/44'/60'/0'/0/0",
  btc: "m/84'/0'/0'/0/0",
  sol: "m/44'/501'/0'/0'",
  sui: "m/44'/784'/0'/0'/0'",
} as const;

function deriveEvm(mnemonic: string, chain: ChainMeta): DerivedAddress {
  const account = mnemonicToAccount(mnemonic, { path: "m/44'/60'/0'/0/0" });
  return { chain, address: account.address, derivationPath: PATHS.evm };
}

function deriveBtc(seed: Uint8Array, chain: ChainMeta): DerivedAddress {
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(PATHS.btc);
  if (!child.publicKey) throw new Error("btc derivation: no public key");
  const { address } = p2wpkh(child.publicKey, BTC_MAINNET);
  if (!address) throw new Error("btc derivation: no address");
  return { chain, address, derivationPath: PATHS.btc };
}

function deriveSol(seed: Uint8Array, chain: ChainMeta): DerivedAddress {
  const priv = deriveEd25519(seed, PATHS.sol);
  const pub = ed25519.getPublicKey(priv);
  return { chain, address: base58.encode(pub), derivationPath: PATHS.sol };
}

function deriveSui(mnemonic: string, chain: ChainMeta): DerivedAddress {
  const kp = Ed25519Keypair.deriveKeypair(mnemonic, PATHS.sui);
  return { chain, address: kp.toSuiAddress(), derivationPath: PATHS.sui };
}

export function deriveAll(mnemonic: string): DerivedAddress[] {
  const seed = seedFromMnemonic(mnemonic);
  return CHAINS.map((chain) => {
    switch (chain.kind) {
      case "evm":
        return deriveEvm(mnemonic, chain);
      case "btc":
        return deriveBtc(seed, chain);
      case "sol":
        return deriveSol(seed, chain);
      case "sui":
        return deriveSui(mnemonic, chain);
    }
  });
}

export function deriveOne(mnemonic: string, key: ChainKey): DerivedAddress {
  const chain = CHAINS.find((c) => c.key === key);
  if (!chain) throw new Error(`unknown chain: ${key}`);
  const seed = seedFromMnemonic(mnemonic);
  switch (chain.kind) {
    case "evm":
      return deriveEvm(mnemonic, chain);
    case "btc":
      return deriveBtc(seed, chain);
    case "sol":
      return deriveSol(seed, chain);
    case "sui":
      return deriveSui(mnemonic, chain);
  }
}
