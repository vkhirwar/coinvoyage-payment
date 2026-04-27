"use client";

import { useState, useEffect, useCallback } from "react";

// ─── TIMING CONFIG ──────────────────────────────────────────────────
const SCENE_DURATIONS = {
  intro: 4500,
  problemStatement: 4500,
  checkoutReveal: 6000,
  widgetOpen: 6500,
  chainSelect: 5500,
  quoteRouting: 6000,
  payWithWallet: 5500,
  transactionProcessing: 6000,
  transactionComplete: 4500,
  depositFlow: 6000,
  swapFlow: 6500,
  multiChain: 5000,
  enterpriseFeatures: 5500,
  closingCTA: 5500,
};

type Scene = keyof typeof SCENE_DURATIONS;
const SCENES = Object.keys(SCENE_DURATIONS) as Scene[];

// ─── COMPONENT ──────────────────────────────────────────────────────
export default function CoinVoyageVideoAd() {
  const [currentScene, setCurrentScene] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subStep, setSubStep] = useState(0);

  const scene = SCENES[currentScene] as Scene;

  const startPlayback = useCallback(() => {
    setIsPlaying(true);
    setCurrentScene(0);
    setSceneProgress(0);
    setSubStep(0);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const duration = SCENE_DURATIONS[scene];
    const interval = 16;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(elapsed / duration, 1);
      setSceneProgress(progress);

      if (progress >= 0.75) setSubStep(3);
      else if (progress >= 0.5) setSubStep(2);
      else if (progress >= 0.25) setSubStep(1);
      else setSubStep(0);

      if (progress >= 1) {
        clearInterval(timer);
        if (currentScene < SCENES.length - 1) {
          setCurrentScene((s) => s + 1);
          setSceneProgress(0);
          setSubStep(0);
        } else {
          setIsPlaying(false);
        }
      }
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, currentScene, scene]);

  return (
    <div style={styles.viewport}>
      <style>{globalAnimations}</style>

      {/* Background */}
      <div style={styles.bgGrid} />
      <div style={{
        ...styles.bgGlow,
        opacity: isPlaying ? 0.5 : 0.2,
        transform: `translate(-50%, -50%) scale(${1 + sceneProgress * 0.2})`,
      }} />
      <div style={styles.bgGlowSecondary} />
      <div style={styles.scanline} />
      {isPlaying && <ParticleField />}

      {/* Watermark */}
      <div style={styles.watermark}>COINVOYAGE</div>

      {/* Content */}
      <div style={styles.content}>
        {!isPlaying && currentScene === 0 && sceneProgress === 0 && (
          <PreRoll onStart={startPlayback} />
        )}
        {isPlaying && scene === "intro" && <SceneIntro progress={sceneProgress} />}
        {isPlaying && scene === "problemStatement" && <SceneProblem progress={sceneProgress} />}
        {isPlaying && scene === "checkoutReveal" && <SceneCheckoutReveal progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "widgetOpen" && <SceneWidgetOpen progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "chainSelect" && <SceneChainSelect progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "quoteRouting" && <SceneQuoteRouting progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "payWithWallet" && <ScenePayWithWallet progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "transactionProcessing" && <SceneProcessing progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "transactionComplete" && <SceneComplete progress={sceneProgress} />}
        {isPlaying && scene === "depositFlow" && <SceneDepositFlow progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "swapFlow" && <SceneSwapRouting progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "multiChain" && <SceneMultiChain progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "enterpriseFeatures" && <SceneEnterprise progress={sceneProgress} step={subStep} />}
        {isPlaying && scene === "closingCTA" && <SceneClosing progress={sceneProgress} />}
        {!isPlaying && currentScene === SCENES.length - 1 && sceneProgress >= 1 && (
          <EndScreen onReplay={startPlayback} />
        )}
      </div>

      {/* Progress */}
      {isPlaying && (
        <div style={styles.progressContainer}>
          <div style={styles.sceneIndicator}>
            {SCENES.map((_, i) => (
              <div key={i} style={{
                ...styles.sceneDot,
                backgroundColor: i <= currentScene ? "#ff0033" : "#333",
                transform: i === currentScene ? "scale(1.4)" : "scale(1)",
              }} />
            ))}
          </div>
          <div style={styles.progressBarContainer}>
            <div style={{
              ...styles.progressBar,
              width: `${((currentScene + sceneProgress) / SCENES.length) * 100}%`,
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRE-ROLL ───────────────────────────────────────────────────────
function PreRoll({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ ...styles.centered, animation: "fadeIn 1.2s ease" }}>
      <CoinVoyageLogo size={72} />
      <h1 style={styles.preTitle}>CoinVoyage</h1>
      <p style={styles.preSubtitle}>The Complete Crypto Payment Solution</p>
      <div style={styles.preDivider} />
      <p style={styles.preDesc}>Accept payments from any chain. Settle in your preferred asset.</p>
      <button onClick={onStart} style={styles.playButton}>
        <span style={styles.playIcon}>&#9654;</span>
        <span>WATCH DEMO</span>
      </button>
    </div>
  );
}

// ─── COINVOYAGE LOGO ────────────────────────────────────────────────
function CoinVoyageLogo({ size = 48, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.2,
      background: "linear-gradient(135deg, #ff0033, #cc0022, #ff1a4a)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: glow ? `0 0 ${size * 0.6}px rgba(255,0,51,0.4), 0 0 ${size * 0.2}px rgba(255,0,51,0.2)` : "none",
      position: "relative" as const,
    }}>
      <span style={{
        fontSize: size * 0.4,
        fontWeight: 900,
        color: "#fff",
        letterSpacing: 1,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>CV</span>
    </div>
  );
}

// ─── SCENE 1: INTRO ─────────────────────────────────────────────────
function SceneIntro({ progress }: { progress: number }) {
  const logoScale = Math.min(progress * 3, 1);
  const textOpacity = Math.max(0, (progress - 0.25) * 2.5);
  const taglineOpacity = Math.max(0, (progress - 0.5) * 3);

  return (
    <div style={styles.centered}>
      <div style={{
        transform: `scale(${logoScale})`,
        opacity: logoScale,
        marginBottom: 32,
      }}>
        <div style={{ position: "relative" as const }}>
          <div style={{
            position: "absolute" as const,
            inset: -16,
            borderRadius: "50%",
            border: "1px solid rgba(255,0,51,0.3)",
            animation: "glowPulse 2s ease-in-out infinite",
          }} />
          <CoinVoyageLogo size={100} />
        </div>
      </div>
      <h1 style={{
        ...styles.heroTitle,
        opacity: textOpacity,
        transform: `translateY(${(1 - textOpacity) * 30}px)`,
      }}>
        CoinVoyage
      </h1>
      <div style={{
        ...styles.heroTagline,
        opacity: taglineOpacity,
        transform: `translateY(${(1 - taglineOpacity) * 20}px)`,
      }}>
        Seamless Cross-Chain Crypto Payments
      </div>
      <div style={{
        ...styles.heroSubTagline,
        opacity: Math.max(0, (progress - 0.65) * 4),
      }}>
        For Your Business
      </div>
    </div>
  );
}

// ─── SCENE 2: PROBLEM ───────────────────────────────────────────────
function SceneProblem({ progress }: { progress: number }) {
  const lines = [
    { text: "Your customers hold 1000+ different tokens.", highlight: false },
    { text: "Across 13+ blockchain networks.", highlight: false },
    { text: "One widget to accept them all.", highlight: true },
  ];

  return (
    <div style={styles.centered}>
      {lines.map((line, i) => {
        const lp = Math.max(0, Math.min(1, (progress - i * 0.28) * 4));
        return (
          <p key={i} style={{
            fontSize: 30,
            fontWeight: 700,
            marginBottom: 28,
            opacity: lp,
            transform: `translateX(${(1 - lp) * -50}px)`,
            transition: "all 0.3s ease",
            color: line.highlight ? "#ff0033" : "#fff",
            letterSpacing: line.highlight ? 2 : 0.5,
          }}>
            {line.text}
          </p>
        );
      })}
    </div>
  );
}

// ─── SCENE 3: CHECKOUT PAGE REVEAL ──────────────────────────────────
function SceneCheckoutReveal({ progress, step }: { progress: number; step: number }) {
  const pageOpacity = Math.min(progress * 3, 1);

  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        Checkout Flow — E-Commerce Integration
      </p>
      <div style={{
        ...styles.browserFrame,
        opacity: pageOpacity,
        transform: `perspective(1200px) rotateY(${(1 - pageOpacity) * -8}deg) scale(${0.9 + pageOpacity * 0.1})`,
      }}>
        {/* Browser chrome */}
        <div style={styles.browserBar}>
          <div style={styles.browserDots}>
            <div style={{ ...styles.dot, backgroundColor: "#ff5f57" }} />
            <div style={{ ...styles.dot, backgroundColor: "#febc2e" }} />
            <div style={{ ...styles.dot, backgroundColor: "#28c840" }} />
          </div>
          <div style={styles.browserUrl}>example.coinvoyage.io/payment</div>
        </div>
        {/* Page content */}
        <div style={styles.checkoutPage}>
          <div style={styles.checkoutLeft}>
            <div style={styles.checkoutProduct}>
              <div style={styles.productImage}>
                <span style={{ fontSize: 40 }}>🎮</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Premium Game Pass</div>
                <div style={{ color: "#888", fontSize: 13 }}>Digital subscription — 1 year</div>
                <div style={{ color: "#ff0033", fontWeight: 700, marginTop: 8 }}>$49.99 USD</div>
              </div>
            </div>
            <div style={styles.checkoutForm}>
              <div style={styles.formField}>
                <span style={styles.fieldLabel}>Email</span>
                <div style={styles.fieldInput}>{step >= 1 ? "user@example.com" : ""}</div>
              </div>
              <div style={styles.formField}>
                <span style={styles.fieldLabel}>Shipping</span>
                <div style={styles.fieldInput}>{step >= 2 ? "123 Main St, NYC" : ""}</div>
              </div>
            </div>
          </div>
          <div style={styles.checkoutRight}>
            <div style={styles.orderSummary}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, letterSpacing: 2, textTransform: "uppercase" as const, color: "#888" }}>Order Summary</div>
              <div style={styles.summaryRow}><span>Subtotal</span><span>$49.99</span></div>
              <div style={styles.summaryRow}><span>Shipping</span><span>$1.00</span></div>
              <div style={styles.summaryRow}><span>Tax (5%)</span><span>$2.50</span></div>
              <div style={{ ...styles.summaryRow, borderTop: "1px solid #222", paddingTop: 12, fontWeight: 700, fontSize: 18 }}>
                <span>Total</span><span style={{ color: "#ff0033" }}>$53.49</span>
              </div>
            </div>
            {step >= 3 && (
              <div style={{
                ...styles.payButtonMockup,
                animation: "pulseGlow 2s infinite",
              }}>
                <CoinVoyageLogo size={20} glow={false} />
                <span>Pay With Crypto</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 4: WIDGET MODAL OPENS ────────────────────────────────────
function SceneWidgetOpen({ progress, step }: { progress: number; step: number }) {
  const modalScale = Math.min(progress * 2.5, 1);
  const overlayOpacity = Math.min(progress * 3, 0.9);

  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        CoinVoyage Payment Widget
      </p>

      {/* Overlay */}
      <div style={{
        position: "absolute" as const,
        inset: 0,
        backgroundColor: `rgba(0,0,0,${overlayOpacity * 0.5})`,
        pointerEvents: "none" as const,
      }} />

      {/* Widget Modal */}
      <div style={{
        ...styles.widgetModal,
        transform: `scale(${modalScale})`,
        opacity: modalScale,
      }}>
        {/* Modal header */}
        <div style={styles.modalHeader}>
          <div style={styles.modalHeaderLeft}>
            <CoinVoyageLogo size={28} glow={false} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Pay $53.49</div>
              <div style={{ fontSize: 12, color: "#888" }}>Select payment method</div>
            </div>
          </div>
          <div style={styles.modalClose}>&#10005;</div>
        </div>

        {/* Amount display */}
        <div style={styles.modalAmountBar}>
          <span style={{ color: "#888", fontSize: 13 }}>Amount Due</span>
          <span style={{ fontSize: 24, fontWeight: 800 }}>$53.49 <span style={{ fontSize: 13, color: "#666" }}>USD</span></span>
        </div>

        {/* Chain options */}
        <div style={styles.modalBody}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 12, letterSpacing: 2, textTransform: "uppercase" as const }}>
            Choose Network
          </div>

          {[
            { icon: "◎", chain: "Solana", token: "USDC", amount: "53.49 USDC", selected: step >= 1 },
            { icon: "⟠", chain: "Ethereum", token: "ETH", amount: "0.0142 ETH", selected: false },
            { icon: "🔵", chain: "Base", token: "USDC", amount: "53.49 USDC", selected: false },
            { icon: "₿", chain: "Bitcoin", token: "BTC", amount: "0.00052 BTC", selected: false },
          ].map((opt, i) => (
            <div key={i} style={{
              ...styles.chainOption,
              borderColor: opt.selected ? "#ff0033" : "#1a1a1a",
              background: opt.selected ? "rgba(255,0,51,0.05)" : "#0a0a0a",
              boxShadow: opt.selected ? "0 0 20px rgba(255,0,51,0.15)" : "none",
              animation: `fadeIn 0.3s ease ${i * 0.1}s both`,
            }}>
              <span style={{ fontSize: 22, width: 32, textAlign: "center" as const }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.chain}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{opt.token}</div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.amount}</div>
                {opt.selected && <div style={{ fontSize: 11, color: "#ff0033" }}>Selected</div>}
              </div>
            </div>
          ))}

          {step >= 2 && (
            <div style={styles.walletConnect}>
              <div style={{ ...styles.statusDot, backgroundColor: step >= 3 ? "#22c55e" : "#f59e0b" }} />
              <span style={{ fontSize: 13, color: step >= 3 ? "#22c55e" : "#f59e0b" }}>
                {step >= 3 ? "Phantom Wallet Connected" : "Connecting wallet..."}
              </span>
              {step >= 3 && (
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#888", marginLeft: "auto" }}>
                  7xKX...m4Fp
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 5: CHAIN SELECTION + WALLET SCAN ─────────────────────────
function SceneChainSelect({ progress, step }: { progress: number; step: number }) {
  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        Automatic Wallet Scan & Best Route
      </p>
      <div style={{
        ...styles.widgetModal,
        opacity: Math.min(progress * 3, 1),
        width: 420,
      }}>
        <div style={styles.modalHeader}>
          <div style={styles.modalHeaderLeft}>
            <CoinVoyageLogo size={28} glow={false} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Pay $53.49 — Solana</div>
              <div style={{ fontSize: 12, color: "#22c55e" }}>◎ Wallet connected</div>
            </div>
          </div>
          <div style={styles.modalClose}>&#10005;</div>
        </div>

        <div style={styles.modalBody}>
          {/* Wallet balances */}
          <div style={{ fontSize: 12, color: "#888", marginBottom: 12, letterSpacing: 2, textTransform: "uppercase" as const }}>
            Your Solana Balances
          </div>
          <div style={styles.balanceGrid}>
            {[
              { token: "SOL", balance: "4.231", usd: "$682.18", icon: "◎" },
              { token: "USDC", balance: "1,250.00", usd: "$1,250.00", icon: "$", highlight: true },
              { token: "BONK", balance: "2.3M", usd: "$51.20", icon: "🐕" },
            ].map((b, i) => {
              const bp = Math.max(0, Math.min(1, (progress - 0.1 - i * 0.12) * 5));
              return (
                <div key={i} style={{
                  ...styles.balanceCard,
                  opacity: bp,
                  transform: `translateY(${(1 - bp) * 15}px)`,
                  borderColor: b.highlight && step >= 1 ? "#ff0033" : "#1a1a1a",
                  boxShadow: b.highlight && step >= 1 ? "0 0 15px rgba(255,0,51,0.2)" : "none",
                }}>
                  <span style={{ fontSize: 18 }}>{b.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{b.balance} <span style={{ color: "#888", fontSize: 12 }}>{b.token}</span></div>
                    <div style={{ fontSize: 12, color: "#666" }}>{b.usd}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scanning animation */}
          {step >= 1 && step < 3 && (
            <div style={{ ...styles.scanningBar, animation: "fadeIn 0.3s ease" }}>
              <div style={styles.scanningDot} />
              <span style={{ fontSize: 13, color: "#f59e0b" }}>
                Scanning routes across Uniswap, Jupiter, CCTP...
              </span>
            </div>
          )}

          {/* Best route found */}
          {step >= 2 && (
            <div style={{ ...styles.bestRoute, animation: "slideUp 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" as const }}>Best Route Found</span>
                <span style={{ fontSize: 11, color: "#888" }}>via Jupiter</span>
              </div>
              <div style={styles.routeRow}><span style={{ color: "#888" }}>You Pay</span><span style={{ fontWeight: 700 }}>53.49 USDC</span></div>
              <div style={styles.routeRow}><span style={{ color: "#888" }}>You Receive</span><span style={{ fontWeight: 700, color: "#22c55e" }}>53.49 USDC</span></div>
              <div style={styles.routeRow}><span style={{ color: "#888" }}>Network Fee</span><span>~$0.001</span></div>
              <div style={styles.routeRow}><span style={{ color: "#888" }}>Platform Fee</span><span>$0.80 (1.5%)</span></div>
              <div style={styles.routeRow}><span style={{ color: "#888" }}>Est. Time</span><span style={{ color: "#22c55e" }}>~2s</span></div>
            </div>
          )}

          {step >= 3 && (
            <div style={{ ...styles.ctaButton, animation: "pulseGlow 2s infinite" }}>
              CONFIRM PAYMENT
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 6: QUOTE ROUTING VISUAL ─────────────────────────────────
function SceneQuoteRouting({ progress, step }: { progress: number; step: number }) {
  const nodes = [
    { label: "USDC", sub: "Solana", x: 50, y: 50, icon: "◎" },
    { label: "Jupiter", sub: "DEX", x: 250, y: 30, icon: "⚡" },
    { label: "CCTP", sub: "Bridge", x: 450, y: 50, icon: "🌐" },
    { label: "USDC", sub: "Base", x: 650, y: 50, icon: "🔵" },
    { label: "Merchant", sub: "Settlement", x: 850, y: 50, icon: "🏪" },
  ];

  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        Intelligent Multi-Provider Routing
      </p>
      <p style={{ ...styles.sceneSubLabel, opacity: Math.min(progress * 3, 1) }}>
        CoinVoyage automatically chains providers for the best rate
      </p>

      <div style={{
        position: "relative" as const,
        width: 900,
        height: 160,
        opacity: Math.min(progress * 2, 1),
      }}>
        {/* Connection lines */}
        <svg style={{ position: "absolute" as const, inset: 0 }} viewBox="0 0 900 160">
          {nodes.slice(0, -1).map((node, i) => {
            const next = nodes[i + 1];
            const lineProgress = Math.max(0, Math.min(1, (progress - 0.15 - i * 0.15) * 5));
            return (
              <line
                key={i}
                x1={node.x + 40}
                y1={node.y + 30}
                x2={node.x + 40 + (next.x - node.x) * lineProgress}
                y2={node.y + 30 + (next.y - node.y) * lineProgress}
                stroke="#ff0033"
                strokeWidth="2"
                strokeDasharray="6,4"
                opacity={0.6}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const np = Math.max(0, Math.min(1, (progress - i * 0.12) * 4));
          return (
            <div key={i} style={{
              position: "absolute" as const,
              left: node.x,
              top: node.y,
              width: 80,
              textAlign: "center" as const,
              opacity: np,
              transform: `scale(${np}) translateY(${(1 - np) * 20}px)`,
              transition: "all 0.3s ease",
            }}>
              <div style={{
                width: 56,
                height: 56,
                margin: "0 auto 8px",
                borderRadius: 14,
                background: "#0f0f0f",
                border: `1px solid ${step >= i ? "#ff0033" : "#222"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                boxShadow: step >= i ? "0 0 15px rgba(255,0,51,0.3)" : "none",
              }}>
                {node.icon}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{node.label}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{node.sub}</div>
            </div>
          );
        })}

        {/* Moving packet */}
        {step >= 1 && (
          <div style={{
            position: "absolute" as const,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ff0033",
            boxShadow: "0 0 20px rgba(255,0,51,0.8)",
            left: 70 + (830 * Math.min(1, (progress - 0.25) * 2)),
            top: 75,
            transition: "left 0.1s linear",
          }} />
        )}
      </div>

      {step >= 3 && (
        <div style={{
          ...styles.routingResult,
          animation: "slideUp 0.5s ease",
        }}>
          <span style={{ color: "#22c55e", fontWeight: 700 }}>53.49 USDC</span>
          <span style={{ color: "#888" }}> routed </span>
          <span style={{ color: "#fff" }}>SOL → Base</span>
          <span style={{ color: "#888" }}> in </span>
          <span style={{ color: "#22c55e" }}>~2.4s</span>
        </div>
      )}
    </div>
  );
}

// ─── SCENE 7: PAY WITH WALLET ───────────────────────────────────────
function ScenePayWithWallet({ progress, step }: { progress: number; step: number }) {
  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        One-Click Wallet Payment
      </p>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", opacity: Math.min(progress * 2, 1) }}>
        {/* Wallet approval prompt */}
        <div style={styles.walletPrompt}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>👻</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Phantom</div>
              <div style={{ fontSize: 12, color: "#888" }}>Transaction Request</div>
            </div>
          </div>

          <div style={styles.walletTxDetail}>
            <div style={styles.routeRow}><span style={{ color: "#888" }}>Action</span><span>Transfer</span></div>
            <div style={styles.routeRow}><span style={{ color: "#888" }}>Amount</span><span style={{ fontWeight: 700 }}>53.49 USDC</span></div>
            <div style={styles.routeRow}><span style={{ color: "#888" }}>Network</span><span>Solana</span></div>
            <div style={styles.routeRow}><span style={{ color: "#888" }}>To</span><span style={{ fontFamily: "monospace", fontSize: 12 }}>CvPay...x8Rm</span></div>
            <div style={styles.routeRow}><span style={{ color: "#888" }}>Fee</span><span style={{ color: "#22c55e" }}>~0.000005 SOL</span></div>
          </div>

          {step >= 1 && step < 3 && (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div style={{ flex: 1, padding: "12px", background: "#1a1a1a", textAlign: "center" as const, borderRadius: 8, color: "#888", fontSize: 14, fontWeight: 600 }}>
                Cancel
              </div>
              <div style={{
                flex: 1,
                padding: "12px",
                background: step >= 2 ? "#22c55e" : "linear-gradient(180deg, #ff0033, #aa0000)",
                textAlign: "center" as const,
                borderRadius: 8,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                boxShadow: "0 0 15px rgba(255,0,51,0.3)",
              }}>
                {step >= 2 ? "✓ Signed" : "Approve"}
              </div>
            </div>
          )}

          {step >= 3 && (
            <div style={{
              marginTop: 16,
              padding: "14px",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 8,
              textAlign: "center" as const,
              color: "#22c55e",
              fontWeight: 700,
              fontSize: 14,
            }}>
              ✓ Transaction Signed & Submitted
            </div>
          )}
        </div>

        {/* Status card */}
        <div style={styles.statusCard}>
          <div style={{ fontSize: 13, color: "#888", letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 16 }}>Payment Status</div>
          <div style={{
            padding: "8px 16px",
            borderRadius: 20,
            background: step >= 2 ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)",
            border: `1px solid ${step >= 2 ? "rgba(59,130,246,0.3)" : "rgba(245,158,11,0.3)"}`,
            color: step >= 2 ? "#3b82f6" : "#f59e0b",
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center" as const,
            marginBottom: 16,
          }}>
            {step >= 3 ? "AWAITING CONFIRMATION" : step >= 2 ? "AWAITING PAYMENT" : "PENDING"}
          </div>
          <div style={styles.routeRow}><span style={{ color: "#888" }}>Order ID</span><span style={{ fontFamily: "monospace", fontSize: 12 }}>cv_ord_9xK4m...</span></div>
          <div style={styles.routeRow}><span style={{ color: "#888" }}>Amount</span><span>$53.49 USD</span></div>
          <div style={styles.routeRow}><span style={{ color: "#888" }}>Network</span><span>Solana</span></div>
          {step >= 2 && (
            <div style={{ ...styles.routeRow, animation: "fadeIn 0.3s ease" }}>
              <span style={{ color: "#888" }}>TX Hash</span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#ff6666" }}>4sGjM...Kx9Qp</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 8: PROCESSING ───────────────────────────────────────────
function SceneProcessing({ progress, step }: { progress: number; step: number }) {
  const statuses = [
    { label: "Transaction Signed", status: "payment_started", done: true },
    { label: "Detected on Solana", status: "awaiting_confirmation", done: step >= 1 },
    { label: "Confirming on-chain", status: "executing_order", done: step >= 2 },
    { label: "Settling to merchant", status: "optimistic_confirmed", done: step >= 3 },
  ];

  return (
    <div style={styles.centered}>
      <div style={{
        ...styles.processingCard,
        opacity: Math.min(progress * 3, 1),
      }}>
        {/* Spinner */}
        <div style={styles.spinnerContainer}>
          <div style={{
            ...styles.spinner,
            animation: step < 3 ? "spin 1s linear infinite" : "none",
            borderColor: step >= 3 ? "#22c55e" : "#ff0033",
            borderTopColor: step >= 3 ? "#22c55e" : "transparent",
          }} />
          {step >= 3 && <div style={{ fontSize: 32, color: "#22c55e", fontWeight: 700 }}>&#10003;</div>}
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
          {step >= 3 ? "Payment Confirmed" : "Processing Payment"}
        </div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 28 }}>
          Non-custodial — funds flow directly to merchant
        </div>

        {/* Steps */}
        <div style={styles.statusSteps}>
          {statuses.map((s, i) => (
            <div key={i} style={styles.statusStep}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: s.done ? "rgba(34,197,94,0.1)" : "#111",
                border: `2px solid ${s.done ? "#22c55e" : "#333"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: s.done ? "#22c55e" : "#555",
                flexShrink: 0,
                transition: "all 0.3s ease",
              }}>
                {s.done ? "✓" : i + 1}
              </div>
              <div>
                <div style={{ color: s.done ? "#fff" : "#555", fontWeight: s.done ? 600 : 400, fontSize: 14 }}>{s.label}</div>
                {s.done && <div style={{ fontSize: 11, color: "#22c55e", textTransform: "uppercase" as const }}>{s.status.replace(/_/g, " ")}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 9: COMPLETE ─────────────────────────────────────────────
function SceneComplete({ progress }: { progress: number }) {
  const scale = Math.min(progress * 2.5, 1);
  const detailOpacity = Math.max(0, (progress - 0.3) * 2.5);

  return (
    <div style={styles.centered}>
      <div style={{
        transform: `scale(${scale})`,
        opacity: scale,
        marginBottom: 24,
      }}>
        <div style={styles.completeCircle}>
          <span style={{ fontSize: 48, color: "#22c55e" }}>&#10003;</span>
        </div>
      </div>
      <h2 style={{
        fontSize: 36,
        fontWeight: 800,
        opacity: detailOpacity,
        transform: `translateY(${(1 - detailOpacity) * 20}px)`,
        marginBottom: 8,
        letterSpacing: 2,
      }}>
        Transaction Complete
      </h2>
      <p style={{ color: "#22c55e", fontSize: 14, fontWeight: 600, letterSpacing: 3, opacity: detailOpacity, marginBottom: 32, textTransform: "uppercase" as const }}>
        COMPLETED
      </p>

      <div style={{
        ...styles.completeCard,
        opacity: detailOpacity,
      }}>
        <div style={styles.routeRow}><span style={{ color: "#888" }}>Amount Paid</span><span style={{ fontWeight: 700, color: "#22c55e" }}>53.49 USDC</span></div>
        <div style={styles.routeRow}><span style={{ color: "#888" }}>Paid From</span><span>Solana — USDC</span></div>
        <div style={styles.routeRow}><span style={{ color: "#888" }}>Settled To</span><span>Merchant Wallet</span></div>
        <div style={styles.routeRow}><span style={{ color: "#888" }}>Time</span><span style={{ color: "#22c55e" }}>~2.4 seconds</span></div>
        <div style={styles.routeRow}><span style={{ color: "#888" }}>Fee</span><span>$0.80 (1.5%)</span></div>
        <div style={styles.routeRow}><span style={{ color: "#888" }}>TX</span><span style={{ fontFamily: "monospace", fontSize: 12, color: "#ff6666" }}>4sGjMvR...Kx9Qp</span></div>
      </div>

      <p style={{
        fontSize: 16,
        color: "#888",
        letterSpacing: 4,
        textTransform: "uppercase" as const,
        marginTop: 28,
        opacity: Math.max(0, (progress - 0.6) * 3),
      }}>
        Instant. Borderless. Non-Custodial.
      </p>
    </div>
  );
}

// ─── SCENE 10: DEPOSIT FLOW ────────────────────────────────────────
function SceneDepositFlow({ progress, step }: { progress: number; step: number }) {
  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        Deposit Flow — Direct to Any Wallet
      </p>
      <div style={{ display: "flex", gap: 40, alignItems: "center", opacity: Math.min(progress * 2.5, 1) }}>
        {/* Code snippet */}
        <div style={styles.codeBlock}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 12, letterSpacing: 2 }}>INTEGRATION CODE</div>
          <pre style={styles.codePre}>
{`<PayButton
  intent="Deposit to SUI"
  toChain={ChainId.SUI}
  toAddress="0xYour...Addr"
  toAmount={10}
  toToken={undefined}
  onPaymentCompleted={
    () => console.log("Done!")
  }
/>`}
          </pre>
          <div style={{ fontSize: 11, color: "#22c55e", marginTop: 12 }}>
            {step >= 1 ? "✓ 5 lines of code. That's it." : ""}
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          fontSize: 32,
          color: "#ff0033",
          opacity: step >= 1 ? 1 : 0.3,
          transition: "opacity 0.3s",
        }}>→</div>

        {/* Mini widget */}
        <div style={styles.miniWidget}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <CoinVoyageLogo size={24} glow={false} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Deposit to SUI</span>
          </div>
          <div style={{ padding: "16px", background: "#111", borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 800, textAlign: "center" as const }}>10 SUI</div>
            <div style={{ fontSize: 12, color: "#888", textAlign: "center" as const }}>~$38.50 USD</div>
          </div>
          {step >= 2 && (
            <div style={{
              display: "flex",
              flexDirection: "column" as const,
              gap: 8,
              animation: "slideUp 0.3s ease",
            }}>
              {["◎ Solana — USDC", "⟠ Ethereum — ETH", "🔵 Base — USDC"].map((o, i) => (
                <div key={i} style={{
                  padding: "10px 12px",
                  background: i === 0 && step >= 3 ? "rgba(255,0,51,0.05)" : "#111",
                  border: `1px solid ${i === 0 && step >= 3 ? "#ff0033" : "#222"}`,
                  borderRadius: 6,
                  fontSize: 13,
                }}>{o}</div>
              ))}
            </div>
          )}
          {step >= 3 && (
            <div style={{ ...styles.ctaButton, marginTop: 12, animation: "pulseGlow 2s infinite", fontSize: 13, padding: "12px" }}>
              PAY WITH WALLET
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 11: SWAP ROUTING ────────────────────────────────────────
function SceneSwapRouting({ progress, step }: { progress: number; step: number }) {
  const steps = [
    { from: "ETH", fromChain: "Ethereum", icon: "⟠", action: "Uniswap" },
    { from: "USDC", fromChain: "Ethereum", icon: "$", action: "CCTP Bridge" },
    { from: "USDC", fromChain: "Sui", icon: "💧", action: "Sui DEX" },
    { from: "SUI", fromChain: "Delivered", icon: "✓", action: "" },
  ];

  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        Automated Multi-Step Swap Routing
      </p>
      <p style={{ ...styles.sceneSubLabel, opacity: Math.min(progress * 3, 1) }}>
        ETH on Ethereum → SUI on Sui — fully automated
      </p>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: Math.min(progress * 2, 1),
        marginTop: 20,
      }}>
        {steps.map((s, i) => {
          const sp = Math.max(0, Math.min(1, (progress - i * 0.18) * 4));
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                ...styles.swapNode,
                opacity: sp,
                transform: `scale(${sp})`,
                borderColor: step >= i ? "#ff0033" : "#222",
                boxShadow: step >= i ? "0 0 20px rgba(255,0,51,0.2)" : "none",
              }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{s.from}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{s.fromChain}</div>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  opacity: Math.max(0, sp - 0.3) * 2,
                }}>
                  <div style={{ fontSize: 10, color: "#ff6666", fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap" as const }}>{s.action}</div>
                  <div style={{ fontSize: 20, color: "#ff0033" }}>→</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {step >= 3 && (
        <div style={{
          marginTop: 32,
          padding: "14px 32px",
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 8,
          animation: "slideUp 0.4s ease",
        }}>
          <span style={{ color: "#22c55e", fontWeight: 700 }}>✓ Auto-refund if any step fails</span>
          <span style={{ color: "#888" }}> — Non-custodial guarantee</span>
        </div>
      )}
    </div>
  );
}

// ─── SCENE 12: MULTI-CHAIN ─────────────────────────────────────────
function SceneMultiChain({ progress, step }: { progress: number; step: number }) {
  const chains = [
    { icon: "₿", name: "Bitcoin", color: "#f7931a" },
    { icon: "◎", name: "Solana", color: "#14f195" },
    { icon: "⟠", name: "Ethereum", color: "#627eea" },
    { icon: "🔵", name: "Base", color: "#0052ff" },
    { icon: "🔷", name: "Arbitrum", color: "#28a0f0" },
    { icon: "🟣", name: "Polygon", color: "#8247e5" },
    { icon: "🔶", name: "BNB", color: "#f0b90b" },
    { icon: "🔺", name: "Avalanche", color: "#e84142" },
    { icon: "💧", name: "Sui", color: "#6fbcf0" },
    { icon: "🔴", name: "Optimism", color: "#ff0420" },
    { icon: "◆", name: "zkSync", color: "#8c8dfc" },
    { icon: "⚡", name: "Blast", color: "#fcfc03" },
    { icon: "♦", name: "Tron", color: "#ff0013" },
  ];

  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        13 Chains. 1000+ Tokens. One Integration.
      </p>
      <div style={styles.chainGrid}>
        {chains.map((chain, i) => {
          const delay = i * 0.05;
          const cp = Math.max(0, Math.min(1, (progress - delay) * 4));
          return (
            <div key={i} style={{
              ...styles.chainCard,
              opacity: cp,
              transform: `scale(${cp}) translateY(${(1 - cp) * 15}px)`,
              borderColor: step >= 2 ? chain.color + "55" : "#1a1a1a",
              boxShadow: step >= 2 ? `0 0 12px ${chain.color}22` : "none",
            }}>
              <span style={{ fontSize: 26 }}>{chain.icon}</span>
              <span style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>{chain.name}</span>
            </div>
          );
        })}
      </div>
      <p style={{
        ...styles.sceneSubLabel,
        opacity: Math.max(0, (progress - 0.6) * 3),
        marginTop: 24,
      }}>
        BTC • SOL • EVM • SUI — All supported natively
      </p>
    </div>
  );
}

// ─── SCENE 13: ENTERPRISE ──────────────────────────────────────────
function SceneEnterprise({ progress, step }: { progress: number; step: number }) {
  const features = [
    { icon: "{ }", title: "PayButton SDK", desc: "Drop-in React component. 5 lines of code." },
    { icon: "⚡", title: "Webhooks", desc: "Real-time lifecycle events for every order." },
    { icon: "🎨", title: "Theme Engine", desc: "8 presets + 40 CSS variables. Your brand, your widget." },
    { icon: "🔐", title: "Non-Custodial", desc: "Funds flow directly from buyer to merchant." },
    { icon: "📊", title: "Analytics Dashboard", desc: "Volume, token distribution, chain performance." },
    { icon: "💱", title: "Fiat Settlement", desc: "Accept crypto, settle in USD via ACH/Wire/SEPA." },
  ];

  return (
    <div style={styles.centered}>
      <p style={{ ...styles.sceneLabel, opacity: Math.min(progress * 4, 1) }}>
        Built for Enterprise
      </p>
      <div style={styles.featureGrid}>
        {features.map((f, i) => {
          const fp = Math.max(0, Math.min(1, (progress - i * 0.1) * 4));
          return (
            <div key={i} style={{
              ...styles.featureCard,
              opacity: fp,
              transform: `translateY(${(1 - fp) * 20}px)`,
            }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          );
        })}
      </div>
      <p style={{
        fontSize: 14,
        color: "#888",
        marginTop: 24,
        opacity: Math.max(0, (progress - 0.7) * 4),
        letterSpacing: 1,
      }}>
        1.5% transaction fee • 0% offramp fee • No hidden costs
      </p>
    </div>
  );
}

// ─── SCENE 14: CLOSING CTA ─────────────────────────────────────────
function SceneClosing({ progress }: { progress: number }) {
  const titleOpacity = Math.min(progress * 3, 1);
  const ctaOpacity = Math.max(0, (progress - 0.3) * 3);
  const urlOpacity = Math.max(0, (progress - 0.55) * 3);

  return (
    <div style={styles.centered}>
      <div style={{
        opacity: titleOpacity,
        transform: `scale(${titleOpacity})`,
        marginBottom: 24,
      }}>
        <CoinVoyageLogo size={80} />
      </div>
      <h1 style={{
        fontSize: 52,
        fontWeight: 900,
        letterSpacing: 6,
        opacity: titleOpacity,
        transform: `translateY(${(1 - titleOpacity) * 30}px)`,
        marginBottom: 12,
      }}>
        CoinVoyage
      </h1>
      <p style={{
        fontSize: 18,
        color: "#888",
        opacity: titleOpacity,
        marginBottom: 32,
        letterSpacing: 3,
        textTransform: "uppercase" as const,
      }}>
        The Complete Crypto Payment Solution
      </p>
      <p style={{
        fontSize: 22,
        color: "#fff",
        opacity: ctaOpacity,
        lineHeight: 1.6,
        marginBottom: 36,
      }}>
        Accept payments from any chain.
        <br />
        Settle in your preferred asset.
        <br />
        <span style={{ color: "#ff0033", fontWeight: 700 }}>Start building today.</span>
      </p>
      <div style={{
        ...styles.ctaButton,
        opacity: ctaOpacity,
        animation: ctaOpacity > 0.5 ? "pulseGlow 2s infinite" : "none",
        padding: "18px 48px",
        fontSize: 16,
        letterSpacing: 4,
      }}>
        GET STARTED
      </div>
      <div style={{
        display: "flex",
        gap: 32,
        marginTop: 32,
        opacity: urlOpacity,
      }}>
        <span style={styles.footerLink}>coinvoyage.io</span>
        <span style={{ color: "#333" }}>|</span>
        <span style={styles.footerLink}>docs.coinvoyage.io</span>
        <span style={{ color: "#333" }}>|</span>
        <span style={styles.footerLink}>dashboard.coinvoyage.io</span>
      </div>
    </div>
  );
}

// ─── END SCREEN ─────────────────────────────────────────────────────
function EndScreen({ onReplay }: { onReplay: () => void }) {
  return (
    <div style={{ ...styles.centered, animation: "fadeIn 1s ease" }}>
      <CoinVoyageLogo size={64} />
      <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 16, marginBottom: 4, letterSpacing: 4 }}>CoinVoyage</h2>
      <p style={{ color: "#888", marginBottom: 32, fontSize: 14, letterSpacing: 2 }}>The Complete Crypto Payment Solution</p>
      <button onClick={onReplay} style={styles.playButton}>
        <span>REPLAY</span>
      </button>
    </div>
  );
}

// ─── PARTICLES ──────────────────────────────────────────────────────
function ParticleField() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 1 + Math.random() * 2,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 4,
    opacity: 0.08 + Math.random() * 0.2,
  }));
  return (
    <>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute" as const,
          left: p.left,
          top: p.top,
          width: p.size,
          height: p.size,
          borderRadius: "50%",
          backgroundColor: "#ff0033",
          opacity: p.opacity,
          animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          pointerEvents: "none" as const,
        }} />
      ))}
    </>
  );
}

// ─── ANIMATIONS ─────────────────────────────────────────────────────
const globalAnimations = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 25px rgba(255,0,51,0.4), inset 0 0 10px rgba(255,51,51,0.15); }
    50% { box-shadow: 0 0 45px rgba(255,0,51,0.6), inset 0 0 20px rgba(255,51,51,0.25); }
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes float { from { transform: translateY(0) translateX(0); } to { transform: translateY(-15px) translateX(8px); } }
  @keyframes gridMove { from { background-position: 0 0; } to { background-position: 40px 40px; } }
  @keyframes scanline { 0% { top: -5%; } 100% { top: 105%; } }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 30px rgba(255,0,51,0.3); }
    50% { box-shadow: 0 0 60px rgba(255,0,51,0.6); }
  }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`;

// ─── STYLES ─────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  viewport: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: "#030303",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#ffffff",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(255,0,51,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,51,0.02) 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
    animation: "gridMove 10s linear infinite",
    pointerEvents: "none",
  },
  bgGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 700,
    height: 700,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,0,51,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
    transition: "all 0.5s ease",
  },
  bgGlowSecondary: {
    position: "absolute",
    top: "30%",
    right: "-10%",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  scanline: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: "2px",
    background: "linear-gradient(90deg, transparent, rgba(255,0,51,0.06), transparent)",
    animation: "scanline 5s linear infinite",
    pointerEvents: "none",
    zIndex: 1,
  },
  watermark: {
    position: "absolute",
    top: 20,
    right: 24,
    fontSize: 11,
    letterSpacing: 4,
    color: "rgba(255,255,255,0.08)",
    fontWeight: 700,
    zIndex: 5,
  },
  content: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  centered: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    padding: 40,
  },

  // Pre-roll
  preTitle: { fontSize: 36, fontWeight: 800, letterSpacing: 4, marginTop: 16, marginBottom: 4 },
  preSubtitle: { fontSize: 15, color: "#ff6666", letterSpacing: 3, textTransform: "uppercase" as const, marginBottom: 8 },
  preDivider: { width: 60, height: 2, background: "linear-gradient(90deg, transparent, #ff0033, transparent)", marginBottom: 16 },
  preDesc: { fontSize: 14, color: "#888", marginBottom: 40, maxWidth: 400 },
  playButton: {
    display: "flex", alignItems: "center", gap: 12,
    background: "linear-gradient(180deg, #ff0033 0%, #aa0000 100%)",
    color: "#fff", border: "1px solid #ff3333",
    padding: "16px 40px", fontSize: 14, fontWeight: 700, letterSpacing: 3,
    cursor: "pointer", textTransform: "uppercase" as const,
    boxShadow: "0 0 30px rgba(255,0,51,0.4)",
    transition: "all 0.3s ease",
    borderRadius: 0,
  },
  playIcon: { fontSize: 16 },

  // Hero
  heroTitle: { fontSize: 60, fontWeight: 900, letterSpacing: 8, margin: 0 },
  heroTagline: { fontSize: 18, color: "#ff6666", letterSpacing: 5, textTransform: "uppercase" as const, marginTop: 12 },
  heroSubTagline: { fontSize: 16, color: "#888", letterSpacing: 6, textTransform: "uppercase" as const, marginTop: 8 },

  // Scene labels
  sceneLabel: { fontSize: 26, fontWeight: 700, letterSpacing: 1, marginBottom: 28 },
  sceneSubLabel: { fontSize: 14, color: "#888", letterSpacing: 1, marginBottom: 20 },

  // Browser frame
  browserFrame: {
    width: 720, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 12,
    overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  browserBar: {
    display: "flex", alignItems: "center", gap: 16, padding: "10px 16px",
    background: "#111", borderBottom: "1px solid #1a1a1a",
  },
  browserDots: { display: "flex", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: "50%" },
  browserUrl: {
    flex: 1, padding: "6px 12px", background: "#0a0a0a", borderRadius: 6,
    fontSize: 12, color: "#666", fontFamily: "monospace",
  },
  checkoutPage: { display: "flex", padding: 24, gap: 24 },
  checkoutLeft: { flex: 1 },
  checkoutRight: { width: 240 },
  checkoutProduct: {
    display: "flex", gap: 16, padding: 16, background: "#0f0f0f",
    border: "1px solid #1a1a1a", borderRadius: 8, marginBottom: 16,
  },
  productImage: {
    width: 64, height: 64, background: "#1a1a1a", borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  checkoutForm: { display: "flex", flexDirection: "column" as const, gap: 12 },
  formField: { textAlign: "left" as const },
  fieldLabel: { fontSize: 11, color: "#888", letterSpacing: 1, textTransform: "uppercase" as const },
  fieldInput: {
    padding: "10px 12px", background: "#0f0f0f", border: "1px solid #1a1a1a",
    borderRadius: 4, fontSize: 13, color: "#fff", minHeight: 20, marginTop: 4,
  },
  orderSummary: {
    padding: 16, background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 8, marginBottom: 16,
  },
  summaryRow: {
    display: "flex", justifyContent: "space-between", fontSize: 14, color: "#ccc", marginBottom: 8,
  },
  payButtonMockup: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    padding: "14px", background: "linear-gradient(180deg, #ff0033 0%, #aa0000 100%)",
    color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 2,
    border: "1px solid #ff3333", cursor: "pointer",
  },

  // Widget modal
  widgetModal: {
    width: 400, background: "#0a0a0a", border: "1px solid #ff003322", borderRadius: 16,
    overflow: "hidden", boxShadow: "0 0 80px rgba(255,0,51,0.15), 0 20px 60px rgba(0,0,0,0.5)",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: "1px solid #1a1a1a", background: "#0f0f0f",
  },
  modalHeaderLeft: { display: "flex", alignItems: "center", gap: 12 },
  modalClose: { color: "#555", fontSize: 14, cursor: "pointer", padding: "4px 8px" },
  modalAmountBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: "1px solid #1a1a1a",
  },
  modalBody: { padding: 20 },
  chainOption: {
    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
    background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10,
    marginBottom: 8, transition: "all 0.3s ease", cursor: "pointer",
  },
  walletConnect: {
    display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
    background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 8, marginTop: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },

  // Balance grid
  balanceGrid: { display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 16 },
  balanceCard: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 8, transition: "all 0.3s ease",
  },
  scanningBar: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
    background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)",
    borderRadius: 8, marginBottom: 12,
  },
  scanningDot: {
    width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b",
    animation: "blink 1s infinite", flexShrink: 0,
  },
  bestRoute: {
    padding: 16, background: "#0a0a0a", border: "1px solid rgba(34,197,94,0.2)",
    borderRadius: 10, marginBottom: 12,
    display: "flex", flexDirection: "column" as const, gap: 8,
  },
  routeRow: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "#fff" },
  ctaButton: {
    padding: "14px", background: "linear-gradient(180deg, #ff0033 0%, #aa0000 100%)",
    color: "#fff", fontWeight: 700, textAlign: "center" as const, letterSpacing: 3,
    fontSize: 14, border: "1px solid #ff3333", borderRadius: 8, cursor: "pointer",
    textTransform: "uppercase" as const,
  },

  // Wallet prompt
  walletPrompt: {
    width: 340, padding: 24, background: "#0a0a0a", border: "1px solid #1a1a1a",
    borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  walletTxDetail: {
    padding: 16, background: "#0f0f0f", borderRadius: 10, border: "1px solid #1a1a1a",
    display: "flex", flexDirection: "column" as const, gap: 10,
  },
  statusCard: {
    width: 280, padding: 20, background: "#0a0a0a", border: "1px solid #1a1a1a",
    borderRadius: 16, display: "flex", flexDirection: "column" as const, gap: 10,
  },

  // Processing
  processingCard: {
    width: 420, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 16,
    padding: 32, textAlign: "center" as const, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  spinnerContainer: {
    position: "relative" as const, width: 64, height: 64, margin: "0 auto 24px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  spinner: {
    position: "absolute" as const, inset: 0, borderRadius: "50%",
    border: "3px solid #ff0033", borderTopColor: "transparent",
  },
  statusSteps: {
    display: "flex", flexDirection: "column" as const, gap: 14,
    textAlign: "left" as const,
  },
  statusStep: { display: "flex", alignItems: "center", gap: 12 },

  // Complete
  completeCircle: {
    width: 100, height: 100, borderRadius: "50%", border: "3px solid #22c55e",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 40px rgba(34,197,94,0.3)",
  },
  completeCard: {
    width: 380, padding: 20, background: "#0a0a0a", border: "1px solid #1a3a1a",
    borderRadius: 12, display: "flex", flexDirection: "column" as const, gap: 12,
  },

  // Code block
  codeBlock: {
    width: 320, padding: 20, background: "#0a0a0a", border: "1px solid #1a1a1a",
    borderRadius: 12, textAlign: "left" as const,
  },
  codePre: {
    margin: 0, fontSize: 13, color: "#ff6666", fontFamily: "'Geist Mono', 'Fira Code', monospace",
    lineHeight: 1.6, whiteSpace: "pre" as const, overflow: "hidden" as const,
  },
  miniWidget: {
    width: 280, padding: 20, background: "#0a0a0a", border: "1px solid #1a1a1a",
    borderRadius: 12,
  },

  // Swap nodes
  swapNode: {
    width: 100, padding: "20px 12px", background: "#0a0a0a", border: "1px solid #222",
    borderRadius: 14, display: "flex", flexDirection: "column" as const,
    alignItems: "center", gap: 6, transition: "all 0.3s ease",
  },
  routingResult: {
    marginTop: 32, padding: "14px 28px", background: "#0a0a0a", border: "1px solid #1a1a1a",
    borderRadius: 8, fontSize: 16,
  },

  // Multi-chain
  chainGrid: {
    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, maxWidth: 480,
  },
  chainCard: {
    display: "flex", flexDirection: "column" as const, alignItems: "center",
    justifyContent: "center", padding: "14px 8px", background: "#0a0a0a",
    border: "1px solid #1a1a1a", borderRadius: 12, transition: "all 0.3s ease", minWidth: 80,
  },

  // Enterprise
  featureGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 700,
  },
  featureCard: {
    padding: 20, background: "#0a0a0a", border: "1px solid #1a1a1a",
    borderRadius: 12, textAlign: "left" as const, transition: "all 0.5s ease",
  },

  // Footer
  footerLink: { fontSize: 14, color: "#666", fontFamily: "monospace", letterSpacing: 2 },

  // Progress
  progressContainer: {
    position: "absolute" as const, bottom: 0, left: 0, right: 0, zIndex: 10,
  },
  sceneIndicator: {
    display: "flex", justifyContent: "center", gap: 6, paddingBottom: 8,
  },
  sceneDot: {
    width: 5, height: 5, borderRadius: "50%", transition: "all 0.3s ease",
  },
  progressBarContainer: {
    height: 3, background: "#111",
  },
  progressBar: {
    height: "100%", background: "linear-gradient(90deg, #ff0033, #ff3366)",
    transition: "width 0.1s linear", boxShadow: "0 0 10px rgba(255,0,51,0.5)",
  },
};
