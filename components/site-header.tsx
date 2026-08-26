"use client";

import Link from "next/link";
import { ConnectButton } from "./wallet";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="text-sm tracking-[0.2em] text-gold uppercase">
        HushHand
      </Link>
      <nav className="flex items-center gap-5">
        <Link
          href="/"
          className="text-sm text-muted transition hover:text-foreground"
        >
          Tables
        </Link>
        <Link
          href="/lottery"
          className="text-sm text-muted transition hover:text-foreground"
        >
          Lottery
        </Link>
        <Link
          href="/leaderboard"
          className="text-sm text-muted transition hover:text-foreground"
        >
          Leaderboard
        </Link>
        <ConnectButton />
      </nav>
    </header>
  );
}
