import { NextRequest, NextResponse } from "next/server";
import { createPayOrder, getPayOrder, type PayOrder } from "@/lib/coinvoyage";
import { sendMessage, sendPhoto, qrUrl, type InlineKeyboardButton } from "@/lib/telegram";

interface TgUser { id: number; first_name?: string; username?: string }
interface TgChat { id: number; type: string }
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  entities?: { type: string; offset: number; length: number }[];
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

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not set (needed for Mini App link)");
  return url.replace(/\/$/, "");
}

function mainMenu(): InlineKeyboardButton[][] {
  return [
    [
      { text: "Pay", callback_data: "help:pay" },
      { text: "Deposit", callback_data: "help:deposit" },
    ],
    [
      { text: "Open Swap / Bridge", web_app: { url: `${appUrl()}/swap` } },
    ],
    [
      { text: "Help", callback_data: "help:main" },
    ],
  ];
}

function helpText(topic: "main" | "pay" | "deposit"): string {
  if (topic === "pay") {
    return [
      "*Pay* — create a SALE pay-order that settles to merchant defaults.",
      "",
      "Usage:",
      "`/pay <amount> [asset]`",
      "",
      "Example: `/pay 25 USDC`",
    ].join("\n");
  }
  if (topic === "deposit") {
    return [
      "*Deposit* — create a DEPOSIT pay-order; user funds any address from any supported chain.",
      "",
      "Usage:",
      "`/deposit <amount> <asset> <receiving_address>`",
      "",
      "Example: `/deposit 100 USDC 0xabc…`",
    ].join("\n");
  }
  return [
    "*CoinVoyage Bot*",
    "",
    "• `/pay <amount> [asset]` — create a sale order",
    "• `/deposit <amount> <asset> <address>` — fund an address from any chain",
    "• `/swap` — open the swap & bridge Mini App",
    "• `/status <order_id>` — check pay-order status",
    "",
    "I'll DM you here when an order's status changes.",
  ].join("\n");
}

function fmtOrder(po: PayOrder): string {
  const pd = (po.payment_data ?? {}) as Record<string, unknown>;
  const lines = [
    `*Order* \`${po.id}\``,
    `Mode: ${po.mode}`,
    `Status: \`${po.status}\``,
  ];
  if (pd.address) lines.push(`Pay to: \`${String(pd.address)}\``);
  if (pd.amount) lines.push(`Amount: \`${String(pd.amount)}\``);
  if (pd.asset) lines.push(`Asset: \`${String(pd.asset)}\``);
  return lines.join("\n");
}

function paymentUriFromOrder(po: PayOrder): string | null {
  const pd = (po.payment_data ?? {}) as { address?: string; amount?: string; asset?: string };
  return pd.address ? String(pd.address) : null;
}

async function handleCommand(chatId: number, text: string) {
  const [cmdRaw, ...args] = text.trim().split(/\s+/);
  const cmd = cmdRaw.replace(/@.+$/, "").toLowerCase();

  if (cmd === "/start" || cmd === "/menu") {
    return sendMessage(chatId, helpText("main"), {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: mainMenu() },
    });
  }
  if (cmd === "/help") {
    return sendMessage(chatId, helpText("main"), { parse_mode: "Markdown" });
  }
  if (cmd === "/swap" || cmd === "/bridge") {
    return sendMessage(chatId, "Opens in Telegram — sign with your wallet.", {
      reply_markup: {
        inline_keyboard: [[{ text: "Open Swap / Bridge", web_app: { url: `${appUrl()}/swap` } }]],
      },
    });
  }
  if (cmd === "/pay") {
    if (args.length < 1) return sendMessage(chatId, helpText("pay"), { parse_mode: "Markdown" });
    const [amount, asset] = args;
    const po = await createPayOrder({
      mode: "SALE",
      amount,
      asset,
      metadata: { tg_chat_id: String(chatId) },
    });
    const uri = paymentUriFromOrder(po);
    if (uri) await sendPhoto(chatId, qrUrl(uri), fmtOrder(po), { parse_mode: "Markdown" });
    else await sendMessage(chatId, fmtOrder(po), { parse_mode: "Markdown" });
    return;
  }
  if (cmd === "/deposit") {
    if (args.length < 3) return sendMessage(chatId, helpText("deposit"), { parse_mode: "Markdown" });
    const [amount, asset, receiving_address] = args;
    const po = await createPayOrder({
      mode: "DEPOSIT",
      amount,
      asset,
      receiving_address,
      metadata: { tg_chat_id: String(chatId) },
    });
    const uri = paymentUriFromOrder(po);
    if (uri) await sendPhoto(chatId, qrUrl(uri), fmtOrder(po), { parse_mode: "Markdown" });
    else await sendMessage(chatId, fmtOrder(po), { parse_mode: "Markdown" });
    return;
  }
  if (cmd === "/status") {
    if (args.length < 1) return sendMessage(chatId, "Usage: `/status <order_id>`", { parse_mode: "Markdown" });
    const po = await getPayOrder(args[0]);
    return sendMessage(chatId, fmtOrder(po), { parse_mode: "Markdown" });
  }

  return sendMessage(chatId, "Unknown command. Try /help");
}

async function handleCallback(cq: TgCallbackQuery) {
  const chatId = cq.message?.chat.id;
  if (!chatId) return;
  const data = cq.data ?? "";
  if (data.startsWith("help:")) {
    const topic = data.slice(5) as "main" | "pay" | "deposit";
    await sendMessage(chatId, helpText(topic), { parse_mode: "Markdown" });
  }
}

export async function POST(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    if (update.message?.text && update.message.text.startsWith("/")) {
      await handleCommand(update.message.chat.id, update.message.text);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (err) {
    console.error("[telegram/webhook]", err);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      await sendMessage(chatId, `Error: ${msg}`).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
