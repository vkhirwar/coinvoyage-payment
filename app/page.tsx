"use client";

import { PayButton } from "@coin-voyage/paykit";
import { ChainId } from "@coin-voyage/paykit/server";
import { useState } from "react";
import { useWalletReady } from "./providers";

export default function PaymentPage() {
  const [quantity, setQuantity] = useState(1);
  const [cartVisible, setCartVisible] = useState(true);
  const walletReady = useWalletReady();

  const basePrice = 4.0;
  const shipping = 1.0;
  const taxRate = 0.05;

  const subtotal = basePrice * quantity;
  const taxes = subtotal * taxRate;
  const total = cartVisible ? subtotal + shipping + taxes : shipping;

  return (
    <div className="min-h-screen p-10">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-3xl font-semibold mb-6">Payment</h1>

        <div className="bg-[#0a0a0a] border border-[#331111] p-10 grid grid-cols-1 lg:grid-cols-2 gap-16" style={{ boxShadow: "0 0 30px rgba(255, 0, 51, 0.15), inset 0 0 1px rgba(255, 51, 51, 0.3)" }}>
          {/* Left Column - Forms */}
          <div>
            <h2 className="text-lg font-medium mb-5">Contact information</h2>
            <div className="mb-5">
              <label className="block text-sm text-[#9ca3af] mb-2">
                Email address
              </label>
              <input type="email" placeholder="you@example.com" />
            </div>

            <div className="h-px bg-[#331111] my-8" />

            <h2 className="text-lg font-medium mb-5">Shipping information</h2>

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

            {walletReady ? (
              <PayButton
                intent="Pay With Crypto"
                toChain={ChainId.SUI}
                toAddress="0x7b8e0864967427679b4e129f79dc332a885c6087ec9e187b53451a9006ee15f2"
                toAmount={total.toFixed(2)}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "linear-gradient(180deg, #ff0033 0%, #aa0000 100%)",
                  border: "1px solid #ff3333",
                  borderRadius: "0px",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: "24px",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  boxShadow: "0 0 25px rgba(255, 0, 51, 0.5), inset 0 0 15px rgba(255, 51, 51, 0.2)",
                }}
                onPaymentCreationError={(event) => {
                  console.error("Payment creation error:", event);
                }}
                onPaymentStarted={(event) => {
                  console.log("Payment started:", event);
                }}
                onPaymentCompleted={(event) => {
                  console.log("Payment completed:", event);
                  alert("Payment completed successfully!");
                }}
                onOpen={() => {
                  console.log("Payment modal opened");
                }}
                onClose={() => {
                  console.log("Payment modal closed");
                }}
              />
            ) : (
              <button
                disabled
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "linear-gradient(180deg, #660022 0%, #440011 100%)",
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
                Loading...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
