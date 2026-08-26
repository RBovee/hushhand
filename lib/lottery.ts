"use client";

import { formatEther, type Contract } from "@coti-io/coti-ethers";
import { formatCoti } from "./leaderboard";

export interface LotterySnapshot {
  pot: bigint;
  round: bigint;
  totalTickets: bigint;
  minPot: bigint;
  canDraw: boolean;
  owner: string;
  players: { address: string; tickets: bigint }[];
}

export interface LotteryDraw {
  round: string;
  winner: string;
  prize: bigint;
  totalTickets: bigint;
}

export interface LotteryFunding {
  round: string;
  matchId: string;
  amount: bigint;
}

export async function loadLottery(
  contract: Contract,
): Promise<LotterySnapshot> {
  const [pot, round, totalTickets, minPot, canDraw, owner, addresses] =
    await Promise.all([
      contract.lotteryPot() as Promise<bigint>,
      contract.lotteryRound() as Promise<bigint>,
      contract.totalTickets() as Promise<bigint>,
      contract.minLotteryPot() as Promise<bigint>,
      contract.canDrawLottery() as Promise<boolean>,
      contract.owner() as Promise<string>,
      contract.getLotteryPlayers() as Promise<string[]>,
    ]);

  const players = await Promise.all(
    addresses.map(async (address) => ({
      address,
      tickets: BigInt(await contract.ticketsOf(address)),
    })),
  );

  players.sort((a, b) => {
    if (b.tickets === a.tickets) return 0;
    return b.tickets > a.tickets ? 1 : -1;
  });

  return {
    pot: BigInt(pot),
    round: BigInt(round),
    totalTickets: BigInt(totalTickets),
    minPot: BigInt(minPot),
    canDraw: Boolean(canDraw),
    owner,
    players,
  };
}

export async function loadLotteryHistory(
  contract: Contract,
): Promise<LotteryDraw[]> {
  const events = await contract.queryFilter(contract.filters.LotteryDrawn());
  const draws: LotteryDraw[] = [];
  for (const event of events) {
    const args = "args" in event ? event.args : undefined;
    if (!args) continue;
    draws.push({
      round: String(args.round),
      winner: String(args.winner),
      prize: BigInt(args.prize),
      totalTickets: BigInt(args.totalTickets),
    });
  }
  return draws.reverse();
}

export async function loadLotteryFunding(
  contract: Contract,
): Promise<LotteryFunding[]> {
  const events = await contract.queryFilter(contract.filters.LotteryFunded());
  const rows: LotteryFunding[] = [];
  for (const event of events) {
    const args = "args" in event ? event.args : undefined;
    if (!args) continue;
    rows.push({
      round: String(args.round),
      matchId: String(args.matchId),
      amount: BigInt(args.amount),
    });
  }
  return rows.reverse();
}

export function ticketOdds(tickets: bigint, total: bigint) {
  if (total === BigInt(0) || tickets === BigInt(0)) {
    return "0%";
  }
  const bps = Number((tickets * BigInt(10_000)) / total);
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

export function formatTicketWeight(value: bigint) {
  return `${formatCoti(value)} COTI`;
}

export function formatPot(value: bigint) {
  return `${formatEther(value)} COTI`;
}
