import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.coinvoyage.io/v2";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || `Upstream error (${res.status})` };
  }
}

// POST /api/swap — proxy swap quote and data actions
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, apiKey, ...params } = body;

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  try {
    switch (action) {
      case "quote": {
        const payload = JSON.stringify({
          intent: params.intent,
          metadata: params.metadata || undefined,
        });

        console.log("[swap/quote] request:", payload);

        const res = await fetch(`${API_BASE}/swap/quote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
          },
          body: payload,
        });

        const data = await safeJson(res);
        if (!res.ok) console.error("[swap/quote] upstream error:", res.status, data);
        return NextResponse.json(data, { status: res.ok ? 200 : res.status });
      }

      case "data": {
        const payload = JSON.stringify({
          intent: params.intent,
          receiving_address: params.receiving_address,
        });

        console.log("[swap/data] request:", payload);

        const res = await fetch(`${API_BASE}/swap/data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
          },
          body: payload,
        });

        const data = await safeJson(res);
        if (!res.ok) console.error("[swap/data] upstream error:", res.status, data);
        return NextResponse.json(data, { status: res.ok ? 200 : res.status });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Swap API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to call CoinVoyage API" },
      { status: 500 }
    );
  }
}
