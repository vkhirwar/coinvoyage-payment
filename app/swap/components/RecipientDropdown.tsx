"use client";

import { useEffect, useRef, useState } from "react";
import { ChainType } from "@coin-voyage/shared/types";
import { VS } from "./theme";

type Props = {
  chainType: ChainType;
  // Address currently selected (any source).
  currentAddress: string;
  // True when the address came from a connected wallet (vs pasted).
  isFromWallet: boolean;
  // Connected wallet address for this chainType, if any. Used to show as a
  // selectable option in the dropdown.
  connectedAddress?: string;
  onSelectConnected: (addr: string) => void;
  onClear: () => void;
  onPasteAddress: (addr: string) => void;
  onConnectNewWallet: () => void;
};

function shortAddress(addr: string | undefined): string {
  if (!addr) return "";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function RecipientDropdown({
  chainType,
  currentAddress,
  isFromWallet,
  connectedAddress,
  onSelectConnected,
  onClear,
  onPasteAddress,
  onConnectNewWallet,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click & Esc.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPasteOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPasteOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const submitPaste = () => {
    const v = pasteValue.trim();
    if (!v) return;
    onPasteAddress(v);
    setPasteValue("");
    setPasteOpen(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 10px",
          background: VS.surface2,
          border: `1px solid ${VS.border}`,
          borderRadius: 999,
          color: VS.text,
          fontSize: 12,
          fontFamily: "monospace",
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: -0.2,
        }}
      >
        {currentAddress ? (
          <>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isFromWallet ? VS.success : VS.warning,
                display: "inline-block",
              }}
            />
            {shortAddress(currentAddress)}
          </>
        ) : (
          <span style={{ color: VS.textMuted, fontFamily: "inherit" }}>
            Set recipient
          </span>
        )}
        <span style={{ color: VS.textMuted, fontSize: 10 }} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 280,
            background: VS.surface,
            border: `1px solid ${VS.borderStrong}`,
            borderRadius: 12,
            padding: 6,
            boxShadow: "0 12px 32px -12px rgba(0,0,0,0.4)",
            zIndex: 30,
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.4,
              color: VS.textDim,
              textTransform: "uppercase",
            }}
          >
            Receive on {chainType}
          </div>

          {/* Connected wallet for this chain type, if any */}
          {connectedAddress && (
            <RowButton
              onClick={() => {
                onSelectConnected(connectedAddress);
                setOpen(false);
              }}
              active={currentAddress === connectedAddress && isFromWallet}
              icon={
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: VS.success,
                  }}
                />
              }
              label={shortAddress(connectedAddress)}
              hint="Connected wallet"
              mono
            />
          )}

          {currentAddress && !isFromWallet && (
            <RowButton
              onClick={() => {
                /* selecting the current pasted address keeps it */
                setOpen(false);
              }}
              active
              icon={
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: VS.warning,
                  }}
                />
              }
              label={shortAddress(currentAddress)}
              hint="Pasted address"
              mono
            />
          )}

          <Divider />

          <RowButton
            onClick={() => {
              setOpen(false);
              onConnectNewWallet();
            }}
            label="Connect a new wallet"
            icon={<PlusIcon />}
          />

          <RowButton
            onClick={() => setPasteOpen((p) => !p)}
            label="Paste wallet address"
            icon={<PasteIcon />}
          />

          {pasteOpen && (
            <div style={{ padding: "6px 6px 4px" }}>
              <input
                type="text"
                placeholder={`Enter ${chainType} address`}
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitPaste();
                  }
                }}
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: VS.surface2,
                  border: `1px solid ${VS.border}`,
                  borderRadius: 8,
                  color: VS.text,
                  fontSize: 12,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 6,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => {
                    setPasteOpen(false);
                    setPasteValue("");
                  }}
                  style={{
                    padding: "6px 10px",
                    background: "transparent",
                    border: `1px solid ${VS.border}`,
                    borderRadius: 8,
                    color: VS.textMuted,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitPaste}
                  disabled={!pasteValue.trim()}
                  style={{
                    padding: "6px 12px",
                    background: pasteValue.trim() ? VS.gradient : VS.surface2,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: pasteValue.trim() ? "pointer" : "not-allowed",
                    opacity: pasteValue.trim() ? 1 : 0.6,
                  }}
                >
                  Use
                </button>
              </div>
            </div>
          )}

          {currentAddress && (
            <>
              <Divider />
              <RowButton
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                label="Clear recipient"
                icon={<XIcon />}
                danger
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RowButton({
  onClick,
  label,
  hint,
  icon,
  active,
  mono,
  danger,
}: {
  onClick: () => void;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  active?: boolean;
  mono?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 10px",
        background: active ? VS.gradientSoft : "transparent",
        border: `1px solid ${active ? VS.borderStrong : "transparent"}`,
        borderRadius: 8,
        color: danger ? VS.danger : VS.text,
        cursor: "pointer",
        textAlign: "left",
        fontSize: 13,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = VS.surface2;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: danger ? VS.danger : VS.textMuted,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: mono ? "monospace" : "inherit",
          fontWeight: mono ? 600 : 500,
        }}
      >
        {label}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: VS.textDim, flexShrink: 0 }}>{hint}</span>
      )}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: VS.border, margin: "4px 0" }} />;
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PasteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
