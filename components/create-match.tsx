"use client";

import { useState } from "react";
import { parseEther } from "@coti-io/coti-ethers";
import { DEFAULT_MIN_STAKE, HANDS, MOVE_CODES, feePercentLabel, type Hand } from "@/lib/constants";
import { encryptMove, explorerTx, getWriteContract } from "@/lib/wallet";
import { useWallet } from "./wallet";

export function CreateMatch() {
  const { address, connect } = useWallet();
  const [hand, setHand] = useState<Hand>("rock");
  const [stake, setStake] = useState(DEFAULT_MIN_STAKE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setTx(null);
    if (!address) {
      await connect();
    }
    setPending(true);
    try {
      const encrypted = await encryptMove(MOVE_CODES[hand], "createMatch");
      const contract = await getWriteContract();
      const response = await contract.createMatch(encrypted, {
        value: parseEther(stake),
      });
      const receipt = await response.wait();
      setTx(receipt?.hash ?? response.hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open match");
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
        feeds the lottery. You still get lottery tickets either way.
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
      <button
        type="button"
        onClick={() => void submit()}
        disabled={pending}
        className="mt-6 w-full rounded-full bg-gold px-5 py-3 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Encrypting move and staking…" : "Create match"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
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
