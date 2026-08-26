"use client";

import Link from "next/link";
import { X_HANDLE, X_PROFILE_URL } from "@/lib/constants";
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
        <a
          href={X_PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={`X profile @${X_HANDLE}`}
          className="flex h-8 w-8 items-center justify-center text-muted transition hover:text-gold"
        >
          <XLogo />
        </a>
        <ConnectButton />
      </nav>
    </header>
  );
}

function XLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[1.05rem] w-[1.05rem] fill-current"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}
