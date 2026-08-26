import type { Hand } from "./constants";

export interface PublicMatch {
  id: string;
  playerA: string;
  playerB: string;
  grossStake: bigint;
  escrowEach: bigint;
  status: number;
  createdAt: number;
  revealedA: number;
  revealedB: number;
  draw: boolean | null;
  winner: string | null;
  loser: string | null;
  pot: bigint | null;
}

export type { Hand };
