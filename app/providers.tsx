"use client";

import { PayKitProvider, WalletProvider } from "@coin-voyage/paykit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
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

interface ApiKeyContextType {
  apiKey: string;
  secretKey: string;
  setApiKey: (key: string) => void;
  setSecretKey: (key: string) => void;
  isAuthenticated: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType>({
  apiKey: "",
  secretKey: "",
  setApiKey: () => {},
  setSecretKey: () => {},
  isAuthenticated: false,
});

export function useApiKeys() {
  return useContext(ApiKeyContext);
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
  const { apiKey } = useApiKeys();

  // Wait for hydration to avoid mismatch
  if (!isHydrated) {
    return <>{children}</>;
  }

  if (!apiKey) {
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

function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [secretKey, setSecretKeyState] = useState("");

  useEffect(() => {
    const storedApiKey = localStorage.getItem("cv_api_key") || process.env.NEXT_PUBLIC_COIN_VOYAGE_API_KEY || "";
    const storedSecretKey = localStorage.getItem("cv_secret_key") || "";
    setApiKeyState(storedApiKey);
    setSecretKeyState(storedSecretKey);
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem("cv_api_key", key);
    } else {
      localStorage.removeItem("cv_api_key");
    }
  }, []);

  const setSecretKey = useCallback((key: string) => {
    setSecretKeyState(key);
    if (key) {
      localStorage.setItem("cv_secret_key", key);
    } else {
      localStorage.removeItem("cv_secret_key");
    }
  }, []);

  return (
    <ApiKeyContext.Provider
      value={{
        apiKey,
        secretKey,
        setApiKey,
        setSecretKey,
        isAuthenticated: !!apiKey && !!secretKey,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
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
        <ApiKeyProvider>
          {mounted ? (
            <WalletProviders>{children}</WalletProviders>
          ) : (
            <WalletReadyContext.Provider value={false}>
              {children}
            </WalletReadyContext.Provider>
          )}
        </ApiKeyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
