"use client";

import { useEffect, useState } from "react";
import { parseEther } from "@coti-io/coti-ethers";
import { DEFAULT_MIN_STAKE, HANDS, MOVE_CODES, feePercentLabel, type Hand } from "@/lib/constants";
import { formatCoti } from "@/lib/leaderboard";
import {
  assertCanSpend,
  encryptMove,
  explorerTx,
  getCotiBalance,
  getWriteContract,
  txErrorMessage,
} from "@/lib/wallet";
import { useWallet } from "./wallet";

export function CreateMatch() {
  const { address, connect } = useWallet();
  const [hand, setHand] = useState<Hand>("rock");
  const [stake, setStake] = useState(DEFAULT_MIN_STAKE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);

  const stakeValue = parseStakeInput(stake);
  const tooPoor = Boolean(
    address && balance !== null && stakeValue !== null && balance < stakeValue,
  );

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    const timeout = window.setTimeout(() => {
      void getCotiBalance(address)
        .then(setBalance)
        .catch(() => setBalance(null));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [address, pending]);

  async function submit() {
    setError(null);
    setTx(null);
    if (!address) {
      await connect();
    }
    setPending(true);
    try {
      const value = parseStakeInput(stake);
      if (value == null) {
        throw new Error("Enter a valid stake in COTI.");
      }
      if (value <= BigInt(0)) {
        throw new Error("Stake must be greater than 0.");
      }
      await assertCanSpend(value, "open a match", address);
      const encrypted = await encryptMove(MOVE_CODES[hand], "createMatch");
      const contract = await getWriteContract();
      const response = await contract.createMatch(encrypted, {
        value,
      });
      const receipt = await response.wait();
      setTx(receipt?.hash ?? response.hash);
    } catch (err) {
      setError(txErrorMessage(err, "Could not open match"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
      <h2 className="font-serif text-3xl">Open a match</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Connect your wallet, pick a hand, and stake testnet COTI. Your move is
        encrypted before it leaves the browser. A {feePercentLabel()} rake is
        reserved from each side. A win pays it to the HushHand wallet; a tie
        sends only that rake to the lottery pot, then refunds the rest. Tickets
        are odds weight, not extra COTI in the pot.
      </p>
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
      <label className="mt-6 block text-sm text-muted">
        Stake (COTI)
        <input
          value={stake}
          onChange={(event) => setStake(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-line bg-background px-4 py-3 text-foreground outline-none"
          inputMode="decimal"
        />
      </label>
      {address && balance !== null ? (
        <p className="mt-2 text-xs text-muted">
          This wallet has {formatCoti(balance)} COTI
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={pending || tooPoor}
        className="mt-6 w-full rounded-full bg-gold px-5 py-3 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-60"
      >
        {pending
          ? "Encrypting move and staking…"
          : tooPoor
            ? "Not enough COTI to create"
            : "Create match"}
      </button>
      {tooPoor && balance !== null && stakeValue !== null ? (
        <p className="mt-3 text-sm text-red-300">
          This wallet has {formatCoti(balance)} COTI. You need{" "}
          {formatCoti(stakeValue)} COTI plus a little extra for gas.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 max-w-xl text-sm break-words text-red-300">{error}</p>
      ) : null}
      {tx ? (
        <a
          className="mt-3 block text-sm text-gold"
          href={explorerTx(tx)}
          target="_blank"
          rel="noreferrer"
        >
          View transaction
        </a>
      ) : null}
    </section>
  );
}

function parseStakeInput(raw: string): bigint | null {
  try {
    const value = parseEther(raw.trim().replace(",", "."));
    if (value <= BigInt(0)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
