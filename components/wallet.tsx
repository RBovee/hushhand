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
import { connectWallet, shortAddress } from "@/lib/wallet";

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
    const ethereum = (
      window as Window & {
        ethereum?: {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
          on?: (event: string, handler: (accounts: string[]) => void) => void;
          removeListener?: (event: string, handler: (accounts: string[]) => void) => void;
        };
      }
    ).ethereum;
    if (!ethereum?.on) return;
    const handler = (accounts: string[]) => {
      setAddress(accounts[0] ?? null);
    };
    ethereum.on("accountsChanged", handler);
    return () => {
      ethereum.removeListener?.("accountsChanged", handler);
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const next = await connectWallet();
      setAddress(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
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
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void connect()}
        disabled={connecting}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:bg-gold disabled:opacity-60"
      >
        {connecting
          ? "Connecting…"
          : address
            ? shortAddress(address)
            : "Connect wallet"}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
