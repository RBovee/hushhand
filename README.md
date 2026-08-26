# HushHand

Private rock-paper-scissors on [COTI Testnet](https://testnet.cotiscan.io). Stake native testnet COTI, encrypt your move in the browser, and let the contract name a winner without publishing either hand.

This is a separate product from [HushDeal](https://hushdeal.vercel.app). HushDeal keeps a wallet-free RPS playground. HushHand is the matchmaking table with wallets, escrow, a leaderboard, and a protocol fee.

> Testnet only. Not a real-money casino.

## How a match works

1. Connect MetaMask to COTI Testnet (`7082400`) and complete AES onboarding.
2. Create a table: pick rock / paper / scissors and stake COTI. The move is encrypted with `encryptValue` against the contract function selector, then stored as COTI private state.
3. A second wallet joins with the **same** stake and its own encrypted move.
4. Anyone can call `settle`. MPC compares the hands with `(a - b + 3) % 3 == 1` (encoding rock=1, paper=2, scissors=3). Gestures are never decrypted. Only a winner/draw flag is revealed so the contract can pay.

## Protocol fee

On **create** and **join**, the contract takes `feeBps` of `msg.value` (default **2%**, max 5%) and sends it immediately to `FEE_RECIPIENT`. The remainder is escrowed.

- Winner receives `2 × escrow`.
- Draw refunds each player’s escrow.
- Cancel refunds the creator’s escrow. The fee already sent is not returned.

Set `FEE_RECIPIENT` to **your** wallet before deploying.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in:

| Variable | Purpose |
| --- | --- |
| `DEPLOYER_PRIVATE_KEY` | Wallet that deploys `PrivateRps` (must have testnet COTI) |
| `FEE_RECIPIENT` | Your wallet that receives the 2% fee |
| `FEE_BPS` | `200` = 2% |
| `MIN_STAKE` | Minimum native COTI per side, e.g. `0.1` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Set after deploy |

```bash
npm run deploy:rps
```

Copy the printed address into `.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS`, then:

```bash
npm run dev
```

Get testnet COTI from the COTI Discord faucet. Add COTI Testnet in MetaMask if it is missing (RPC `https://testnet.coti.io/rpc`, chain id `7082400`).

## Stack

- Next.js App Router + Tailwind
- MetaMask via `@coti-io/coti-ethers` (`BrowserProvider`, `encryptValue`, `generateOrRecoverAes`)
- `PrivateRps.sol` using `@coti-io/coti-contracts` (`MpcCore.validateCiphertext` → `offBoardCombined` → `onBoard` + compare)

## Leaderboard

`/leaderboard` aggregates public `MatchSettled` events: wins, losses, draws, and COTI won. Hands are not on the board.
