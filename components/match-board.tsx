"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatEther } from "@coti-io/coti-ethers";
import { CONTRACT_ADDRESS, STATUS } from "@/lib/constants";
import type { PublicMatch } from "@/lib/types";
import { getReadContract, shortAddress } from "@/lib/wallet";
import { ZERO_ADDRESS } from "@/lib/zero";

export function MatchBoard() {
  const [matches, setMatches] = useState<PublicMatch[]>([]);
  const [error, setError] = useState<string | null>(
    CONTRACT_ADDRESS ? null : "Contract address is not configured yet.",
  );
  const [loading, setLoading] = useState(Boolean(CONTRACT_ADDRESS));

  const refresh = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    try {
      const contract = getReadContract();
      const ids = (await contract.getOpenMatchIds()) as bigint[];
      const rows = await Promise.all(
        ids.map(async (id) => {
          const row = await contract.getMatch(id);
          return {
            id: id.toString(),
            playerA: row.playerA as string,
            playerB: row.playerB as string,
            grossStake: BigInt(row.grossStake),
            escrowEach: BigInt(row.escrowEach),
            status: Number(row.status),
            createdAt: Number(row.createdAt),
            revealedA: Number(row.revealedA ?? 0),
            revealedB: Number(row.revealedB ?? 0),
          } satisfies PublicMatch;
        }),
      );
      setMatches(rows.filter((item) => item.status === STATUS.Open));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load matches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-3xl">Open tables</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-sm text-muted transition hover:text-gold"
        >
          Refresh
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Join with the same stake. You will not see their hand. The contract
        already holds an encrypted commitment.
      </p>
      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading tables…</p>
      ) : null}
      {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
      <ul className="mt-6 space-y-3">
        {matches.map((match) => (
          <li key={match.id}>
            <Link
              href={`/match/${match.id}`}
              className="flex items-center justify-between rounded-2xl border border-line px-4 py-4 transition hover:border-gold"
            >
              <div>
                <p className="text-sm text-gold">Table #{match.id}</p>
                <p className="mt-1 text-sm text-muted">
                  Host {shortAddress(match.playerA)}
                  {match.playerB && match.playerB !== ZERO_ADDRESS
                    ? ` vs ${shortAddress(match.playerB)}`
                    : ""}
                </p>
              </div>
              <p className="text-lg">{formatEther(match.grossStake)} COTI</p>
            </Link>
          </li>
        ))}
      </ul>
      {!loading && matches.length === 0 && !error ? (
        <p className="mt-6 text-sm text-muted">
          No open tables. Create one and wait for a challenger.
        </p>
      ) : null}
    </section>
  );
}
