import { NextRequest, NextResponse } from "next/server";
import { createPayOrder, getPayOrder, type PayOrder } from "@/lib/coinvoyage";
import {
  sendMessage,
  sendPhoto,
  qrUrl,
  escapeHtml as h,
  answerCallbackQuery,
  type InlineKeyboardButton,
} from "@/lib/telegram";
import { getStore } from "@/lib/telegram-store";
import { log } from "@/lib/log";

interface TgUser { id: number; first_name?: string; username?: string }
interface TgChat { id: number; type: string }
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
}
interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

type PendingState =
  | { kind: "pay"; step: "amount" | "asset"; amount?: string }
  | { kind: "deposit"; step: "amount" | "asset" | "address"; amount?: string; asset?: string };

const STATE_TTL = 10 * 60;
const LASTORDER_TTL = 30 * 24 * 3600;
const RL_WINDOW_SEC = 60;
const RL_LIMIT = 30;

const pendingKey = (chatId: number, userId: number) => `tg:pending:${chatId}:${userId}`;
const lastOrderKey = (userId: number) => `tg:lastorder:${userId}`;
const rlKey = (chatId: number) => `tg:rl:${chatId}`;

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set (needed for Mini App link)");
  return url.replace(/\/$/, "");
}

function mainMenu(): InlineKeyboardButton[][] {
  return [
    [
      { text: "Pay", callback_data: "start:pay" },
      { text: "Deposit", callback_data: "start:deposit" },
    ],
    [{ text: "Open Swap / Bridge", web_app: { url: `${appUrl()}/swap` } }],
    [{ text: "Help", callback_data: "help:main" }],
  ];
}

function orderKb(orderId: string): InlineKeyboardButton[][] {
  return [[
    { text: "Refresh", callback_data: `refresh:${orderId}` },
    { text: "Open Mini App", web_app: { url: `${appUrl()}/swap` } },
  ]];
}

function helpHtml(topic: "main" | "pay" | "deposit"): string {
  if (topic === "pay") {
    return [
      "<b>Pay</b> — create a SALE pay-order that settles to merchant defaults.",
      "",
      "Usage: <code>/pay &lt;amount&gt; [asset]</code>",
      "Example: <code>/pay 25 USDC</code>",
      "",
      "Or just send /pay and I'll walk you through it.",
    ].join("\n");
  }
  if (topic === "deposit") {
    return [
      "<b>Deposit</b> — create a DEPOSIT pay-order; user funds any address from any chain.",
      "",
      "Usage: <code>/deposit &lt;amount&gt; &lt;asset&gt; &lt;address&gt;</code>",
      "Example: <code>/deposit 100 USDC 0xabc…</code>",
      "",
      "Or just send /deposit to walk through it.",
    ].join("\n");
  }
  return [
    "<b>CoinVoyage Bot</b>",
    "",
    "• /pay — create a sale order (interactive or one-shot)",
    "• /deposit — fund an address from any chain",
    "• /swap — open the swap &amp; bridge Mini App",
    "• /status [order_id] — check order (defaults to your last)",
    "• /cancel — abort the current step",
    "",
    "I'll DM you when an order's status changes.",
  ].join("\n");
}

function fmtOrderHtml(po: PayOrder): string {
  const pd = (po.payment_data ?? {}) as Record<string, unknown>;
  const lines = [
    `<b>Order</b> <code>${h(po.id)}</code>`,
    `Mode: ${h(po.mode)}`,
    `Status: <code>${h(po.status)}</code>`,
  ];
  if (pd.address) lines.push(`Pay to: <code>${h(String(pd.address))}</code>`);
  if (pd.amount) lines.push(`Amount: <code>${h(String(pd.amount))}</code>`);
  if (pd.asset) lines.push(`Asset: <code>${h(String(pd.asset))}</code>`);
  return lines.join("\n");
}

function paymentUriFromOrder(po: PayOrder): string | null {
  const pd = (po.payment_data ?? {}) as { address?: string };
  return pd.address ? String(pd.address) : null;
}

async function presentOrder(chatId: number, userId: number, po: PayOrder) {
  const store = getStore();
  await store.set(lastOrderKey(userId), po.id, LASTORDER_TTL);
  const uri = paymentUriFromOrder(po);
  const opts = { parse_mode: "HTML" as const, reply_markup: { inline_keyboard: orderKb(po.id) } };
  if (uri) await sendPhoto(chatId, qrUrl(uri), fmtOrderHtml(po), opts);
  else await sendMessage(chatId, fmtOrderHtml(po), opts);
}

async function rateLimited(chatId: number): Promise<boolean> {
  const n = await getStore().incr(rlKey(chatId), RL_WINDOW_SEC);
  return n > RL_LIMIT;
}

async function startPayFlow(chatId: number, userId: number, args: string[]) {
  if (args.length >= 1) {
    const [amount, asset] = args;
    const po = await createPayOrder({ mode: "SALE", amount, asset, metadata: { tg_chat_id: String(chatId), tg_user_id: String(userId) } });
    return presentOrder(chatId, userId, po);
  }
  await getStore().set(pendingKey(chatId, userId), { kind: "pay", step: "amount" } satisfies PendingState, STATE_TTL);
  return sendMessage(chatId, "How much? Send the amount (e.g. <code>25</code>) or /cancel.", { parse_mode: "HTML" });
}

async function startDepositFlow(chatId: number, userId: number, args: string[]) {
  if (args.length >= 3) {
    const [amount, asset, receiving_address] = args;
    const po = await createPayOrder({
      mode: "DEPOSIT",
      amount,
      asset,
      receiving_address,
      metadata: { tg_chat_id: String(chatId), tg_user_id: String(userId) },
    });
    return presentOrder(chatId, userId, po);
  }
  await getStore().set(pendingKey(chatId, userId), { kind: "deposit", step: "amount" } satisfies PendingState, STATE_TTL);
  return sendMessage(chatId, "How much do you want deposited? Send the amount or /cancel.", { parse_mode: "HTML" });
}

async function continueFlow(chatId: number, userId: number, text: string): Promise<boolean> {
  const store = getStore();
  const state = await store.get<PendingState>(pendingKey(chatId, userId));
  if (!state) return false;

  if (state.kind === "pay") {
    if (state.step === "amount") {
      await store.set(pendingKey(chatId, userId), { kind: "pay", step: "asset", amount: text } satisfies PendingState, STATE_TTL);
      await sendMessage(chatId, "Which asset? (e.g. <code>USDC</code>, <code>ETH</code>) — or send <code>-</code> to use the default.", { parse_mode: "HTML" });
      return true;
    }
    if (state.step === "asset") {
      const asset = text === "-" ? undefined : text;
      await store.del(pendingKey(chatId, userId));
      const po = await createPayOrder({ mode: "SALE", amount: state.amount!, asset, metadata: { tg_chat_id: String(chatId), tg_user_id: String(userId) } });
      await presentOrder(chatId, userId, po);
      return true;
    }
  }

  if (state.kind === "deposit") {
    if (state.step === "amount") {
      await store.set(pendingKey(chatId, userId), { kind: "deposit", step: "asset", amount: text } satisfies PendingState, STATE_TTL);
      await sendMessage(chatId, "Which asset? (e.g. <code>USDC</code>)", { parse_mode: "HTML" });
      return true;
    }
    if (state.step === "asset") {
      await store.set(pendingKey(chatId, userId), { kind: "deposit", step: "address", amount: state.amount, asset: text } satisfies PendingState, STATE_TTL);
      await sendMessage(chatId, "What's the receiving address?");
      return true;
    }
    if (state.step === "address") {
      await store.del(pendingKey(chatId, userId));
      const po = await createPayOrder({
        mode: "DEPOSIT",
        amount: state.amount!,
        asset: state.asset!,
        receiving_address: text,
        metadata: { tg_chat_id: String(chatId), tg_user_id: String(userId) },
      });
      await presentOrder(chatId, userId, po);
      return true;
    }
  }
  return false;
}

async function handleCommand(chatId: number, userId: number, text: string) {
  const [cmdRaw, ...args] = text.trim().split(/\s+/);
  const cmd = cmdRaw.replace(/@.+$/, "").toLowerCase();

  if (cmd === "/start" || cmd === "/menu") {
    return sendMessage(chatId, helpHtml("main"), { parse_mode: "HTML", reply_markup: { inline_keyboard: mainMenu() } });
  }
  if (cmd === "/help") return sendMessage(chatId, helpHtml("main"), { parse_mode: "HTML" });
  if (cmd === "/cancel") {
    await getStore().del(pendingKey(chatId, userId));
    return sendMessage(chatId, "Cancelled.");
  }
  if (cmd === "/swap" || cmd === "/bridge") {
    return sendMessage(chatId, "Opens in Telegram — sign with your wallet.", {
      reply_markup: { inline_keyboard: [[{ text: "Open Swap / Bridge", web_app: { url: `${appUrl()}/swap` } }]] },
    });
  }
  if (cmd === "/pay") return startPayFlow(chatId, userId, args);
  if (cmd === "/deposit") return startDepositFlow(chatId, userId, args);
  if (cmd === "/status") {
    let id = args[0];
    if (!id) id = (await getStore().get<string>(lastOrderKey(userId))) ?? "";
    if (!id) return sendMessage(chatId, "No recent order. Try <code>/status &lt;order_id&gt;</code>.", { parse_mode: "HTML" });
    const po = await getPayOrder(id);
    return sendMessage(chatId, fmtOrderHtml(po), { parse_mode: "HTML", reply_markup: { inline_keyboard: orderKb(po.id) } });
  }

  return sendMessage(chatId, "Unknown command. Try /help");
}

async function handleCallback(cq: TgCallbackQuery) {
  const chatId = cq.message?.chat.id;
  const userId = cq.from.id;
  if (!chatId) return;
  const data = cq.data ?? "";

  if (data.startsWith("help:")) {
    const topic = data.slice(5) as "main" | "pay" | "deposit";
    await sendMessage(chatId, helpHtml(topic), { parse_mode: "HTML" });
  } else if (data === "start:pay") {
    await startPayFlow(chatId, userId, []);
  } else if (data === "start:deposit") {
    await startDepositFlow(chatId, userId, []);
  } else if (data.startsWith("refresh:")) {
    const id = data.slice("refresh:".length);
    try {
      const po = await getPayOrder(id);
      await sendMessage(chatId, fmtOrderHtml(po), { parse_mode: "HTML", reply_markup: { inline_keyboard: orderKb(po.id) } });
    } catch (err) {
      log("warn", "telegram/webhook", "refresh failed", { id, err: String(err) });
    }
  }
  await answerCallbackQuery(cq.id).catch(() => {});
}

export async function POST(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TgUpdate;
  try { update = (await req.json()) as TgUpdate; }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  const userId = update.message?.from?.id ?? update.callback_query?.from.id;

  if (chatId && (await rateLimited(chatId))) {
    log("warn", "telegram/webhook", "rate limited", { chatId, userId });
    return NextResponse.json({ ok: true, skipped: "rate_limited" });
  }

  try {
    if (update.message?.text && userId) {
      const text = update.message.text;
      if (text.startsWith("/")) await handleCommand(update.message.chat.id, userId, text);
      else {
        const handled = await continueFlow(update.message.chat.id, userId, text);
        if (!handled) await sendMessage(update.message.chat.id, "Send /help for commands.");
      }
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (err) {
    log("error", "telegram/webhook", "update handler failed", { err: err instanceof Error ? err.message : String(err) });
    if (chatId) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      await sendMessage(chatId, `Error: ${msg}`).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
