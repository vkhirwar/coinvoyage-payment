import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/coinvoyage";
import { sendMessage, escapeHtml as h, type InlineKeyboardButton } from "@/lib/telegram";
import { getStore } from "@/lib/telegram-store";
import { log } from "@/lib/log";

interface CvWebhookEvent {
  id?: string;
  type?: string;
  status?: string;
  payorder_id?: string;
  metadata?: Record<string, string>;
  payment_data?: Record<string, unknown>;
}

const STATUS_LABELS: Record<string, string> = {
  payorder_created: "📝 Order created",
  payorder_started: "⏳ Awaiting payment",
  payorder_confirming: "🔄 Confirming on-chain",
  payorder_executing: "⚙️ Executing",
  payorder_completed: "✅ Completed",
  payorder_error: "❌ Error",
  payorder_refunded: "↩️ Refunded",
  payorder_expired: "⌛ Expired",
};

const DEDUP_TTL = 24 * 3600;
const LASTORDER_TTL = 30 * 24 * 3600;
const TERMINAL_TYPES = new Set(["payorder_completed", "payorder_error", "payorder_refunded", "payorder_expired"]);

function appUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  return url ? url.replace(/\/$/, "") : null;
}

function orderKb(orderId: string): InlineKeyboardButton[][] {
  const url = appUrl();
  const row: InlineKeyboardButton[] = [{ text: "Refresh", callback_data: `refresh:${orderId}` }];
  if (url) row.push({ text: "Open Mini App", web_app: { url: `${url}/swap` } });
  return [row];
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("coinvoyage-webhook-signature");

  if (!verifyWebhookSignature(raw, sig)) {
    log("warn", "telegram/order-webhook", "invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: CvWebhookEvent;
  try { event = JSON.parse(raw) as CvWebhookEvent; }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const store = getStore();

  if (event.id) {
    const dedupKey = `tg:event:${event.id}`;
    const seen = await store.get(dedupKey);
    if (seen) {
      log("info", "telegram/order-webhook", "duplicate event ignored", { eventId: event.id });
      return NextResponse.json({ ok: true, deduped: true });
    }
    await store.set(dedupKey, 1, DEDUP_TTL);
  }

  const chatId = event.metadata?.tg_chat_id;
  const userId = event.metadata?.tg_user_id;
  const orderId = event.payorder_id;

  if (userId && orderId && !TERMINAL_TYPES.has(event.type ?? "")) {
    await store.set(`tg:lastorder:${userId}`, orderId, LASTORDER_TTL);
  }

  if (!chatId) {
    log("info", "telegram/order-webhook", "no tg_chat_id", { eventId: event.id, type: event.type });
    return NextResponse.json({ ok: true, skipped: "no tg_chat_id" });
  }

  const label = STATUS_LABELS[event.type ?? ""] ?? event.type ?? "Update";
  const lines = [`${label} — <code>${h(orderId ?? "?")}</code>`];
  if (event.status) lines.push(`Status: <code>${h(event.status)}</code>`);

  try {
    await sendMessage(chatId, lines.join("\n"), {
      parse_mode: "HTML",
      reply_markup: orderId ? { inline_keyboard: orderKb(orderId) } : undefined,
    });
  } catch (err) {
    log("error", "telegram/order-webhook", "sendMessage failed", { err: String(err), chatId, orderId });
  }

  return NextResponse.json({ ok: true });
}
