import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";

const ED25519_KEY = new TextEncoder().encode("ed25519 seed");
const HARDENED_OFFSET = 0x80000000;

interface Node {
  privateKey: Uint8Array;
  chainCode: Uint8Array;
}

function masterFromSeed(seed: Uint8Array): Node {
  const I = hmac(sha512, ED25519_KEY, seed);
  return { privateKey: I.slice(0, 32), chainCode: I.slice(32) };
}

function deriveHardenedChild(parent: Node, index: number): Node {
  if (index < HARDENED_OFFSET) {
    throw new Error("ed25519 SLIP-0010 only supports hardened derivation");
  }
  const data = new Uint8Array(1 + 32 + 4);
  data[0] = 0x00;
  data.set(parent.privateKey, 1);
  new DataView(data.buffer).setUint32(33, index, false);
  const I = hmac(sha512, parent.chainCode, data);
  return { privateKey: I.slice(0, 32), chainCode: I.slice(32) };
}

function parsePath(path: string): number[] {
  if (!path.startsWith("m/")) throw new Error(`bad path: ${path}`);
  const parts = path.slice(2).split("/").filter(Boolean);
  return parts.map((seg) => {
    const hardened = seg.endsWith("'") || seg.endsWith("h");
    const n = parseInt(hardened ? seg.slice(0, -1) : seg, 10);
    if (!hardened) {
      throw new Error("ed25519 SLIP-0010 only supports hardened derivation");
    }
    return n + HARDENED_OFFSET;
  });
}

export function derivePrivateKey(seed: Uint8Array, path: string): Uint8Array {
  let node = masterFromSeed(seed);
  for (const idx of parsePath(path)) {
    node = deriveHardenedChild(node, idx);
  }
  return node.privateKey;
}
