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
}

export type { Hand };
