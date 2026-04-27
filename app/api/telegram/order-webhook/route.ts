import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/coinvoyage";
import { sendMessage } from "@/lib/telegram";

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

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("coinvoyage-webhook-signature");

  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: CvWebhookEvent;
  try {
    event = JSON.parse(raw) as CvWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const chatId = event.metadata?.tg_chat_id;
  if (!chatId) return NextResponse.json({ ok: true, skipped: "no tg_chat_id" });

  const label = STATUS_LABELS[event.type ?? ""] ?? event.type ?? "Update";
  const lines = [`${label} — \`${event.payorder_id ?? "?"}\``];
  if (event.status) lines.push(`Status: \`${event.status}\``);

  try {
    await sendMessage(chatId, lines.join("\n"), { parse_mode: "Markdown" });
  } catch (err) {
    console.error("[telegram/order-webhook] sendMessage failed", err);
  }

  return NextResponse.json({ ok: true });
}
