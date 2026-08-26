"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  connectWallet,
  getEthereum,
  hasInjectedWallet,
  isMobileDevice,
  openInMetaMaskApp,
  shortAddress,
  walletErrorMessage,
} from "@/lib/wallet";

interface WalletState {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let provider: ReturnType<typeof getEthereum>;
    try {
      provider = getEthereum();
    } catch {
      return;
    }
    void provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (Array.isArray(accounts) && typeof accounts[0] === "string") {
          setAddress(accounts[0]);
        }
      })
      .catch(() => {
        // Ignore; user can tap Connect.
      });
    if (!provider.on) return;
    const handler = (...args: unknown[]) => {
      const accounts = Array.isArray(args[0]) ? (args[0] as string[]) : [];
      setAddress(accounts[0] ?? null);
    };
    provider.on("accountsChanged", handler);
    return () => {
      provider.removeListener?.("accountsChanged", handler);
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const next = await connectWallet();
      setAddress(next);
    } catch (err) {
      setError(walletErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  const value = useMemo(
    () => ({ address, connecting, error, connect }),
    [address, connecting, error, connect],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}

export function ConnectButton() {
  const { address, connecting, connect, error } = useWallet();
  const [needsMetaMaskApp, setNeedsMetaMaskApp] = useState(false);

  useEffect(() => {
    setNeedsMetaMaskApp(isMobileDevice() && !hasInjectedWallet());
  }, []);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          if (needsMetaMaskApp) {
            openInMetaMaskApp();
            return;
          }
          void connect();
        }}
        disabled={connecting}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:bg-gold disabled:opacity-60"
      >
        {connecting
          ? "Connecting…"
          : address
            ? shortAddress(address)
            : needsMetaMaskApp
              ? "Open in MetaMask"
              : "Connect wallet"}
      </button>
      {needsMetaMaskApp && !address ? (
        <p className="max-w-[14rem] text-right text-xs text-muted">
          Phone browsers have no wallet. This opens HushHand inside MetaMask.
        </p>
      ) : null}
      {error ? (
        <p className="max-w-xs text-right text-xs text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
