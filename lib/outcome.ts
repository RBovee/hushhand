import { handFromCode, type Hand } from "./constants";

export type MatchOutcome = "a" | "b" | "draw";

export function outcomeFromHands(moveA: number, moveB: number): MatchOutcome | null {
  if (moveA < 1 || moveB < 1) {
    return null;
  }
  if (moveA === moveB) {
    return "draw";
  }
  return (moveA - moveB + 3) % 3 === 1 ? "a" : "b";
}

export function clashLine(moveA: number, moveB: number): string | null {
  const a = handFromCode(moveA);
  const b = handFromCode(moveB);
  if (!a || !b) {
    return null;
  }
  if (a.id === b.id) {
    return `Two ${a.label.toLowerCase()}s. The pot splits.`;
  }
  const winner = outcomeFromHands(moveA, moveB);
  const winHand = winner === "a" ? a : b;
  const loseHand = winner === "a" ? b : a;
  return verbLine(winHand.id, loseHand.id);
}

function verbLine(winner: Hand, loser: Hand) {
  if (winner === "rock" && loser === "scissors") {
    return "Rock crushes Scissors";
  }
  if (winner === "scissors" && loser === "paper") {
    return "Scissors cut Paper";
  }
  if (winner === "paper" && loser === "rock") {
    return "Paper covers Rock";
  }
  return `${winner} beats ${loser}`;
}
