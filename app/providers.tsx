"use client";

import { PayKitProvider, WalletProvider } from "@coin-voyage/paykit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "@/components/ThemeContext";
import ThemeTrigger from "@/components/ThemeTrigger";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const WalletReadyContext = createContext(false);

export function useWalletReady() {
  return useContext(WalletReadyContext);
}

function HideTrustWallet() {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const buttons = document.querySelectorAll(
        'button, [role="button"], div[class*="ConnectorButton"]'
      );

      buttons.forEach((btn) => {
        if (
          btn instanceof HTMLElement &&
          (btn.innerText.includes("Trust Wallet") ||
            btn.innerText.includes("Trust"))
        ) {
          btn.style.display = "none";
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

// Inner component that uses the theme context
function ThemedPayKitProvider({ children }: { children: React.ReactNode }) {
  const { theme, mode, customTheme, isHydrated } = useTheme();
  const apiKey = process.env.NEXT_PUBLIC_COIN_VOYAGE_API_KEY;

  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_COIN_VOYAGE_API_KEY is required");
  }

  // Wait for hydration to avoid mismatch
  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <PayKitProvider
      apiKey={apiKey}
      theme={theme}
      mode={mode}
      customTheme={customTheme}
    >
      <HideTrustWallet />
      {children}
    </PayKitProvider>
  );
}

function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ThemedPayKitProvider>
        <WalletReadyContext.Provider value={true}>
          {children}
          <ThemeTrigger />
        </WalletReadyContext.Provider>
      </ThemedPayKitProvider>
    </WalletProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {mounted ? (
          <WalletProviders>{children}</WalletProviders>
        ) : (
          <WalletReadyContext.Provider value={false}>
            {children}
          </WalletReadyContext.Provider>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
