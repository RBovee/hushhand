"use client";

import { useEffect, useState } from "react";
import { CONTRACT_ADDRESS } from "@/lib/constants";
import { formatCoti, loadLeaderboard, type PlayerScore } from "@/lib/leaderboard";
import { explorerAddress, getReadContract, shortAddress } from "@/lib/wallet";

export function Leaderboard() {
  const [rows, setRows] = useState<PlayerScore[]>([]);
  const [error, setError] = useState<string | null>(
    CONTRACT_ADDRESS ? null : "Contract address is not configured yet.",
  );

  useEffect(() => {
    if (!CONTRACT_ADDRESS) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void loadLeaderboard(getReadContract())
        .then((next) => {
          if (!cancelled) setRows(next);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Could not load leaderboard");
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
      <h1 className="font-serif text-4xl">Leaderboard</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        Wins and losses are public. Hands are not. The board is built from
        on-chain <code>MatchSettled</code> events.
      </p>
      {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="pb-3 font-medium">#</th>
              <th className="pb-3 font-medium">Player</th>
              <th className="pb-3 font-medium">W</th>
              <th className="pb-3 font-medium">L</th>
              <th className="pb-3 font-medium">D</th>
              <th className="pb-3 font-medium">Won</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.address} className="border-t border-line">
                <td className="py-3 text-muted">{index + 1}</td>
                <td className="py-3">
                  <a
                    className="text-gold"
                    href={explorerAddress(row.address)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddress(row.address)}
                  </a>
                </td>
                <td className="py-3">{row.wins}</td>
                <td className="py-3">{row.losses}</td>
                <td className="py-3">{row.draws}</td>
                <td className="py-3">{formatCoti(row.wonWei)} COTI</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && !error ? (
        <p className="mt-6 text-sm text-muted">No settled matches yet.</p>
      ) : null}
    </section>
  );
}
