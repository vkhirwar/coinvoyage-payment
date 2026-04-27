import crypto from "crypto";

const API_BASE = "https://api.coinvoyage.io/v2";

function getApiKey(): string {
  const key =
    process.env.COIN_VOYAGE_API_KEY ||
    process.env.NEXT_PUBLIC_COIN_VOYAGE_API_KEY;
  if (!key) throw new Error("COIN_VOYAGE_API_KEY is not set");
  return key;
}

function getSecretKey(): string {
  const key = process.env.COIN_VOYAGE_SECRET_KEY;
  if (!key) throw new Error("COIN_VOYAGE_SECRET_KEY is not set");
  return key;
}

function authHeader(body: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `APIKey=${getApiKey()},signature=${signature},timestamp=${timestamp}`;
}

export type PayOrderMode = "SALE" | "DEPOSIT" | "REFUND";

export interface CreatePayOrderInput {
  mode: PayOrderMode;
  amount: string | number;
  asset?: string;
  receiving_address?: string;
  metadata?: Record<string, string>;
}

export interface PayOrder {
  id: string;
  mode: PayOrderMode;
  status: string;
  intent?: { amount?: string | number; asset?: string; receiving_address?: string };
  metadata?: Record<string, string>;
  payment_data?: Record<string, unknown>;
  [k: string]: unknown;
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { message?: string } | string;
  message?: string;
}

async function call<T>(
  path: string,
  init: { method: string; body?: string; signed?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    "X-API-KEY": getApiKey(),
  };
  if (init.body) headers["Content-Type"] = "application/json";
  if (init.signed) headers["Authorization-Signature"] = authHeader(init.body ?? "");

  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body,
  });
  const text = await res.text();
  let parsed: ApiEnvelope<T> | T;
  try {
    parsed = text ? JSON.parse(text) : ({} as T);
  } catch {
    throw new Error(`CoinVoyage ${path} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const env = parsed as ApiEnvelope<T>;
    const msg =
      typeof env.error === "string"
        ? env.error
        : env.error?.message || env.message || `HTTP ${res.status}`;
    throw new Error(`CoinVoyage ${path}: ${msg}`);
  }
  const env = parsed as ApiEnvelope<T>;
  return (env.data ?? (parsed as T)) as T;
}

export function createPayOrder(input: CreatePayOrderInput): Promise<PayOrder> {
  const body = JSON.stringify({
    mode: input.mode,
    intent: {
      amount: input.amount,
      asset: input.asset,
      receiving_address: input.receiving_address,
    },
    metadata: input.metadata,
  });
  return call<PayOrder>("/pay-orders", { method: "POST", body, signed: true });
}

export function getPayOrder(id: string): Promise<PayOrder> {
  return call<PayOrder>(`/pay-orders/${encodeURIComponent(id)}`, { method: "GET" });
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.COIN_VOYAGE_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
