import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const API_BASE = "https://api.coinvoyage.io/v2";

// In-memory store for webhook events (persists across requests, resets on server restart)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const webhookEvents: any[] = [];
const MAX_EVENTS = 500;

function generateSignature(
  apiKey: string,
  secretKey: string,
  body: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");
  return `APIKey=${apiKey},signature=${signature},timestamp=${timestamp}`;
}

// POST /api/webhooks — receives webhook events from CoinVoyage OR manages webhooks
export async function POST(req: NextRequest) {
  const body = await req.json();

  // If this has an "action" field, it's a management request from our frontend
  if (body.action) {
    const { action, apiKey, secretKey, ...params } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    try {
      switch (action) {
        case "list": {
          const authSig = generateSignature(apiKey, secretKey, "");
          const res = await fetch(`${API_BASE}/webhooks`, {
            method: "GET",
            headers: {
              "Authorization-Signature": authSig,
            },
          });
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }

        case "create": {
          const reqBody = JSON.stringify({
            url: params.url,
            subscription_events: params.subscription_events || undefined,
          });
          const authSig = generateSignature(apiKey, secretKey, reqBody);
          const res = await fetch(`${API_BASE}/webhooks`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization-Signature": authSig,
            },
            body: reqBody,
          });
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }

        case "update": {
          const reqBody = JSON.stringify({
            url: params.url || undefined,
            subscription_events: params.subscription_events || undefined,
            active: params.active ?? undefined,
          });
          const authSig = generateSignature(apiKey, secretKey, reqBody);
          const res = await fetch(
            `${API_BASE}/webhooks/${params.webhook_id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization-Signature": authSig,
              },
              body: reqBody,
            }
          );
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }

        case "delete": {
          const authSig = generateSignature(apiKey, secretKey, "");
          const res = await fetch(
            `${API_BASE}/webhooks/${params.webhook_id}`,
            {
              method: "DELETE",
              headers: {
                "Authorization-Signature": authSig,
              },
            }
          );
          if (res.status === 204) {
            return NextResponse.json({ success: true }, { status: 200 });
          }
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }

        case "get-events": {
          return NextResponse.json({ events: webhookEvents });
        }

        case "clear-events": {
          webhookEvents.length = 0;
          return NextResponse.json({ success: true });
        }

        case "fee-balance": {
          const authSig = generateSignature(apiKey, secretKey, "");
          const res = await fetch(`${API_BASE}/fees/balance`, {
            method: "GET",
            headers: {
              "Authorization-Signature": authSig,
            },
          });
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }

        default:
          return NextResponse.json(
            { error: `Unknown action: ${action}` },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error("Webhook API error:", error);
      return NextResponse.json(
        { error: "Failed to call CoinVoyage API" },
        { status: 500 }
      );
    }
  }

  // Otherwise, this is an incoming webhook event from CoinVoyage
  const event = {
    ...body,
    received_at: new Date().toISOString(),
  };

  webhookEvents.unshift(event);
  if (webhookEvents.length > MAX_EVENTS) {
    webhookEvents.length = MAX_EVENTS;
  }

  console.log("[Webhook Event]", event.type || "unknown", event);
  return NextResponse.json({ received: true }, { status: 200 });
}
