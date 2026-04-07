import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const API_BASE = "https://api.coinvoyage.io/v2";

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

// POST /api/sale — proxy all sale actions
export async function POST(req: NextRequest) {
  const { action, apiKey, secretKey, ...params } = await req.json();

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  try {
    switch (action) {
      case "create": {
        const body = JSON.stringify({
          mode: "SALE",
          intent: {
            asset: params.asset || undefined,
            amount: params.amount,
            receiving_address: params.receiving_address || undefined,
          },
          metadata: params.metadata || undefined,
        });

        const authSig = generateSignature(apiKey, secretKey, body);

        const res = await fetch(`${API_BASE}/pay-orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
            "Authorization-Signature": authSig,
          },
          body,
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }

      case "quote": {
        const body = JSON.stringify({
          wallet_address: params.wallet_address,
          chain_type: params.chain_type,
          chain_ids: params.chain_ids || undefined,
        });

        const res = await fetch(
          `${API_BASE}/pay-orders/${params.payorder_id}/quote`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": apiKey,
            },
            body,
          }
        );

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }

      case "payment-details": {
        const body = JSON.stringify({
          source_currency: params.source_currency || undefined,
          refund_address: params.refund_address || undefined,
          quote_id: params.quote_id || undefined,
        });

        const res = await fetch(
          `${API_BASE}/pay-orders/${params.payorder_id}/payment-details`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": apiKey,
            },
            body,
          }
        );

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }

      case "status": {
        const res = await fetch(
          `${API_BASE}/pay-orders/${params.payorder_id}`,
          {
            method: "GET",
            headers: {
              "X-API-KEY": apiKey,
            },
          }
        );

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }

      case "list": {
        const qs = new URLSearchParams({
          limit: String(params.limit || 20),
          offset: String(params.offset || 0),
        });

        const res = await fetch(`${API_BASE}/pay-orders?${qs}`, {
          method: "GET",
          headers: {
            "X-API-KEY": apiKey,
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
    console.error("Sale API error:", error);
    return NextResponse.json(
      { error: "Failed to call CoinVoyage API" },
      { status: 500 }
    );
  }
}
