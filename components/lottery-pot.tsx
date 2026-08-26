"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CONTRACT_ADDRESS, feePercentLabel } from "@/lib/constants";
import {
  formatTicketWeight,
  loadLottery,
  ticketOdds,
  type LotterySnapshot,
} from "@/lib/lottery";
import { getReadContract } from "@/lib/wallet";
import { formatCoti } from "@/lib/leaderboard";
import { useWallet } from "./wallet";

export function LotteryPot() {
  const { address } = useWallet();
  const [lottery, setLottery] = useState<LotterySnapshot | null>(null);
  const [error, setError] = useState<string | null>(
    CONTRACT_ADDRESS ? null : "Contract address is not configured yet.",
  );

  const refresh = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    const next = await loadLottery(getReadContract());
    setLottery(next);
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

  const mine =
    address && lottery
      ? lottery.players.find(
          (player) => player.address.toLowerCase() === address.toLowerCase(),
        )
      : undefined;

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-3xl">Draw pot</h2>
        <Link href="/lottery" className="text-sm text-gold">
          Open lottery
        </Link>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Only the {feePercentLabel()} rake from a tie goes in here — not the
        full stake. Tickets are just odds. Anyone can draw at{" "}
        {lottery ? `${formatCoti(lottery.minPot)} COTI` : "the minimum"}.
      </p>
      {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
      {lottery ? (
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted">Pot</dt>
            <dd className="mt-1 text-2xl text-gold">
              {formatCoti(lottery.pot)} COTI
            </dd>
          </div>
          <div>
            <dt className="text-muted">Your odds</dt>
            <dd className="mt-1 text-2xl">
              {ticketOdds(mine?.tickets ?? BigInt(0), lottery.totalTickets)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Your tickets</dt>
            <dd className="mt-1">
              {formatTicketWeight(mine?.tickets ?? BigInt(0))}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Round</dt>
            <dd className="mt-1">#{lottery.round.toString()}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
