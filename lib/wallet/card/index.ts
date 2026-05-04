// Slush Visa card prototype state. Pinned so screenshots / pitch demos are
// reproducible. The card's funding asset is USDC.base by default — CV's
// canonical USDC route. sUSD will be preferred once the issuer accepts it
// (see §4.7 of wallet-scope-of-work.md).

import { findToken, type Token } from "../swap/tokens";

export interface CardTransaction {
  id: string;
  merchant: string;
  category: string;
  amountUsd: number;
  date: string;
  status: "settled" | "pending";
}

export interface CardState {
  last4: string;
  expiry: string;
  holder: string;
  balanceUsd: number;
  fundingTokenId: string;
  transactions: CardTransaction[];
}

export const CARD: CardState = {
  last4: "4291",
  expiry: "09/30",
  holder: "Slush User",
  balanceUsd: 342.18,
  fundingTokenId: "base-usdc",
  transactions: [
    { id: "tx-1", merchant: "Apple Store", category: "Electronics", amountUsd: 129.0, date: "Today", status: "settled" },
    { id: "tx-2", merchant: "Uber", category: "Transport", amountUsd: 18.42, date: "Yesterday", status: "settled" },
    { id: "tx-3", merchant: "Whole Foods", category: "Groceries", amountUsd: 64.3, date: "May 2", status: "settled" },
    { id: "tx-4", merchant: "Spotify", category: "Subscription", amountUsd: 11.99, date: "May 1", status: "settled" },
    { id: "tx-5", merchant: "Lufthansa", category: "Travel", amountUsd: 612.4, date: "Apr 28", status: "settled" },
  ],
};

export function fundingToken(): Token {
  return findToken(CARD.fundingTokenId)!;
}
