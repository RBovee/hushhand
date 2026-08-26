import { CreateMatch } from "@/components/create-match";
import { MatchBoard } from "@/components/match-board";
import { feePercentLabel } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="py-6 md:py-10">
        <p className="mb-4 text-sm text-muted">Private Rock Paper Scissors</p>
        <h1 className="font-serif max-w-3xl text-5xl leading-[1.05] tracking-tight md:text-7xl">
          Play the hand.
          <br />
          Never show it.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Connect MetaMask on COTI Testnet, encrypt a move, and stake. A
          challenger joins with the same stake. The contract settles the winner
          without publishing either gesture.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          A {feePercentLabel()} protocol fee is taken from each create and join
          transaction and sent to the HushHand fee wallet. The rest stays in
          escrow until the match ends.
        </p>
      </section>

      <ol className="grid gap-6 md:grid-cols-3">
        {[
          {
            step: "01",
            title: "Encrypt your move",
            body: "Rock, paper, or scissors is encrypted in your browser before it hits the chain.",
          },
          {
            step: "02",
            title: "Stake and wait",
            body: "Open a table or join one at the same stake. Both deposits sit in the contract.",
          },
          {
            step: "03",
            title: "Settle privately",
            body: "MPC names a winner. Hands stay private. Wins land on the leaderboard.",
          },
        ].map((item) => (
          <li
            key={item.step}
            className="rounded-3xl border border-line bg-surface p-6"
          >
            <p className="text-xs text-gold">{item.step}</p>
            <h2 className="mt-3 font-serif text-2xl">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-2">
        <CreateMatch />
        <MatchBoard />
      </div>
    </div>
  );
}
