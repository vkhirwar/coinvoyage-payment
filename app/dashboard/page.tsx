"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebhookConfig = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebhookEvent = any;

type DashTab = "orders" | "webhooks" | "events" | "settings";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: "#1a1708", text: "#f59e0b", border: "#4a3f11" },
  AWAITING_PAYMENT: { bg: "#081a2e", text: "#3b82f6", border: "#113366" },
  OPTIMISTIC_CONFIRMED: { bg: "#081a08", text: "#22c55e", border: "#113311" },
  AWAITING_CONFIRMATION: { bg: "#140a20", text: "#8b5cf6", border: "#2d1a4e" },
  EXECUTING_ORDER: { bg: "#140a20", text: "#8b5cf6", border: "#2d1a4e" },
  COMPLETED: { bg: "#081a08", text: "#22c55e", border: "#113311" },
  FAILED: { bg: "#1a0808", text: "#ef4444", border: "#441111" },
  EXPIRED: { bg: "#111111", text: "#6b7280", border: "#333333" },
  REFUNDED: { bg: "#1a1708", text: "#f59e0b", border: "#4a3f11" },
};

const WEBHOOK_EVENT_TYPES = [
  "ORDER_CREATED",
  "ORDER_AWAITING_PAYMENT",
  "ORDER_CONFIRMING",
  "ORDER_EXECUTING",
  "ORDER_COMPLETED",
  "ORDER_ERROR",
  "ORDER_REFUNDED",
];

async function apiCall(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  return (
    <span
      className="text-xs font-medium px-2 py-1 inline-block"
      style={{
        color: colors.text,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {status}
    </span>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

function truncate(str: string, len = 16) {
  if (!str) return "—";
  if (str.length <= len) return str;
  return str.slice(0, len / 2) + "..." + str.slice(-len / 2);
}

export default function DashboardPage() {
  // Auth
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [activeTab, setActiveTab] = useState<DashTab>("orders");

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPagination, setOrdersPagination] = useState({
    total_count: 0,
    limit: 20,
    offset: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);

  // Events
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsEvents, setWsEvents] = useState<WebhookEvent[]>([]);

  // Stats
  const [feeBalance, setFeeBalance] = useState<{ fiat: string; amount_cents: number } | null>(null);

  // Load keys from localStorage
  useEffect(() => {
    const storedApiKey = localStorage.getItem("cv_api_key") || "";
    const storedSecretKey = localStorage.getItem("cv_secret_key") || "";
    setApiKey(storedApiKey);
    setSecretKey(storedSecretKey);
  }, []);

  const isAuthenticated = !!apiKey && !!secretKey;

  // Fetch orders
  const fetchOrders = useCallback(
    async (offset = 0) => {
      if (!apiKey) return;
      setOrdersLoading(true);
      const data = await apiCall("/api/sale", {
        action: "list",
        apiKey,
        secretKey,
        limit: 20,
        offset,
      });
      if (data.data) {
        setOrders(data.data);
        setOrdersPagination(data.pagination || { total_count: data.data.length, limit: 20, offset });
      }
      setOrdersLoading(false);
    },
    [apiKey, secretKey]
  );

  // Fetch webhooks
  const fetchWebhooks = useCallback(async () => {
    if (!apiKey) return;
    setWebhooksLoading(true);
    const data = await apiCall("/api/webhooks", {
      action: "list",
      apiKey,
      secretKey,
    });
    if (Array.isArray(data)) {
      setWebhooks(data);
    }
    setWebhooksLoading(false);
  }, [apiKey, secretKey]);

  // Fetch webhook events
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    const data = await apiCall("/api/webhooks", {
      action: "get-events",
      apiKey,
      secretKey,
    });
    if (data.events) {
      setEvents(data.events);
    }
    setEventsLoading(false);
  }, [apiKey, secretKey]);

  // Fetch fee balance
  const fetchFeeBalance = useCallback(async () => {
    if (!apiKey) return;
    const data = await apiCall("/api/webhooks", {
      action: "fee-balance",
      apiKey,
      secretKey,
    });
    if (data.fiat !== undefined) {
      setFeeBalance(data);
    }
  }, [apiKey, secretKey]);

  // Initial data load
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchFeeBalance();
    }
  }, [isAuthenticated, fetchOrders, fetchFeeBalance]);

  // Load tab-specific data
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === "webhooks") fetchWebhooks();
    if (activeTab === "events") fetchEvents();
  }, [activeTab, isAuthenticated, fetchWebhooks, fetchEvents]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket("wss://api.coinvoyage.io/v2/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "connect", data: { api_key: apiKey } }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "connected") {
        setWsConnected(true);
        // Subscribe to all org orders
        ws.send(JSON.stringify({ type: "subscribe", data: {} }));
      } else if (msg.type === "event") {
        setWsEvents((prev) => [
          { ...msg.data, received_at: new Date().toISOString(), source: "websocket" },
          ...prev.slice(0, 99),
        ]);
        // Refresh orders when we get an event
        fetchOrders();
      } else if (msg.type === "error") {
        console.error("WebSocket error:", msg.data);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };
  }, [apiKey, fetchOrders]);

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Webhook CRUD
  const createWebhook = async () => {
    if (!newWebhookUrl) return;
    await apiCall("/api/webhooks", {
      action: "create",
      apiKey,
      secretKey,
      url: newWebhookUrl,
      subscription_events: newWebhookEvents.length > 0 ? newWebhookEvents : undefined,
    });
    setNewWebhookUrl("");
    setNewWebhookEvents([]);
    fetchWebhooks();
  };

  const toggleWebhook = async (webhook: WebhookConfig) => {
    await apiCall("/api/webhooks", {
      action: "update",
      apiKey,
      secretKey,
      webhook_id: webhook.id,
      active: !webhook.active,
    });
    fetchWebhooks();
  };

  const deleteWebhook = async (webhookId: string) => {
    await apiCall("/api/webhooks", {
      action: "delete",
      apiKey,
      secretKey,
      webhook_id: webhookId,
    });
    fetchWebhooks();
  };

  // Compute stats from orders
  const stats = {
    total: ordersPagination.total_count || orders.length,
    completed: orders.filter((o: Order) => o.status === "COMPLETED").length,
    pending: orders.filter((o: Order) =>
      ["PENDING", "AWAITING_PAYMENT", "AWAITING_CONFIRMATION", "EXECUTING_ORDER"].includes(o.status)
    ).length,
    failed: orders.filter((o: Order) => ["FAILED", "EXPIRED"].includes(o.status)).length,
    totalVolume: orders.reduce((sum: number, o: Order) => {
      const usd = o.fulfillment?.amount?.value_usd || 0;
      return sum + usd;
    }, 0),
  };

  const tabButton = (tab: DashTab, label: string, badge?: number) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-5 py-3 text-sm font-medium uppercase tracking-wider transition-all flex items-center gap-2 ${
        activeTab === tab
          ? "bg-[#0a0a0a] text-white border border-[#331111] border-b-[#0a0a0a]"
          : "bg-transparent text-[#9ca3af] border border-transparent hover:text-[#ff6666]"
      }`}
      style={
        activeTab === tab
          ? { boxShadow: "0 -4px 15px rgba(255, 0, 51, 0.15), inset 0 1px 0 rgba(255, 51, 51, 0.3)" }
          : {}
      }
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] bg-[#ff0033] text-white px-1.5 py-0.5 font-bold min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  );

  const cardStyle = {
    boxShadow: "0 0 30px rgba(255, 0, 51, 0.15), inset 0 0 1px rgba(255, 51, 51, 0.3)",
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen p-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#ff6666] transition-colors">
              Back to Checkout
            </Link>
          </div>
          <div className="bg-[#0a0a0a] border border-[#331111] p-10 text-center" style={cardStyle}>
            <p className="text-[#9ca3af] mb-4">
              Authenticate first to access the dashboard.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 text-sm font-medium uppercase tracking-wider"
              style={{
                background: "linear-gradient(180deg, #ff0033 0%, #aa0000 100%)",
                border: "1px solid #ff3333",
                color: "#ffffff",
                boxShadow: "0 0 25px rgba(255, 0, 51, 0.5)",
              }}
            >
              Go to Authenticate
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-10">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4">
            {/* WebSocket status */}
            <button
              onClick={wsConnected ? disconnectWebSocket : connectWebSocket}
              className="flex items-center gap-2 text-xs uppercase tracking-wider px-3 py-2 border transition-all"
              style={{
                borderColor: wsConnected ? "#113311" : "#331111",
                color: wsConnected ? "#22c55e" : "#9ca3af",
                background: wsConnected ? "#080f08" : "transparent",
              }}
            >
              <span
                className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-[#6b7280]"}`}
              />
              {wsConnected ? "Live" : "Connect Live"}
            </button>
            <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#ff6666] transition-colors">
              Checkout
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total Orders", value: stats.total, color: "#ffffff" },
            { label: "Completed", value: stats.completed, color: "#22c55e" },
            { label: "In Progress", value: stats.pending, color: "#3b82f6" },
            { label: "Failed", value: stats.failed, color: "#ef4444" },
            {
              label: "Volume (USD)",
              value: `$${stats.totalVolume.toFixed(2)}`,
              color: "#f59e0b",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#0a0a0a] border border-[#331111] p-4"
              style={cardStyle}
            >
              <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div className="text-2xl font-semibold" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Fee balance */}
        {feeBalance && (
          <div className="bg-[#0a0a0a] border border-[#331111] p-4 mb-6 flex items-center justify-between" style={cardStyle}>
            <div className="text-sm text-[#9ca3af]">Claimable Fee Balance</div>
            <div className="text-lg font-semibold text-[#f59e0b]">
              ${((feeBalance.amount_cents || 0) / 100).toFixed(2)} {feeBalance.fiat || "USD"}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 mb-0">
          {tabButton("orders", "Orders")}
          {tabButton("webhooks", "Webhooks", webhooks.length)}
          {tabButton("events", "Events", wsEvents.length + events.length)}
          {tabButton("settings", "Settings")}
        </div>

        {/* Tab Content */}
        <div className="bg-[#0a0a0a] border border-[#331111] p-6" style={cardStyle}>
          {/* ============ ORDERS TAB ============ */}
          {activeTab === "orders" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Pay Orders</h2>
                <button
                  onClick={() => fetchOrders(ordersPagination.offset)}
                  className="text-xs text-[#9ca3af] hover:text-white uppercase tracking-wider px-3 py-2 border border-[#331111] transition-all"
                >
                  {ordersLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {selectedOrder ? (
                // Order Detail View
                <div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-sm text-[#ff0033] hover:text-[#ff3333] mb-4 flex items-center gap-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back to orders
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Order info */}
                    <div className="space-y-4">
                      <div className="border border-[#331111] bg-[#0f0808] p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#9ca3af]">Order ID</span>
                          <code className="text-xs font-mono text-[#ff6666]">{selectedOrder.id}</code>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#9ca3af]">Mode</span>
                          <span className="text-sm">{selectedOrder.mode}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#9ca3af]">Status</span>
                          <StatusBadge status={selectedOrder.status} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#9ca3af]">Created</span>
                          <span className="text-xs">{formatDate(selectedOrder.created_at)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#9ca3af]">Updated</span>
                          <span className="text-xs">{formatDate(selectedOrder.updated_at)}</span>
                        </div>
                      </div>

                      {/* Fulfillment */}
                      {selectedOrder.fulfillment && (
                        <div className="border border-[#331111] bg-[#0f0808] p-4 space-y-3">
                          <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2">Fulfillment</div>
                          {selectedOrder.fulfillment.asset && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-[#9ca3af]">Asset</span>
                              <span className="text-sm">
                                {selectedOrder.fulfillment.asset.ticker || selectedOrder.fulfillment.asset.name} (Chain {selectedOrder.fulfillment.asset.chain_id})
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[#9ca3af]">Amount</span>
                            <span className="text-sm font-mono">
                              {selectedOrder.fulfillment.amount?.ui_amount_display || selectedOrder.fulfillment.amount?.ui_amount || "—"}
                            </span>
                          </div>
                          {selectedOrder.fulfillment.amount?.value_usd && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-[#9ca3af]">Value (USD)</span>
                              <span className="text-sm">${parseFloat(selectedOrder.fulfillment.amount.value_usd).toFixed(2)}</span>
                            </div>
                          )}
                          {selectedOrder.fulfillment.fiat && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-[#9ca3af]">Fiat</span>
                              <span className="text-sm">{selectedOrder.fulfillment.fiat}</span>
                            </div>
                          )}
                          {selectedOrder.fulfillment.receiving_address && (
                            <div className="flex justify-between items-start">
                              <span className="text-xs text-[#9ca3af]">Receiving</span>
                              <code className="text-xs font-mono text-[#9ca3af] max-w-[250px] break-all text-right">
                                {selectedOrder.fulfillment.receiving_address}
                              </code>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TX Hashes */}
                      {(selectedOrder.deposit_tx_hash || selectedOrder.receiving_tx_hash || selectedOrder.refund_tx_hash) && (
                        <div className="border border-[#331111] bg-[#0f0808] p-4 space-y-3">
                          <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2">Transactions</div>
                          {selectedOrder.deposit_tx_hash && (
                            <div className="flex justify-between items-start">
                              <span className="text-xs text-[#9ca3af]">Deposit TX</span>
                              <code className="text-xs font-mono text-[#ff6666] max-w-[250px] break-all text-right">
                                {selectedOrder.deposit_tx_hash}
                              </code>
                            </div>
                          )}
                          {selectedOrder.receiving_tx_hash && (
                            <div className="flex justify-between items-start">
                              <span className="text-xs text-[#9ca3af]">Receiving TX</span>
                              <code className="text-xs font-mono text-[#22c55e] max-w-[250px] break-all text-right">
                                {selectedOrder.receiving_tx_hash}
                              </code>
                            </div>
                          )}
                          {selectedOrder.refund_tx_hash && (
                            <div className="flex justify-between items-start">
                              <span className="text-xs text-[#9ca3af]">Refund TX</span>
                              <code className="text-xs font-mono text-[#f59e0b] max-w-[250px] break-all text-right">
                                {selectedOrder.refund_tx_hash}
                              </code>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Payment data */}
                    <div className="space-y-4">
                      {selectedOrder.payment && (
                        <>
                          <div className="border border-[#331111] bg-[#0f0808] p-4 space-y-3">
                            <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2">Payment Source</div>
                            {selectedOrder.payment.src && (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  {selectedOrder.payment.src.image_uri && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedOrder.payment.src.image_uri} alt="" className="w-5 h-5 rounded-full" />
                                  )}
                                  <span className="text-sm font-medium">{selectedOrder.payment.src.name || selectedOrder.payment.src.ticker}</span>
                                  <span className="text-xs text-[#9ca3af]">Chain {selectedOrder.payment.src.chain_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-[#9ca3af]">Total</span>
                                  <span className="text-sm font-mono">{selectedOrder.payment.src.total?.ui_amount_display || "—"}</span>
                                </div>
                                {selectedOrder.payment.src.fees && (
                                  <div className="flex justify-between">
                                    <span className="text-xs text-[#9ca3af]">Fees</span>
                                    <span className="text-xs font-mono">{selectedOrder.payment.src.fees.total_fee?.ui_amount_display || "—"}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <div className="border border-[#331111] bg-[#0f0808] p-4 space-y-3">
                            <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2">Payment Destination</div>
                            {selectedOrder.payment.dst && (
                              <div className="flex items-center gap-2">
                                {selectedOrder.payment.dst.image_uri && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={selectedOrder.payment.dst.image_uri} alt="" className="w-5 h-5 rounded-full" />
                                )}
                                <span className="text-sm">{selectedOrder.payment.dst.name || selectedOrder.payment.dst.ticker}</span>
                                <span className="text-xs font-mono">{selectedOrder.payment.dst.currency_amount?.ui_amount_display || "—"}</span>
                              </div>
                            )}
                            {selectedOrder.payment.deposit_address && (
                              <div>
                                <div className="text-xs text-[#9ca3af] mb-1">Deposit Address</div>
                                <code className="text-xs font-mono text-[#ff6666] break-all">{selectedOrder.payment.deposit_address}</code>
                              </div>
                            )}
                            {selectedOrder.payment.receiving_address && (
                              <div>
                                <div className="text-xs text-[#9ca3af] mb-1">Receiving Address</div>
                                <code className="text-xs font-mono text-[#9ca3af] break-all">{selectedOrder.payment.receiving_address}</code>
                              </div>
                            )}
                            {selectedOrder.payment.expires_at && (
                              <div className="flex justify-between">
                                <span className="text-xs text-[#9ca3af]">Expires</span>
                                <span className="text-xs">{formatDate(selectedOrder.payment.expires_at)}</span>
                              </div>
                            )}
                          </div>

                          {/* Execution steps */}
                          {selectedOrder.payment.execution && selectedOrder.payment.execution.length > 0 && (
                            <div className="border border-[#331111] bg-[#0f0808] p-4 space-y-3">
                              <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2">Execution Steps</div>
                              {selectedOrder.payment.execution.map((step: Order, idx: number) => (
                                <div key={idx} className="border border-[#221111] bg-[#080404] p-3 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium">{step.provider}</span>
                                    <StatusBadge status={step.status?.toUpperCase() || "UNKNOWN"} />
                                  </div>
                                  {step.source_currency && (
                                    <div className="text-xs text-[#9ca3af]">
                                      {step.source_currency.ticker} → {step.destination_currency?.ticker}
                                    </div>
                                  )}
                                  {step.source_tx_hash && (
                                    <div className="text-xs font-mono text-[#6b7280]">TX: {truncate(step.source_tx_hash, 24)}</div>
                                  )}
                                  {step.error && (
                                    <div className="text-xs text-[#ef4444]">{step.error}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Metadata */}
                      {selectedOrder.metadata?.items && selectedOrder.metadata.items.length > 0 && (
                        <div className="border border-[#331111] bg-[#0f0808] p-4 space-y-3">
                          <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2">Order Items</div>
                          {selectedOrder.metadata.items.map((item: Order, idx: number) => (
                            <div key={idx} className="flex items-center gap-3">
                              {item.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.image} alt="" className="w-8 h-8 object-cover border border-[#331111]" />
                              )}
                              <div className="flex-1">
                                <div className="text-sm">{item.name}</div>
                                {item.quantity && <div className="text-xs text-[#9ca3af]">x{item.quantity}</div>}
                              </div>
                              {item.unit_price && (
                                <div className="text-sm font-mono">${item.unit_price} {item.currency || ""}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Orders List View
                <div>
                  {ordersLoading && orders.length === 0 ? (
                    <div className="text-center py-10 text-[#9ca3af]">Loading orders...</div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-10 text-[#9ca3af]">No orders found</div>
                  ) : (
                    <>
                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#331111]">
                              <th className="text-left text-xs text-[#9ca3af] uppercase tracking-wider py-3 px-2">Order ID</th>
                              <th className="text-left text-xs text-[#9ca3af] uppercase tracking-wider py-3 px-2">Mode</th>
                              <th className="text-left text-xs text-[#9ca3af] uppercase tracking-wider py-3 px-2">Status</th>
                              <th className="text-left text-xs text-[#9ca3af] uppercase tracking-wider py-3 px-2">Amount</th>
                              <th className="text-left text-xs text-[#9ca3af] uppercase tracking-wider py-3 px-2">Asset</th>
                              <th className="text-left text-xs text-[#9ca3af] uppercase tracking-wider py-3 px-2">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order: Order) => (
                              <tr
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                className="border-b border-[#1a0a0a] hover:bg-[#0f0808] cursor-pointer transition-colors"
                              >
                                <td className="py-3 px-2">
                                  <code className="text-xs font-mono text-[#ff6666]">{truncate(order.id, 20)}</code>
                                </td>
                                <td className="py-3 px-2 text-xs">{order.mode}</td>
                                <td className="py-3 px-2"><StatusBadge status={order.status} /></td>
                                <td className="py-3 px-2 text-sm font-mono">
                                  {order.fulfillment?.amount?.ui_amount_display ||
                                    order.fulfillment?.amount?.ui_amount ||
                                    order.fulfillment?.fiat ||
                                    "—"}
                                </td>
                                <td className="py-3 px-2">
                                  {order.fulfillment?.asset ? (
                                    <div className="flex items-center gap-1">
                                      {order.fulfillment.asset.image_uri && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={order.fulfillment.asset.image_uri} alt="" className="w-4 h-4 rounded-full" />
                                      )}
                                      <span className="text-xs">{order.fulfillment.asset.ticker || order.fulfillment.asset.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[#6b7280]">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-xs text-[#9ca3af]">{formatDate(order.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#331111]">
                        <div className="text-xs text-[#9ca3af]">
                          Showing {ordersPagination.offset + 1}–{Math.min(ordersPagination.offset + ordersPagination.limit, ordersPagination.total_count)} of {ordersPagination.total_count}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fetchOrders(Math.max(0, ordersPagination.offset - ordersPagination.limit))}
                            disabled={ordersPagination.offset === 0}
                            className="text-xs px-3 py-1 border border-[#331111] text-[#9ca3af] hover:text-white disabled:opacity-30 transition-colors"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => fetchOrders(ordersPagination.offset + ordersPagination.limit)}
                            disabled={ordersPagination.offset + ordersPagination.limit >= ordersPagination.total_count}
                            className="text-xs px-3 py-1 border border-[#331111] text-[#9ca3af] hover:text-white disabled:opacity-30 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============ WEBHOOKS TAB ============ */}
          {activeTab === "webhooks" && (
            <div>
              <h2 className="text-lg font-medium mb-4">Webhook Configuration</h2>

              {/* Create webhook */}
              <div className="border border-[#331111] bg-[#0f0808] p-4 mb-6">
                <div className="text-sm font-medium mb-3">Add Webhook</div>
                <div className="mb-3">
                  <label className="block text-xs text-[#9ca3af] mb-1">Endpoint URL</label>
                  <input
                    type="url"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://your-domain.com/api/webhooks"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-[#9ca3af] mb-2">Events (leave empty for all)</label>
                  <div className="flex flex-wrap gap-2">
                    {WEBHOOK_EVENT_TYPES.map((evt) => (
                      <button
                        key={evt}
                        onClick={() =>
                          setNewWebhookEvents((prev) =>
                            prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
                          )
                        }
                        className={`text-xs px-2 py-1 border transition-all ${
                          newWebhookEvents.includes(evt)
                            ? "border-[#ff0033] text-[#ff0033] bg-[#1a0008]"
                            : "border-[#331111] text-[#9ca3af] hover:text-white"
                        }`}
                      >
                        {evt}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={createWebhook}
                  disabled={!newWebhookUrl}
                  className="text-xs uppercase tracking-wider px-4 py-2 font-medium transition-all"
                  style={{
                    background: newWebhookUrl ? "linear-gradient(180deg, #ff0033, #aa0000)" : "#440011",
                    border: `1px solid ${newWebhookUrl ? "#ff3333" : "#441111"}`,
                    color: newWebhookUrl ? "#fff" : "#ff6666",
                    cursor: newWebhookUrl ? "pointer" : "not-allowed",
                    opacity: newWebhookUrl ? 1 : 0.7,
                  }}
                >
                  Create Webhook
                </button>
              </div>

              {/* Existing webhooks */}
              <div className="text-sm font-medium mb-3">
                Active Webhooks {webhooksLoading && <span className="text-[#9ca3af]">(loading...)</span>}
              </div>
              {webhooks.length === 0 ? (
                <div className="text-sm text-[#9ca3af] py-4">No webhooks configured</div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((wh: WebhookConfig) => (
                    <div key={wh.id} className="border border-[#331111] bg-[#0f0808] p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <code className="text-sm font-mono text-[#ff6666]">{wh.url}</code>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`w-2 h-2 rounded-full ${wh.active ? "bg-green-500" : "bg-[#6b7280]"}`}
                            />
                            <span className="text-xs text-[#9ca3af]">{wh.active ? "Active" : "Inactive"}</span>
                            <span className="text-xs text-[#6b7280]">ID: {truncate(wh.id, 20)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleWebhook(wh)}
                            className="text-xs px-2 py-1 border border-[#331111] text-[#9ca3af] hover:text-white transition-colors"
                          >
                            {wh.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => deleteWebhook(wh.id)}
                            className="text-xs px-2 py-1 border border-[#441111] text-[#ef4444] hover:bg-[#1a0808] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {wh.subscription_events && wh.subscription_events.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {wh.subscription_events.map((evt: string) => (
                            <span key={evt} className="text-[10px] px-1.5 py-0.5 border border-[#331111] text-[#9ca3af]">
                              {evt}
                            </span>
                          ))}
                        </div>
                      )}
                      {wh.webhook_secret && (
                        <div className="mt-2">
                          <span className="text-xs text-[#6b7280]">Secret: </span>
                          <code className="text-xs font-mono text-[#9ca3af]">{truncate(wh.webhook_secret, 24)}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ EVENTS TAB ============ */}
          {activeTab === "events" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Event Log</h2>
                <div className="flex gap-2">
                  <button
                    onClick={fetchEvents}
                    className="text-xs px-3 py-1 border border-[#331111] text-[#9ca3af] hover:text-white transition-colors"
                  >
                    {eventsLoading ? "Loading..." : "Refresh"}
                  </button>
                  <button
                    onClick={async () => {
                      await apiCall("/api/webhooks", {
                        action: "clear-events",
                        apiKey,
                        secretKey,
                      });
                      setEvents([]);
                      setWsEvents([]);
                    }}
                    className="text-xs px-3 py-1 border border-[#441111] text-[#ef4444] hover:bg-[#1a0808] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* WebSocket events */}
              {wsEvents.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Live Events (WebSocket)
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {wsEvents.map((evt: WebhookEvent, idx: number) => (
                      <div key={idx} className="border border-[#113311] bg-[#080f08] p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-green-400">
                            {evt.type || evt.status || "EVENT"}
                          </span>
                          <span className="text-[10px] text-[#6b7280]">{formatDate(evt.received_at)}</span>
                        </div>
                        <pre className="text-xs text-[#9ca3af] overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(evt, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Webhook events */}
              <div className="text-xs text-[#9ca3af] uppercase tracking-wider mb-2">
                Webhook Events ({events.length})
              </div>
              {events.length === 0 ? (
                <div className="text-sm text-[#9ca3af] py-4">
                  No webhook events received yet. Configure a webhook pointing to{" "}
                  <code className="text-[#ff6666]">{typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks</code>{" "}
                  to start receiving events.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {events.map((evt: WebhookEvent, idx: number) => (
                    <div key={idx} className="border border-[#331111] bg-[#0f0808] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#ff6666]">
                          {evt.type || evt.event || "WEBHOOK"}
                        </span>
                        <span className="text-[10px] text-[#6b7280]">{formatDate(evt.received_at)}</span>
                      </div>
                      <pre className="text-xs text-[#9ca3af] overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(evt, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ SETTINGS TAB ============ */}
          {activeTab === "settings" && (
            <div className="max-w-[500px]">
              <h2 className="text-lg font-medium mb-4">API Configuration</h2>

              <div className="border border-[#331111] bg-[#0f0808] p-4 space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#9ca3af]">API Key</span>
                  <code className="text-xs font-mono text-[#ff6666]">{truncate(apiKey, 24)}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#9ca3af]">Secret Key</span>
                  <code className="text-xs font-mono text-[#9ca3af]">{"*".repeat(20)}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#9ca3af]">Status</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                </div>
              </div>

              <div className="border border-[#331111] bg-[#0f0808] p-4 mb-6">
                <div className="text-sm font-medium mb-2">Webhook Receiver URL</div>
                <p className="text-xs text-[#9ca3af] mb-3">
                  Set this URL in your CoinVoyage webhook configuration to receive events:
                </p>
                <div className="bg-[#080404] border border-[#331111] p-3">
                  <code className="text-xs font-mono text-[#ff6666] break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks
                  </code>
                </div>
                <p className="text-xs text-[#6b7280] mt-2">
                  Note: For local development, use a tunnel service (ngrok, cloudflare tunnel) to expose this endpoint.
                </p>
              </div>

              <div className="border border-[#331111] bg-[#0f0808] p-4">
                <div className="text-sm font-medium mb-2">WebSocket</div>
                <p className="text-xs text-[#9ca3af] mb-3">
                  Connect to the CoinVoyage WebSocket for real-time order updates.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={wsConnected ? disconnectWebSocket : connectWebSocket}
                    className="text-xs uppercase tracking-wider px-4 py-2 font-medium border transition-all"
                    style={{
                      background: wsConnected ? "transparent" : "linear-gradient(180deg, #ff0033, #aa0000)",
                      borderColor: wsConnected ? "#441111" : "#ff3333",
                      color: wsConnected ? "#ef4444" : "#fff",
                    }}
                  >
                    {wsConnected ? "Disconnect" : "Connect"}
                  </button>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-[#6b7280]"}`} />
                    <span className={`text-xs ${wsConnected ? "text-green-400" : "text-[#9ca3af]"}`}>
                      {wsConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
