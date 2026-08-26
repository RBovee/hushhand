"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTRACT_ADDRESS, feePercentLabel } from "@/lib/constants";
import { formatCoti } from "@/lib/leaderboard";
import {
  formatTicketWeight,
  loadLottery,
  loadLotteryFunding,
  loadLotteryHistory,
  ticketOdds,
  type LotteryDraw,
  type LotteryFunding,
  type LotterySnapshot,
} from "@/lib/lottery";
import {
  explorerAddress,
  explorerTx,
  getReadContract,
  getWriteContract,
  shortAddress,
  txErrorMessage,
} from "@/lib/wallet";
import { useWallet } from "./wallet";

export function Lottery() {
  const { address, connect } = useWallet();
  const [lottery, setLottery] = useState<LotterySnapshot | null>(null);
  const [history, setHistory] = useState<LotteryDraw[]>([]);
  const [funding, setFunding] = useState<LotteryFunding[]>([]);
  const [pending, setPending] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    CONTRACT_ADDRESS ? null : "Contract address is not configured yet.",
  );

  const refresh = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    const contract = getReadContract();
    const [snapshot, draws, funded] = await Promise.all([
      loadLottery(contract),
      loadLotteryHistory(contract),
      loadLotteryFunding(contract),
    ]);
    setLottery(snapshot);
    setHistory(draws);
    setFunding(funded);
    setError(null);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh().catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load lottery"),
      );
    }, 0);
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function draw() {
    setError(null);
    setTx(null);
    setPending(true);
    try {
      if (!address) await connect();
      const contract = await getWriteContract();
      const response = await contract.drawLottery();
      const receipt = await response.wait();
      setTx(receipt?.hash ?? response.hash);
      await refresh();
    } catch (err) {
      setError(txErrorMessage(err, "Could not draw lottery"));
    } finally {
      setPending(false);
    }
  }

  const isOwner = Boolean(
    address && lottery && address.toLowerCase() === lottery.owner.toLowerCase(),
  );
  const mine = lottery?.players.find(
    (player) => address && player.address.toLowerCase() === address.toLowerCase(),
  );
  const canDraw =
    lottery != null &&
    lottery.pot > BigInt(0) &&
    lottery.totalTickets > BigInt(0) &&
    (lottery.canDraw || isOwner);
  const roundFunding = lottery
    ? funding.filter((row) => row.round === lottery.round.toString())
    : funding;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <p className="text-sm text-gold">
          Round {lottery ? `#${lottery.round.toString()}` : "—"}
        </p>
        <h1 className="font-serif mt-2 text-4xl">Stake-weighted lottery</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          A {feePercentLabel()} rake is reserved from each stake. A winner pays
          that rake to the HushHand fee wallet. A tie puts that same rake into
          this pot — not the full stake. After a tie, each player is refunded
          their escrow. The names below show odds weight from what you staked,
          not coins sitting here. When the pot reaches{" "}
          {lottery ? `${formatCoti(lottery.minPot)} COTI` : "the minimum"},
          anyone can draw.
        </p>
        {lottery && lottery.pot < lottery.minPot ? (
          <p className="mt-3 text-sm text-gold">
            {formatCoti(lottery.minPot - lottery.pot)} COTI more from ties
            until anyone can draw.
          </p>
        ) : null}
        {lottery ? (
          <dl className="mt-8 grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted">Pot (rake only)</dt>
              <dd className="mt-2 font-serif text-4xl text-gold">
                {formatCoti(lottery.pot)} COTI
              </dd>
              <p className="mt-2 text-xs text-muted">
                Stakes themselves are not in this pot.
              </p>
            </div>
            <div>
              <dt className="text-sm text-muted">Your odds</dt>
              <dd className="mt-2 font-serif text-4xl">
                {ticketOdds(mine?.tickets ?? BigInt(0), lottery.totalTickets)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Odds weight</dt>
              <dd className="mt-2 text-2xl">
                {formatTicketWeight(mine?.tickets ?? BigInt(0))}
              </dd>
            </div>
          </dl>
        ) : null}
        <button
          type="button"
          onClick={() => void draw()}
          disabled={pending || !canDraw}
          className="mt-8 rounded-full bg-gold px-6 py-3 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending
            ? "Drawing…"
            : lottery?.canDraw
              ? "Draw the pot"
              : isOwner
                ? "Draw early (owner)"
                : "Pot still filling"}
        </button>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        {tx ? (
          <a
            className="mt-4 block text-sm text-gold"
            href={explorerTx(tx)}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        ) : null}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <h2 className="font-serif text-2xl">This round</h2>
        <p className="mt-2 text-sm text-muted">
          These figures are ticket weight for odds. They are not the pot, and
          they were not added to it.
        </p>
        {lottery && lottery.players.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            No tickets yet. Settle a match to mint the first lots.
          </p>
        ) : null}
        <ul className="mt-6 space-y-3">
          {lottery?.players.map((player) => {
            const you =
              address &&
              player.address.toLowerCase() === address.toLowerCase();
            return (
              <li
                key={player.address}
                className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm"
              >
                <a
                  className="text-gold"
                  href={explorerAddress(player.address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddress(player.address)}
                  {you ? " · you" : ""}
                </a>
                <span>
                  {ticketOdds(player.tickets, lottery.totalTickets)} ·{" "}
                  {formatTicketWeight(player.tickets)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <h2 className="font-serif text-2xl">Ties that filled this pot</h2>
        <p className="mt-2 text-sm text-muted">
          Only the {feePercentLabel()} rake from a tie is added. The rest of
          each stake is refunded to the players.
        </p>
        {roundFunding.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No ties have funded the pot yet.</p>
        ) : (
          <>
            {roundFunding.some((row) => row.grossEach > BigInt(0)) ? (
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-line px-4 py-3">
                  <dt className="text-xs text-muted">Staked in those ties</dt>
                  <dd className="mt-1 text-lg">
                    {formatCoti(
                      roundFunding.reduce(
                        (sum, row) => sum + row.grossEach * BigInt(2),
                        BigInt(0),
                      ),
                    )}{" "}
                    COTI
                  </dd>
                  <p className="mt-1 text-xs text-muted">Refunded, not in the pot</p>
                </div>
                <div className="rounded-2xl border border-line px-4 py-3">
                  <dt className="text-xs text-muted">Refunded to players</dt>
                  <dd className="mt-1 text-lg">
                    {formatCoti(
                      roundFunding.reduce(
                        (sum, row) => sum + row.refundedEach * BigInt(2),
                        BigInt(0),
                      ),
                    )}{" "}
                    COTI
                  </dd>
                </div>
                <div className="rounded-2xl border border-gold/40 bg-gold/5 px-4 py-3">
                  <dt className="text-xs text-muted">Added to this pot</dt>
                  <dd className="mt-1 text-lg text-gold">
                    {formatCoti(
                      roundFunding.reduce((sum, row) => sum + row.amount, BigInt(0)),
                    )}{" "}
                    COTI
                  </dd>
                  <p className="mt-1 text-xs text-muted">
                    {feePercentLabel()} rake only
                  </p>
                </div>
              </dl>
            ) : null}
            <ul className="mt-6 space-y-3">
            {roundFunding.map((row) => (
              <li
                key={`${row.round}-${row.matchId}`}
                className="rounded-2xl border border-line px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span>Table #{row.matchId}</span>
                  <span className="text-gold">
                    +{formatCoti(row.amount)} COTI to pot
                  </span>
                </div>
                {row.grossEach > BigInt(0) ? (
                  <p className="mt-2 text-xs text-muted">
                    Each staked {formatCoti(row.grossEach)} COTI. Each was
                    refunded {formatCoti(row.refundedEach)} COTI. That stake is
                    ticket weight for odds — it is not sitting in the pot.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          </>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <h2 className="font-serif text-2xl">Past draws</h2>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No lottery has been drawn yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {history.map((draw) => (
              <li
                key={draw.round}
                className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm"
              >
                <span>
                  Round #{draw.round} ·{" "}
                  <a
                    className="text-gold"
                    href={explorerAddress(draw.winner)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddress(draw.winner)}
                  </a>
                </span>
                <span>{formatCoti(draw.prize)} COTI</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
