import type { Metadata } from "next";
import { Lottery } from "@/components/lottery";

export const metadata: Metadata = {
  title: "Lottery — HushHand",
};

export default function LotteryPage() {
  return <Lottery />;
}
