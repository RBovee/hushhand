"use client";

import { formatEther } from "@coti-io/coti-ethers";
import { handFromCode } from "@/lib/constants";
import { clashLine, type MatchOutcome } from "@/lib/outcome";
import { shortAddress } from "@/lib/wallet";

interface MatchResultProps {
  playerA: string;
  playerB: string;
  moveA: number;
  moveB: number;
  outcome: MatchOutcome;
  viewer: string | null;
  payout: bigint;
  grossStake: bigint;
  escrowEach: bigint;
}

export function MatchResult({
  playerA,
  playerB,
  moveA,
  moveB,
  outcome,
  viewer,
  payout,
  grossStake,
  escrowEach,
}: MatchResultProps) {
  const mineA = isSame(viewer, playerA);
  const mineB = isSame(viewer, playerB);
  const headline = headlineFor(outcome, mineA, mineB);
  const line = clashLine(moveA, moveB);
  const draw = outcome === "draw";
  const left =
    outcome === "b"
      ? { address: playerB, move: moveB, you: mineB }
      : { address: playerA, move: moveA, you: mineA };
  const right =
    outcome === "b"
      ? { address: playerA, move: moveA, you: mineA }
      : { address: playerB, move: moveB, you: mineB };

  return (
    <section className="match-result overflow-hidden rounded-3xl border border-line bg-surface p-6 md:p-8">
      <p className="text-center text-xs tracking-[0.25em] text-gold uppercase">
        Result
      </p>
      <h2
        className={`font-serif mt-3 text-center text-4xl md:text-6xl ${
          headline.tone === "win"
            ? "text-ok"
            : headline.tone === "loss"
              ? "text-loss"
              : "text-gold"
        }`}
      >
        {headline.title}
      </h2>
      {line ? (
        <p className="mt-3 text-center text-lg text-foreground">{line}</p>
      ) : null}
      <p className="mt-2 text-center text-sm text-muted">{headline.sub}</p>

      <div className="mt-10 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <Duelist
          address={left.address}
          move={left.move}
          you={left.you}
          role={draw ? "draw" : "winner"}
        />
        <div className="match-clash flex flex-col items-center justify-center py-2">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full border text-2xl ${
              draw
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-line bg-background text-gold"
            }`}
            aria-hidden
          >
            {draw ? "=" : "⚔"}
          </span>
          <span className="mt-2 text-xs tracking-[0.2em] text-muted uppercase">
            {draw ? "draw" : "defeats"}
          </span>
        </div>
        <Duelist
          address={right.address}
          move={right.move}
          you={right.you}
          role={draw ? "draw" : "loser"}
        />
      </div>

      {payout > BigInt(0) && !draw ? (
        <p className="mt-8 text-center text-sm text-gold">
          {formatEther(payout)} COTI to the winner
        </p>
      ) : null}
      {draw && grossStake > BigInt(0) ? (
        <p className="mt-8 text-center text-sm text-gold">
          Each staked {formatEther(grossStake)} COTI. Each was refunded{" "}
          {formatEther(escrowEach)} COTI.{" "}
          {formatEther((grossStake - escrowEach) * BigInt(2))} COTI went into
          the lottery pot — not the full stake.
        </p>
      ) : null}
    </section>
  );
}

function Duelist({
  address,
  move,
  you,
  role,
}: {
  address: string;
  move: number;
  you: boolean;
  role: "winner" | "loser" | "draw";
}) {
  const hand = handFromCode(move);
  return (
    <div
      className={`match-duelist rounded-3xl border px-4 py-6 text-center ${
        role === "winner"
          ? "match-duelist-win border-gold bg-gold/10"
          : role === "loser"
            ? "match-duelist-lose border-line"
            : "border-gold/40 bg-gold/5"
      }`}
    >
      <p className="text-xs tracking-wide text-muted uppercase">
        {you ? "You" : shortAddress(address)}
        {role === "winner" ? " · winner" : ""}
      </p>
      <p className="mt-4 text-6xl md:text-7xl" aria-hidden>
        {hand?.glyph ?? "?"}
      </p>
      <p className="mt-3 font-serif text-2xl">{hand?.label ?? "Hidden"}</p>
    </div>
  );
}

function headlineFor(
  outcome: MatchOutcome,
  mineA: boolean,
  mineB: boolean,
): { title: string; sub: string; tone: "win" | "loss" | "draw" } {
  if (outcome === "draw") {
    return {
      title: "Draw",
      sub: "Your stake is not in the pot. Only the rake is.",
      tone: "draw",
    };
  }
  const aWon = outcome === "a";
  if (mineA || mineB) {
    const won = (aWon && mineA) || (!aWon && mineB);
    return won
      ? { title: "You win", sub: "The other hand never saw yours coming.", tone: "win" }
      : { title: "You lose", sub: "Their hand stayed hidden until now.", tone: "loss" };
  }
  return {
    title: aWon ? "Player A wins" : "Player B wins",
    sub: "Hands were private until settle.",
    tone: "win",
  };
}

function isSame(left: string | null, right: string) {
  return Boolean(left && left.toLowerCase() === right.toLowerCase());
}
