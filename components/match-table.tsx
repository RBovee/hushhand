"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatEther, parseEther, type Contract } from "@coti-io/coti-ethers";
import {
  CONTRACT_ADDRESS,
  HANDS,
  MOVE_CODES,
  STATUS,
  feePercentLabel,
  handFromCode,
  type Hand,
} from "@/lib/constants";
import type { PublicMatch } from "@/lib/types";
import {
  encryptMove,
  explorerTx,
  getReadContract,
  getWriteContract,
  shortAddress,
  walletErrorMessage,
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
    const result = await loadMatchResult(contract, id, row);
    setMatch({
      id,
      playerA: row.playerA as string,
      playerB: row.playerB as string,
      grossStake: BigInt(row.grossStake),
      escrowEach: BigInt(row.escrowEach),
      status: Number(row.status),
      createdAt: Number(row.createdAt),
      revealedA: Number(row.revealedA ?? 0),
      revealedB: Number(row.revealedB ?? 0),
      draw: result.draw,
      winner: result.winner,
      loser: result.loser,
      pot: result.pot,
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
      setError(walletErrorMessage(err));
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
              ? "Both hands are locked. Settle pays the winner, then both gestures are published."
              : settled
                ? "Settled. Lottery tickets minted."
                : "Canceled"}
        </p>
        {settled ? <MatchOutcome match={match} address={address} /> : null}
      </section>

      {settled && (match.revealedA > 0 || match.revealedB > 0) ? (
        <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
          <h2 className="font-serif text-2xl">Hands revealed</h2>
          <p className="mt-2 text-sm text-muted">
            Private until settle. Now on-chain for anyone to check.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <RevealedHand
              label={`Player A ${shortAddress(match.playerA)}`}
              code={match.revealedA}
            />
            <RevealedHand
              label={`Player B ${shortAddress(match.playerB)}`}
              code={match.revealedB}
            />
          </div>
        </section>
      ) : null}

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
          {pending === "settle" ? "Settling and revealing…" : "Settle and reveal hands"}
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

function RevealedHand({ label, code }: { label: string; code: number }) {
  const hand = handFromCode(code);
  return (
    <div className="rounded-2xl border border-line px-4 py-5 text-center">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-3xl" aria-hidden>
        {hand?.glyph ?? "?"}
      </p>
      <p className="mt-2 text-sm">{hand?.label ?? `Unknown (${code})`}</p>
    </div>
  );
}

function sameAddress(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function MatchOutcome({
  match,
  address,
}: {
  match: PublicMatch;
  address: string | null;
}) {
  const isPlayer =
    sameAddress(address, match.playerA) || sameAddress(address, match.playerB);
  const title = match.draw
    ? isPlayer
      ? "Draw"
      : "The match was a draw"
    : sameAddress(address, match.winner)
      ? "You won"
      : sameAddress(address, match.loser)
        ? "You lost"
        : match.winner
          ? `${shortAddress(match.winner)} won`
          : "Settled";
  const detail = match.draw
    ? `Each player got their escrow back. The ${feePercentLabel()} rake went to the lottery pot.`
    : match.pot != null && match.winner
      ? `${shortAddress(match.winner)} received ${formatEther(match.pot)} COTI.`
      : "Winner paid from escrow.";

  return (
    <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-5">
      <p className="font-serif text-3xl text-gold">{title}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

async function loadMatchResult(
  contract: Contract,
  id: string,
  row: {
    playerA: string;
    playerB: string;
    revealedA?: bigint | number;
    revealedB?: bigint | number;
  },
) {
  const empty = {
    draw: null as boolean | null,
    winner: null as string | null,
    loser: null as string | null,
    pot: null as bigint | null,
  };

  const events = await contract.queryFilter(
    contract.filters.MatchSettled(BigInt(id)),
  );
  const last = events.at(-1);
  const args = last && "args" in last ? last.args : undefined;
  if (args) {
    return {
      draw: Boolean(args.draw),
      winner: String(args.winner),
      loser: String(args.loser),
      pot: BigInt(args.pot),
    };
  }

  const moveA = Number(row.revealedA ?? 0);
  const moveB = Number(row.revealedB ?? 0);
  if (moveA < 1 || moveB < 1) {
    return empty;
  }
  if (moveA === moveB) {
    return { draw: true, winner: row.playerA, loser: row.playerB, pot: BigInt(0) };
  }
  const aWins = (moveA - moveB + 3) % 3 === 1;
  return {
    draw: false,
    winner: aWins ? row.playerA : row.playerB,
    loser: aWins ? row.playerB : row.playerA,
    pot: null,
  };
}
