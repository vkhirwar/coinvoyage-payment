#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(p) {
  if (!existsSync(p)) return;
  const txt = readFileSync(p, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const REQUIRED = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "COIN_VOYAGE_API_KEY",
  "COIN_VOYAGE_SECRET_KEY",
  "COIN_VOYAGE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
];

const missing = REQUIRED.filter((k) => !process.env[k] && !(k === "COIN_VOYAGE_API_KEY" && process.env.NEXT_PUBLIC_COIN_VOYAGE_API_KEY));
if (missing.length) {
  console.error("Missing required env vars:");
  for (const k of missing) console.error("  -", k);
  console.error("\nSet them in .env.local or your shell, then re-run.");
  process.exit(1);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
const webhookUrl = `${appUrl}/api/telegram/webhook`;

async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description || res.status}`);
  return data.result;
}

const cmd = process.argv[2] || "setup";

if (cmd === "setup") {
  console.log(`Setting webhook → ${webhookUrl}`);
  const r = await tg("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
  console.log("setWebhook:", r);
  const info = await tg("getWebhookInfo");
  console.log("getWebhookInfo:", info);
  console.log("\nNext: register CoinVoyage webhook → " + appUrl + "/api/telegram/order-webhook");
} else if (cmd === "info") {
  const info = await tg("getWebhookInfo");
  console.log(JSON.stringify(info, null, 2));
} else if (cmd === "delete") {
  const r = await tg("deleteWebhook", { drop_pending_updates: false });
  console.log("deleteWebhook:", r);
} else {
  console.error(`Unknown command: ${cmd}. Use one of: setup, info, delete`);
  process.exit(2);
}
