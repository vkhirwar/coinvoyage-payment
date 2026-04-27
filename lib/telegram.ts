const API_BASE = "https://api.telegram.org";

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface SendMessageOpts {
  parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
  reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
  disable_web_page_preview?: boolean;
}

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

async function call<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`);
  return data.result as T;
}

export function sendMessage(chatId: number | string, text: string, opts: SendMessageOpts = {}) {
  return call<unknown>("sendMessage", { chat_id: chatId, text, ...opts });
}

export function sendPhoto(
  chatId: number | string,
  photoUrl: string,
  caption?: string,
  opts: Omit<SendMessageOpts, "disable_web_page_preview"> = {}
) {
  return call<unknown>("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    ...opts,
  });
}

export function escapeMarkdownV2(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}

export function qrUrl(data: string, size = 400): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
