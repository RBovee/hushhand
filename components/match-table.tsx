"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatEther, parseEther } from "@coti-io/coti-ethers";
import {
  CONTRACT_ADDRESS,
  HANDS,
  MOVE_CODES,
  STATUS,
  type Hand,
} from "@/lib/constants";
import type { PublicMatch } from "@/lib/types";
import {
  encryptMove,
  explorerTx,
  getReadContract,
  getWriteContract,
  shortAddress,
} from "@/lib/wallet";
import { ZERO_ADDRESS } from "@/lib/zero";
import { useWallet } from "./wallet";

export function MatchTable({ id }: { id: string }) {
  const { address, connect } = useWallet();
  const [match, setMatch] = useState<PublicMatch | null>(null);
  const [hand, setHand] = useState<Hand>("scissors");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    CONTRACT_ADDRESS ? null : "Contract address is not configured yet.",
  );
  const [tx, setTx] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    const contract = getReadContract();
    const row = await contract.getMatch(id);
    setMatch({
      id,
      playerA: row.playerA as string,
      playerB: row.playerB as string,
      grossStake: BigInt(row.grossStake),
      escrowEach: BigInt(row.escrowEach),
      status: Number(row.status),
      createdAt: Number(row.createdAt),
    });
  }, [id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh().catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load match"),
      );
    }, 0);
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function run(label: string, fn: () => Promise<string>) {
    setError(null);
    setPending(label);
    try {
      if (!address) await connect();
      const hash = await fn();
      setTx(hash);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setPending(null);
    }
  }

  async function join() {
    await run("join", async () => {
      const encrypted = await encryptMove(MOVE_CODES[hand], "joinMatch");
      const contract = await getWriteContract();
      const response = await contract.joinMatch(id, encrypted, {
        value: match?.grossStake ?? parseEther("0"),
      });
      const receipt = await response.wait();
      return receipt?.hash ?? response.hash;
    });
  }

  async function settle() {
    await run("settle", async () => {
      const contract = await getWriteContract();
      const response = await contract.settle(id);
      const receipt = await response.wait();
      return receipt?.hash ?? response.hash;
    });
  }

  async function cancel() {
    await run("cancel", async () => {
      const contract = await getWriteContract();
      const response = await contract.cancelMatch(id);
      const receipt = await response.wait();
      return receipt?.hash ?? response.hash;
    });
  }

  if (!match) {
    return (
      <p className="text-sm text-muted">
        {error ?? "Loading match…"}
      </p>
    );
  }

  const mineA = address && address.toLowerCase() === match.playerA.toLowerCase();
  const open = match.status === STATUS.Open;
  const ready = match.status === STATUS.Ready;
  const settled = match.status === STATUS.Settled;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <p className="text-sm text-gold">Table #{match.id}</p>
        <h1 className="font-serif mt-2 text-4xl">Private match</h1>
        <p className="mt-4 text-sm text-muted">
          Stake {formatEther(match.grossStake)} COTI each. Escrowed after fee:{" "}
          {formatEther(match.escrowEach)} COTI.
        </p>
        <p className="mt-2 text-sm text-muted">
          Player A {shortAddress(match.playerA)}
          {match.playerB !== ZERO_ADDRESS
            ? ` · Player B ${shortAddress(match.playerB)}`
            : " · waiting for a challenger"}
        </p>
        <p className="mt-4 text-sm text-gold">
          {open
            ? "Open — commit your encrypted hand to join"
            : ready
              ? "Both hands are locked. Settle to pay the winner without revealing gestures."
              : settled
                ? "Settled. Hands stay private. Both players received lottery tickets equal to their stake."
                : "Canceled"}
        </p>
      </section>

      {open && !mineA ? (
        <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
          <h2 className="font-serif text-2xl">Join this table</h2>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {HANDS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setHand(item.id)}
                className={`rounded-2xl border px-3 py-4 text-center transition ${
                  hand === item.id
                    ? "border-gold bg-gold/15"
                    : "border-line hover:border-gold"
                }`}
              >
                <span className="block text-2xl" aria-hidden>
                  {item.glyph}
                </span>
                <span className="mt-2 block text-sm">{item.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void join()}
            disabled={pending !== null}
            className="mt-6 w-full rounded-full bg-gold px-5 py-3 text-sm font-medium text-background disabled:opacity-60"
          >
            {pending === "join" ? "Joining…" : `Join for ${formatEther(match.grossStake)} COTI`}
          </button>
        </section>
      ) : null}

      {open && mineA ? (
        <button
          type="button"
          onClick={() => void cancel()}
          disabled={pending !== null}
          className="rounded-full border border-line px-5 py-3 text-sm text-muted hover:text-foreground disabled:opacity-60"
        >
          {pending === "cancel" ? "Canceling…" : "Cancel and recover full stake"}
        </button>
      ) : null}

      {ready ? (
        <button
          type="button"
          onClick={() => void settle()}
          disabled={pending !== null}
          className="w-full rounded-full bg-gold px-5 py-3 text-sm font-medium text-background disabled:opacity-60"
        >
          {pending === "settle" ? "Settling privately…" : "Settle match"}
        </button>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {tx ? (
        <a
          className="block text-sm text-gold"
          href={explorerTx(tx)}
          target="_blank"
          rel="noreferrer"
        >
          View transaction
        </a>
      ) : null}
      <Link href="/" className="inline-block text-sm text-muted hover:text-gold">
        Back to tables
      </Link>
    </div>
  );
}
