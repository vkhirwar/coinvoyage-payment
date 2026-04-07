"use client";

import { PayButton } from "@coin-voyage/paykit";
import { ChainId } from "@coin-voyage/paykit/server";
import { useState, useEffect, useRef, useCallback } from "react";
import { useWalletReady, useApiKeys } from "./providers";

type Tab = "checkout" | "sale" | "authenticate";

type SaleStep = "configure" | "quotes" | "payment" | "tracking";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SaleOrder = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Quote = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentDetails = any;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  AWAITING_PAYMENT: "#3b82f6",
  OPTIMISTIC_CONFIRMED: "#22c55e",
  AWAITING_CONFIRMATION: "#8b5cf6",
  EXECUTING_ORDER: "#8b5cf6",
  COMPLETED: "#22c55e",
  FAILED: "#ef4444",
  EXPIRED: "#6b7280",
  REFUNDED: "#f59e0b",
};

async function saleApi(body: Record<string, unknown>) {
  const res = await fetch("/api/sale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function PaymentPage() {
  const [quantity, setQuantity] = useState(1);
  const [cartVisible, setCartVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("checkout");
  const walletReady = useWalletReady();
  const { apiKey, secretKey, setApiKey, setSecretKey, isAuthenticated } =
    useApiKeys();

  // Auth tab state
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [secretKeyInput, setSecretKeyInput] = useState(secretKey);
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sale flow state
  const [saleStep, setSaleStep] = useState<SaleStep>("configure");
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [saleOrder, setSaleOrder] = useState<SaleOrder>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(null);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sale config form
  const [saleAmount, setSaleAmount] = useState("5.00");
  const [saleFiatUnit, setSaleFiatUnit] = useState("USD");
  const [saleChainId, setSaleChainId] = useState("8453"); // Base
  const [saleWalletAddress, setSaleWalletAddress] = useState("");
  const [saleChainType, setSaleChainType] = useState("EVM");

  const basePrice = 4.0;
  const shipping = 1.0;
  const taxRate = 0.05;

  const subtotal = basePrice * quantity;
  const taxes = subtotal * taxRate;
  const total = cartVisible ? subtotal + shipping + taxes : shipping;

  const handleSaveKeys = () => {
    setApiKey(apiKeyInput);
    setSecretKey(secretKeyInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearKeys = () => {
    setApiKeyInput("");
    setSecretKeyInput("");
    setApiKey("");
    setSecretKey("");
  };

  // Sync auth input fields when context values change
  useEffect(() => {
    setApiKeyInput(apiKey);
    setSecretKeyInput(secretKey);
  }, [apiKey, secretKey]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const pollStatus = useCallback(
    (orderId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        const data = await saleApi({
          action: "status",
          apiKey,
          secretKey,
          payorder_id: orderId,
        });
        if (data.status) {
          setSaleOrder((prev: SaleOrder) => ({ ...prev, ...data }));
          if (
            ["COMPLETED", "FAILED", "EXPIRED", "REFUNDED"].includes(
              data.status
            )
          ) {
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      }, 5000);
    },
    [apiKey, secretKey]
  );

  const handleCreateSaleOrder = async () => {
    setSaleLoading(true);
    setSaleError("");
    try {
      const data = await saleApi({
        action: "create",
        apiKey,
        secretKey,
        amount: {
          fiat: { amount: parseFloat(saleAmount), unit: saleFiatUnit },
        },
      });
      if (data.error || data.message) {
        setSaleError(data.error || data.message);
      } else {
        setSaleOrder(data);
        setSaleStep("quotes");
      }
    } catch {
      setSaleError("Failed to create sale order");
    }
    setSaleLoading(false);
  };

  const handleGetQuotes = async () => {
    if (!saleOrder?.id) return;
    setSaleLoading(true);
    setSaleError("");
    try {
      const data = await saleApi({
        action: "quote",
        apiKey,
        secretKey,
        payorder_id: saleOrder.id,
        wallet_address: saleWalletAddress,
        chain_type: saleChainType,
        chain_ids: saleChainId ? [parseInt(saleChainId)] : undefined,
      });
      if (data.error || data.message) {
        setSaleError(data.error || data.message);
      } else {
        setQuotes(Array.isArray(data) ? data : [data]);
      }
    } catch {
      setSaleError("Failed to get quotes");
    }
    setSaleLoading(false);
  };

  const handleSelectQuote = async (quote: Quote) => {
    setSelectedQuote(quote);
    setSaleLoading(true);
    setSaleError("");
    try {
      const data = await saleApi({
        action: "payment-details",
        apiKey,
        secretKey,
        payorder_id: saleOrder.id,
        source_currency: quote.address
          ? { address: quote.address, chain_id: quote.chain_id }
          : { chain_id: quote.chain_id },
        refund_address: saleWalletAddress || undefined,
        quote_id: quote.quote_id,
      });
      if (data.error || data.message) {
        setSaleError(data.error || data.message);
      } else {
        setPaymentDetails(data);
        setSaleStep("payment");
      }
    } catch {
      setSaleError("Failed to get payment details");
    }
    setSaleLoading(false);
  };

  const handleStartTracking = () => {
    setSaleStep("tracking");
    if (saleOrder?.id) {
      pollStatus(saleOrder.id);
    }
  };

  const handleResetSale = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setSaleStep("configure");
    setSaleOrder(null);
    setQuotes([]);
    setSelectedQuote(null);
    setPaymentDetails(null);
    setSaleError("");
    setCopied(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Shared tab button style
  const tabButton = (tab: Tab, label: string, extra?: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-6 py-3 text-sm font-medium uppercase tracking-wider transition-all flex items-center gap-2 ${
        activeTab === tab
          ? "bg-[#0a0a0a] text-white border border-[#331111] border-b-[#0a0a0a]"
          : "bg-transparent text-[#9ca3af] border border-transparent hover:text-[#ff6666]"
      }`}
      style={
        activeTab === tab
          ? {
              boxShadow:
                "0 -4px 15px rgba(255, 0, 51, 0.15), inset 0 1px 0 rgba(255, 51, 51, 0.3)",
            }
          : {}
      }
    >
      {label}
      {extra}
    </button>
  );

  const cardStyle = {
    boxShadow:
      "0 0 30px rgba(255, 0, 51, 0.15), inset 0 0 1px rgba(255, 51, 51, 0.3)",
  };

  const primaryBtnStyle = (enabled: boolean) => ({
    padding: "14px 32px",
    background: enabled
      ? "linear-gradient(180deg, #ff0033 0%, #aa0000 100%)"
      : "linear-gradient(180deg, #660022 0%, #440011 100%)",
    border: `1px solid ${enabled ? "#ff3333" : "#441111"}`,
    borderRadius: "0px",
    color: enabled ? "#ffffff" : "#ff6666",
    fontSize: "14px",
    fontWeight: 700 as const,
    cursor: enabled ? "pointer" : ("not-allowed" as const),
    textTransform: "uppercase" as const,
    letterSpacing: "2px",
    boxShadow: enabled
      ? "0 0 25px rgba(255, 0, 51, 0.5), inset 0 0 15px rgba(255, 51, 51, 0.2)"
      : "none",
    opacity: enabled ? 1 : 0.7,
  });

  return (
    <div className="min-h-screen p-10">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-3xl font-semibold mb-6">Payment</h1>

        {/* Tab Navigation */}
        <div className="flex gap-0 mb-0">
          {tabButton("checkout", "Checkout")}
          {tabButton("sale", "Sale Order")}
          {tabButton(
            "authenticate",
            "Authenticate",
            isAuthenticated ? (
              <span
                className="w-2 h-2 rounded-full bg-green-500 inline-block"
                title="Authenticated"
              />
            ) : undefined
          )}
        </div>

        {/* ============ CHECKOUT TAB ============ */}
        {activeTab === "checkout" && (
          <div
            className="bg-[#0a0a0a] border border-[#331111] p-10 grid grid-cols-1 lg:grid-cols-2 gap-16"
            style={cardStyle}
          >
            {/* Left Column - Forms */}
            <div>
              <h2 className="text-lg font-medium mb-5">
                Contact information
              </h2>
              <div className="mb-5">
                <label className="block text-sm text-[#9ca3af] mb-2">
                  Email address
                </label>
                <input type="email" placeholder="you@example.com" />
              </div>

              <div className="h-px bg-[#331111] my-8" />

              <h2 className="text-lg font-medium mb-5">
                Shipping information
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">
                    First name
                  </label>
                  <input type="text" />
                </div>
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">
                    Last name
                  </label>
                  <input type="text" />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm text-[#9ca3af] mb-2">
                  Address
                </label>
                <input type="text" />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">
                    City
                  </label>
                  <input type="text" />
                </div>
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">
                    Country
                  </label>
                  <select defaultValue="US">
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">
                    State / Province
                  </label>
                  <input type="text" />
                </div>
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">
                    Postal code
                  </label>
                  <input type="text" />
                </div>
              </div>

              <div className="h-px bg-[#331111] my-8" />
            </div>

            {/* Right Column - Order Summary */}
            <div>
              <h2 className="text-lg font-medium mb-5">Order summary</h2>

              {cartVisible && (
                <div className="bg-[#0f0808] border border-[#331111] p-4 flex gap-4 mb-6">
                  <div className="w-24 h-28 bg-[#1a0a0a] border border-[#331111] flex items-center justify-center">
                    <svg
                      className="w-16 h-20"
                      viewBox="0 0 100 100"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M30 25L20 35V45L30 40V80H70V40L80 45V35L70 25H60C60 30 55 35 50 35C45 35 40 30 40 25H30Z"
                        fill="#1a1a1a"
                        stroke="#333"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium">Basic Tee</div>
                        <div className="text-sm text-[#9ca3af]">Black</div>
                        <div className="text-sm text-[#9ca3af]">Large</div>
                        <div className="text-sm mt-3">
                          ${subtotal.toFixed(2)}
                        </div>
                      </div>
                      <button
                        className="text-[#9ca3af] hover:text-red-500 transition-colors p-1"
                        onClick={() => setCartVisible(false)}
                        title="Remove item"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                    <select
                      className="w-16 py-2 px-3 mt-2 text-sm"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-between py-3 text-sm">
                <span className="text-[#9ca3af]">Subtotal</span>
                <span>${cartVisible ? subtotal.toFixed(2) : "0.00"}</span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-[#9ca3af]">Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-[#9ca3af]">Taxes</span>
                <span>${cartVisible ? taxes.toFixed(2) : "0.00"}</span>
              </div>
              <div className="flex justify-between py-5 mt-2 border-t border-[#331111] font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {!isAuthenticated && (
                <div
                  className="text-sm text-[#ff6666] mb-4 p-3 border border-[#331111] bg-[#0f0808] cursor-pointer"
                  onClick={() => setActiveTab("authenticate")}
                >
                  Add your API keys in the Authenticate tab to enable payments.
                </div>
              )}

              {walletReady && isAuthenticated ? (
                <PayButton
                  intent="Pay With Crypto"
                  toChain={ChainId.BASE}
                  toToken="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
                  toAmount={parseFloat(total.toFixed(2))}
                  toAddress="0xFC99C0c8D697ab7a7262640145F453c988d36b75"
                  style={{
                    width: "100%",
                    padding: "16px",
                    background:
                      "linear-gradient(180deg, #ff0033 0%, #aa0000 100%)",
                    border: "1px solid #ff3333",
                    borderRadius: "0px",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor: "pointer",
                    marginTop: "24px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    boxShadow:
                      "0 0 25px rgba(255, 0, 51, 0.5), inset 0 0 15px rgba(255, 51, 51, 0.2)",
                  }}
                  onPaymentCreationError={(event) =>
                    console.error("Payment creation error:", event)
                  }
                  onPaymentStarted={(event) =>
                    console.log("Payment started:", event)
                  }
                  onPaymentCompleted={(event) => {
                    console.log("Payment completed:", event);
                    alert("Payment completed successfully!");
                  }}
                  onOpen={() => console.log("Payment modal opened")}
                  onClose={() => console.log("Payment modal closed")}
                />
              ) : (
                <button
                  disabled
                  style={{
                    width: "100%",
                    padding: "16px",
                    background:
                      "linear-gradient(180deg, #660022 0%, #440011 100%)",
                    border: "1px solid #441111",
                    borderRadius: "0px",
                    color: "#ff6666",
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor: "not-allowed",
                    marginTop: "24px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    opacity: 0.7,
                  }}
                >
                  {isAuthenticated ? "Loading..." : "Authenticate to Pay"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============ SALE ORDER TAB ============ */}
        {activeTab === "sale" && (
          <div
            className="bg-[#0a0a0a] border border-[#331111] p-10"
            style={cardStyle}
          >
            {!isAuthenticated ? (
              <div className="text-center py-10">
                <p className="text-[#9ca3af] mb-4">
                  You need to authenticate before creating sale orders.
                </p>
                <button
                  onClick={() => setActiveTab("authenticate")}
                  style={primaryBtnStyle(true)}
                >
                  Go to Authenticate
                </button>
              </div>
            ) : (
              <>
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-8">
                  {(
                    [
                      ["configure", "1. Configure"],
                      ["quotes", "2. Quotes"],
                      ["payment", "3. Payment"],
                      ["tracking", "4. Tracking"],
                    ] as const
                  ).map(([step, label], i) => (
                    <div key={step} className="flex items-center gap-2">
                      {i > 0 && (
                        <div className="w-8 h-px bg-[#331111]" />
                      )}
                      <span
                        className={`text-xs uppercase tracking-wider px-3 py-1 border ${
                          saleStep === step
                            ? "border-[#ff0033] text-[#ff0033] bg-[#1a0008]"
                            : (
                                  [
                                    "configure",
                                    "quotes",
                                    "payment",
                                    "tracking",
                                  ].indexOf(saleStep) >
                                  [
                                    "configure",
                                    "quotes",
                                    "payment",
                                    "tracking",
                                  ].indexOf(step)
                                )
                              ? "border-[#113311] text-green-500 bg-[#080f08]"
                              : "border-[#331111] text-[#6b7280]"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                  <div className="flex-1" />
                  {saleStep !== "configure" && (
                    <button
                      onClick={handleResetSale}
                      className="text-xs text-[#9ca3af] hover:text-white uppercase tracking-wider"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {saleError && (
                  <div className="mb-6 p-3 border border-[#441111] bg-[#1a0808] text-sm text-[#ff6666]">
                    {saleError}
                  </div>
                )}

                {/* Step 1: Configure */}
                {saleStep === "configure" && (
                  <div className="max-w-[600px]">
                    <h2 className="text-lg font-medium mb-2">
                      Create Sale Order
                    </h2>
                    <p className="text-sm text-[#9ca3af] mb-6">
                      Configure the sale order amount and the buyer&apos;s wallet
                      details for receiving quotes.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-2">
                          Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={saleAmount}
                          onChange={(e) => setSaleAmount(e.target.value)}
                          placeholder="5.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-2">
                          Currency
                        </label>
                        <select
                          value={saleFiatUnit}
                          onChange={(e) => setSaleFiatUnit(e.target.value)}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                    </div>

                    <div className="h-px bg-[#331111] my-6" />

                    <h3 className="text-sm font-medium mb-4 text-[#9ca3af]">
                      Buyer Wallet (for quotes)
                    </h3>

                    <div className="mb-5">
                      <label className="block text-sm text-[#9ca3af] mb-2">
                        Wallet Address
                      </label>
                      <input
                        type="text"
                        value={saleWalletAddress}
                        onChange={(e) => setSaleWalletAddress(e.target.value)}
                        placeholder="0x..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-2">
                          Chain Type
                        </label>
                        <select
                          value={saleChainType}
                          onChange={(e) => setSaleChainType(e.target.value)}
                        >
                          <option value="EVM">EVM</option>
                          <option value="SOL">Solana</option>
                          <option value="SUI">SUI</option>
                          <option value="UTXO">UTXO (Bitcoin)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#9ca3af] mb-2">
                          Chain ID
                        </label>
                        <input
                          type="text"
                          value={saleChainId}
                          onChange={(e) => setSaleChainId(e.target.value)}
                          placeholder="e.g. 8453 for Base"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCreateSaleOrder}
                      disabled={saleLoading || !saleAmount}
                      style={primaryBtnStyle(
                        !saleLoading && !!saleAmount
                      )}
                    >
                      {saleLoading ? "Creating..." : "Create Sale Order"}
                    </button>
                  </div>
                )}

                {/* Step 2: Quotes */}
                {saleStep === "quotes" && (
                  <div>
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-medium mb-1">
                          Select Payment Token
                        </h2>
                        <p className="text-sm text-[#9ca3af]">
                          Order{" "}
                          <span className="text-[#ff6666] font-mono text-xs">
                            {saleOrder?.id?.slice(0, 12)}...
                          </span>{" "}
                          created. Get quotes for available payment tokens.
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-[#9ca3af]">Amount</div>
                        <div className="text-lg font-semibold">
                          {saleAmount} {saleFiatUnit}
                        </div>
                      </div>
                    </div>

                    {quotes.length === 0 ? (
                      <div>
                        {!saleWalletAddress ? (
                          <div className="p-4 border border-[#331111] bg-[#0f0808] text-sm text-[#ff6666] mb-4">
                            Enter a wallet address to get quotes.
                          </div>
                        ) : null}
                        <div className="mb-5">
                          <label className="block text-sm text-[#9ca3af] mb-2">
                            Wallet Address
                          </label>
                          <input
                            type="text"
                            value={saleWalletAddress}
                            onChange={(e) =>
                              setSaleWalletAddress(e.target.value)
                            }
                            placeholder="0x..."
                          />
                        </div>
                        <button
                          onClick={handleGetQuotes}
                          disabled={saleLoading || !saleWalletAddress}
                          style={primaryBtnStyle(
                            !saleLoading && !!saleWalletAddress
                          )}
                        >
                          {saleLoading ? "Loading Quotes..." : "Get Quotes"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {quotes.map((quote: Quote, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectQuote(quote)}
                            disabled={saleLoading}
                            className="w-full text-left p-4 border border-[#331111] bg-[#0f0808] hover:border-[#ff0033] hover:bg-[#1a0808] transition-all flex items-center gap-4"
                          >
                            {quote.image_uri && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={quote.image_uri}
                                alt={quote.ticker || "token"}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {quote.name || quote.ticker || "Unknown Token"}
                              </div>
                              <div className="text-xs text-[#9ca3af]">
                                {quote.ticker} — Chain {quote.chain_id}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-mono">
                                {quote.total?.ui_amount_display ||
                                  quote.total?.ui_amount ||
                                  "—"}
                              </div>
                              {quote.total?.value_usd && (
                                <div className="text-xs text-[#9ca3af]">
                                  ~${parseFloat(quote.total.value_usd).toFixed(2)}
                                </div>
                              )}
                            </div>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#9ca3af"
                              strokeWidth="2"
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Payment */}
                {saleStep === "payment" && paymentDetails && (
                  <div className="max-w-[600px]">
                    <h2 className="text-lg font-medium mb-1">
                      Payment Details
                    </h2>
                    <p className="text-sm text-[#9ca3af] mb-6">
                      Send the exact amount to the deposit address below.
                    </p>

                    <div className="border border-[#331111] bg-[#0f0808] p-5 mb-6 space-y-4">
                      {/* Token info */}
                      {selectedQuote && (
                        <div className="flex items-center gap-3 pb-4 border-b border-[#331111]">
                          {selectedQuote.image_uri && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedQuote.image_uri}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-sm font-medium">
                            {selectedQuote.name || selectedQuote.ticker}
                          </span>
                          <span className="text-xs text-[#9ca3af]">
                            Chain {selectedQuote.chain_id}
                          </span>
                        </div>
                      )}

                      {/* Amount */}
                      <div>
                        <div className="text-xs text-[#9ca3af] mb-1">
                          Amount to Send
                        </div>
                        <div className="text-lg font-mono font-semibold text-[#ff0033]">
                          {paymentDetails.data?.src?.total?.ui_amount_display ||
                            paymentDetails.data?.src?.total?.ui_amount ||
                            selectedQuote?.total?.ui_amount_display ||
                            "—"}{" "}
                          {selectedQuote?.ticker || ""}
                        </div>
                      </div>

                      {/* Deposit address */}
                      {paymentDetails.data?.deposit_address && (
                        <div>
                          <div className="text-xs text-[#9ca3af] mb-1">
                            Deposit Address
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-[#ff6666] break-all flex-1">
                              {paymentDetails.data.deposit_address}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  paymentDetails.data.deposit_address
                                )
                              }
                              className="text-[#9ca3af] hover:text-white transition-colors shrink-0"
                              title="Copy address"
                            >
                              {copied ? (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#22c55e"
                                  strokeWidth="2"
                                >
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              ) : (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <rect
                                    x="9"
                                    y="9"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    ry="2"
                                  />
                                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Expiry */}
                      {paymentDetails.data?.expires_at && (
                        <div>
                          <div className="text-xs text-[#9ca3af] mb-1">
                            Expires
                          </div>
                          <div className="text-sm font-mono">
                            {new Date(
                              paymentDetails.data.expires_at
                            ).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-sm text-[#9ca3af]">Status:</span>
                      <span
                        className="text-sm font-medium px-2 py-0.5 border"
                        style={{
                          color:
                            STATUS_COLORS[paymentDetails.status] || "#9ca3af",
                          borderColor:
                            STATUS_COLORS[paymentDetails.status] || "#331111",
                        }}
                      >
                        {paymentDetails.status}
                      </span>
                    </div>

                    <button
                      onClick={handleStartTracking}
                      style={primaryBtnStyle(true)}
                    >
                      Track Payment Status
                    </button>
                  </div>
                )}

                {/* Step 4: Tracking */}
                {saleStep === "tracking" && (
                  <div className="max-w-[600px]">
                    <h2 className="text-lg font-medium mb-1">
                      Order Tracking
                    </h2>
                    <p className="text-sm text-[#9ca3af] mb-6">
                      Polling for status updates every 5 seconds.
                    </p>

                    <div className="border border-[#331111] bg-[#0f0808] p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-[#9ca3af]">Order ID</div>
                        <code className="text-xs font-mono text-[#ff6666]">
                          {saleOrder?.id}
                        </code>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-[#9ca3af]">Status</div>
                        <span
                          className="text-sm font-medium px-3 py-1 border"
                          style={{
                            color:
                              STATUS_COLORS[saleOrder?.status] || "#9ca3af",
                            borderColor:
                              STATUS_COLORS[saleOrder?.status] || "#331111",
                          }}
                        >
                          {saleOrder?.status || "UNKNOWN"}
                        </span>
                      </div>

                      {saleOrder?.deposit_tx_hash && (
                        <div className="flex justify-between items-start">
                          <div className="text-xs text-[#9ca3af]">
                            Deposit TX
                          </div>
                          <code className="text-xs font-mono text-[#9ca3af] max-w-[300px] break-all text-right">
                            {saleOrder.deposit_tx_hash}
                          </code>
                        </div>
                      )}

                      {saleOrder?.receiving_tx_hash && (
                        <div className="flex justify-between items-start">
                          <div className="text-xs text-[#9ca3af]">
                            Receiving TX
                          </div>
                          <code className="text-xs font-mono text-[#9ca3af] max-w-[300px] break-all text-right">
                            {saleOrder.receiving_tx_hash}
                          </code>
                        </div>
                      )}

                      {saleOrder?.fulfillment && (
                        <>
                          <div className="h-px bg-[#331111]" />
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-[#9ca3af]">
                              Fulfillment Amount
                            </div>
                            <div className="text-sm font-mono">
                              {saleOrder.fulfillment.amount?.ui_amount_display ||
                                saleOrder.fulfillment.amount?.ui_amount ||
                                "—"}
                            </div>
                          </div>
                          {saleOrder.fulfillment.fiat && (
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-[#9ca3af]">
                                Fiat Value
                              </div>
                              <div className="text-sm">
                                {saleOrder.fulfillment.fiat}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {saleOrder?.updated_at && (
                        <>
                          <div className="h-px bg-[#331111]" />
                          <div className="text-xs text-[#6b7280] text-right">
                            Last updated:{" "}
                            {new Date(saleOrder.updated_at).toLocaleString()}
                          </div>
                        </>
                      )}
                    </div>

                    {["COMPLETED", "FAILED", "EXPIRED", "REFUNDED"].includes(
                      saleOrder?.status
                    ) && (
                      <div className="mt-6">
                        <button
                          onClick={handleResetSale}
                          style={primaryBtnStyle(true)}
                        >
                          Create New Order
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============ AUTHENTICATE TAB ============ */}
        {activeTab === "authenticate" && (
          <div
            className="bg-[#0a0a0a] border border-[#331111] p-10"
            style={cardStyle}
          >
            <div className="max-w-[500px]">
              <h2 className="text-lg font-medium mb-2">
                CoinVoyage Authentication
              </h2>
              <p className="text-sm text-[#9ca3af] mb-8">
                Enter your API key and secret key from your{" "}
                <a
                  href="https://coinvoyage.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ff0033] hover:text-[#ff3333] underline"
                >
                  CoinVoyage account
                </a>{" "}
                to enable crypto payments.
              </p>

              {isAuthenticated && (
                <div className="flex items-center gap-2 mb-6 p-3 border border-[#113311] bg-[#080f08]">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm text-green-400">
                    Authenticated — keys are linked
                  </span>
                </div>
              )}

              {saved && (
                <div className="flex items-center gap-2 mb-6 p-3 border border-[#331111] bg-[#0f0808]">
                  <span className="text-sm text-[#ff6666]">
                    Keys saved successfully
                  </span>
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm text-[#9ca3af] mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  placeholder="pk_live_..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm text-[#9ca3af] mb-2">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    placeholder="sk_live_..."
                    value={secretKeyInput}
                    onChange={(e) => setSecretKeyInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white transition-colors"
                  >
                    {showSecret ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveKeys}
                  disabled={!apiKeyInput || !secretKeyInput}
                  style={primaryBtnStyle(!!apiKeyInput && !!secretKeyInput)}
                >
                  {saved ? "Saved" : "Save Keys"}
                </button>

                {(apiKeyInput || secretKeyInput) && (
                  <button
                    onClick={handleClearKeys}
                    style={{
                      padding: "14px 24px",
                      background: "transparent",
                      border: "1px solid #331111",
                      borderRadius: "0px",
                      color: "#9ca3af",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "2px",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="h-px bg-[#331111] my-8" />

              <div className="text-xs text-[#6b7280]">
                <p className="mb-2">
                  Your keys are stored locally in your browser and are never
                  sent to our servers.
                </p>
                <p>
                  Need an account?{" "}
                  <a
                    href="https://coinvoyage.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff0033] hover:text-[#ff3333] underline"
                  >
                    Sign up at CoinVoyage
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
