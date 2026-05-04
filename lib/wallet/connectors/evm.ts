/**
 * Wagmi connector backed by an HD-derived EVM key.
 *
 * Lets the existing CoinVoyage hooks (`useAccount({ chainType: EVM })`,
 * `usePrepareTransaction(EVM)`) treat the Slush prototype's derived key as
 * a "connected wallet" — no browser extension needed. The wallet picks
 * itself up via `WalletConfiguration.evm.connectors` in app/providers.tsx
 * and auto-connects on mount when a mnemonic is stored.
 *
 * Production: derive lazily from an encrypted-at-rest seed (passphrase or
 * WebAuthn key). For the prototype the mnemonic comes straight from
 * localStorage via `lib/wallet/store.ts`.
 */

import { createConnector } from "wagmi";
import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type Hex,
  type SendTransactionParameters,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { extendConnector } from "@coin-voyage/crypto/evm";

const DERIVATION_PATH = "m/44'/60'/0'/0/0" as const;

interface SlushDerivedConnectorParams {
  /** Returns the user's mnemonic, or null if the wallet hasn't been initialized. */
  getMnemonic: () => string | null;
  /** Optional id override — defaults to "slushDerived". */
  id?: string;
  /** Optional display name — defaults to "Slush Wallet". */
  displayName?: string;
}

export function createSlushDerivedEvmConnector(params: SlushDerivedConnectorParams) {
  const { getMnemonic } = params;
  const id = params.id ?? "slushDerived";
  const displayName = params.displayName ?? "Slush Wallet";

  const connectorFn = createConnector((config) => {
    let connected = false;
    let chainId: number = config.chains[0].id;

    function deriveAddress(): Address | null {
      const m = getMnemonic();
      if (!m) return null;
      try {
        return mnemonicToAccount(m, { path: DERIVATION_PATH }).address;
      } catch {
        return null;
      }
    }

    function deriveAccount() {
      const m = getMnemonic();
      if (!m) throw new Error("Slush wallet not initialized: no mnemonic stored.");
      return mnemonicToAccount(m, { path: DERIVATION_PATH });
    }

    function chainOrThrow(id: number): Chain {
      const c = config.chains.find((c) => c.id === id);
      if (!c) throw new Error(`Slush: unsupported chain ${id}`);
      return c;
    }

    function publicClientFor(id: number) {
      const chain = chainOrThrow(id);
      const transport = config.transports?.[id] ?? http();
      return createPublicClient({ chain, transport });
    }

    /**
     * EIP-1193 provider that signs locally and forwards reads to the
     * chain's public client. Sufficient for paykit's transfer + calldata
     * execution flows; not a full provider replacement for arbitrary dApps.
     */
    function buildProvider() {
      return {
        async request({ method, params }: { method: string; params?: unknown[] }) {
          switch (method) {
            case "eth_accounts":
            case "eth_requestAccounts": {
              const addr = deriveAddress();
              return addr ? [addr] : [];
            }
            case "eth_chainId":
              return `0x${chainId.toString(16)}`;
            case "wallet_switchEthereumChain": {
              const requested = parseInt(
                (params?.[0] as { chainId?: string })?.chainId ?? "0x1",
                16,
              );
              chainOrThrow(requested);
              chainId = requested;
              config.emitter.emit("change", { chainId: requested });
              return null;
            }
            case "personal_sign": {
              const account = deriveAccount();
              const [data] = (params ?? []) as [Hex];
              return account.signMessage({ message: { raw: data } });
            }
            case "eth_sign": {
              const account = deriveAccount();
              const [, data] = (params ?? []) as [Address, Hex];
              return account.signMessage({ message: { raw: data } });
            }
            case "eth_signTypedData_v4": {
              const account = deriveAccount();
              const [, json] = (params ?? []) as [Address, string];
              const typed = JSON.parse(json);
              return account.signTypedData(typed);
            }
            case "eth_sendTransaction": {
              const account = deriveAccount();
              const [tx] = (params ?? []) as [SendTransactionParameters & { gas?: Hex; gasPrice?: Hex; maxFeePerGas?: Hex; maxPriorityFeePerGas?: Hex }];
              const chain = chainOrThrow(chainId);
              const transport = config.transports?.[chainId] ?? http();
              const { createWalletClient } = await import("viem");
              const wallet = createWalletClient({ account, chain, transport });
              return wallet.sendTransaction({
                ...tx,
                account,
                chain,
              });
            }
            default: {
              // Forward all read RPCs to the chain's public client.
              const pub = publicClientFor(chainId);
              return pub.request({ method, params } as Parameters<typeof pub.request>[0]);
            }
          }
        },
      };
    }

    return {
      id,
      name: displayName,
      type: "slushDerived",
      icon: undefined,

      async setup() {},

      async connect(parameters?: { chainId?: number; isReconnecting?: boolean }) {
        const addr = deriveAddress();
        if (!addr) throw new Error("Slush wallet not initialized.");
        const requestChainId = parameters?.chainId;
        if (requestChainId) chainOrThrow(requestChainId);
        chainId = requestChainId ?? chainId;
        connected = true;
        const accounts: readonly Address[] = [addr];
        config.emitter.emit("connect", { accounts, chainId });
        // Cast satisfies wagmi's `withCapabilities extends true ? ... : readonly Address[]`
        // — we never opt into capabilities, so the simple shape is correct.
        return { accounts, chainId } as never;
      },

      async disconnect() {
        connected = false;
        config.emitter.emit("disconnect");
      },

      async getAccounts() {
        const addr = deriveAddress();
        return addr ? [addr] : [];
      },

      async getChainId() {
        return chainId;
      },

      async getProvider() {
        return buildProvider();
      },

      async isAuthorized() {
        return connected && deriveAddress() !== null;
      },

      async switchChain({ chainId: newId }) {
        const chain = chainOrThrow(newId);
        chainId = newId;
        config.emitter.emit("change", { chainId: newId });
        return chain;
      },

      onAccountsChanged(accounts: string[]) {
        if (!accounts.length) {
          connected = false;
          config.emitter.emit("disconnect");
        } else {
          config.emitter.emit("change", { accounts: accounts as Address[] });
        }
      },

      onChainChanged(id: string) {
        const next = parseInt(id);
        chainId = next;
        config.emitter.emit("change", { chainId: next });
      },

      onDisconnect() {
        connected = false;
        config.emitter.emit("disconnect");
      },
    };
  });

  return extendConnector(connectorFn, id, displayName);
}
