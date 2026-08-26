"use client";

import { formatEther, type Contract } from "@coti-io/coti-ethers";

export interface PlayerScore {
  address: string;
  wins: number;
  losses: number;
  draws: number;
  wonWei: bigint;
  lostWei: bigint;
}

export function emptyScore(address: string): PlayerScore {
  return {
    address,
    wins: 0,
    losses: 0,
    draws: 0,
    wonWei: BigInt(0),
    lostWei: BigInt(0),
  };
}

export async function loadLeaderboard(
  contract: Contract,
): Promise<PlayerScore[]> {
  const events = await contract.queryFilter(contract.filters.MatchSettled());
  const scores = new Map<string, PlayerScore>();

  function score(address: string) {
    const key = address.toLowerCase();
    const current = scores.get(key) ?? emptyScore(address);
    scores.set(key, current);
    return current;
  }

  for (const event of events) {
    const args = "args" in event ? event.args : undefined;
    if (!args) continue;
    const winner = String(args.winner);
    const loser = String(args.loser);
    const pot = BigInt(args.pot);
    const draw = Boolean(args.draw);

    if (draw) {
      const a = score(winner);
      a.draws += 1;
      const b = score(loser);
      b.draws += 1;
      continue;
    }
    const win = score(winner);
    win.wins += 1;
    win.wonWei += pot;
    const loss = score(loser);
    loss.losses += 1;
    loss.lostWei += pot;
  }

  return [...scores.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return Number(b.wonWei - a.wonWei);
  });
}

export function formatCoti(value: bigint) {
  const asNumber = Number(formatEther(value));
  if (!Number.isFinite(asNumber)) {
    return formatEther(value);
  }
  return asNumber.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
