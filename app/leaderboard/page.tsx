import type { Metadata } from "next";
import { Leaderboard } from "@/components/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard — HushHand",
};

export default function LeaderboardPage() {
  return <Leaderboard />;
}
