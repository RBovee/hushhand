# HushHand

Private rock-paper-scissors on [COTI Testnet](https://testnet.cotiscan.io). Stake native testnet COTI, encrypt your move in the browser, and let the contract name a winner without publishing either hand.

This is a separate product from [HushDeal](https://hushdeal.vercel.app). HushDeal keeps a wallet-free RPS playground. HushHand is the matchmaking table with wallets, escrow, a leaderboard, and a stake-weighted lottery.

> Testnet only. Not a real-money casino.

Live contract on COTI Testnet: [`0x6eB0F38d36fcBD7fB1cd148413EA32F119D7a246`](https://testnet.cotiscan.io/address/0x6eB0F38d36fcBD7fB1cd148413EA32F119D7a246). Win rake goes to [`0x400Ad4402a2Eee2ecE0894dF6c4742BAd5a2f06a`](https://testnet.cotiscan.io/address/0x400Ad4402a2Eee2ecE0894dF6c4742BAd5a2f06a).

## How a match works

1. Connect MetaMask to COTI Testnet (`7082400`) and complete AES onboarding.
2. Create a table: pick rock / paper / scissors and stake COTI. The move is encrypted with `encryptValue` against the contract function selector, then stored as COTI private state.
3. A second wallet joins with the **same** stake and its own encrypted move.
4. Anyone can call `settle`. MPC compares the hands with `(a - b + 3) % 3 == 1` (encoding rock=1, paper=2, scissors=3). Gestures are never decrypted. Only a winner/draw flag is revealed so the contract can pay.

## Protocol fee and lottery

A `feeBps` rake (default **2%**, max 5%) is **reserved** from each stake and held in the contract until settle. It is not taken on create/join.

- **Win:** both rakes go to `FEE_RECIPIENT`. Winner receives `2 × escrow`.
- **Draw:** both rakes go into the **lottery pot**. Each player gets their escrow back.
- **Cancel:** full stake is refunded. No rake, no tickets.

Every **settled** game (win or draw) mints lottery tickets equal to that player’s stake. Odds are stake-weighted. Anyone can call `drawLottery` once the pot is at least `MIN_LOTTERY_POT` (default 0.05 COTI). The owner can draw earlier. Randomness comes from COTI `MpcCore.rand64()`. After a draw, the round resets and ticket weights start again.

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
| `FEE_RECIPIENT` | Your wallet that receives the win rake |
| `FEE_BPS` | `200` = 2% |
| `MIN_STAKE` | Minimum native COTI per side, e.g. `0.1` |
| `MIN_LOTTERY_POT` | Public draw allowed at this pot size, e.g. `0.05` |
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

`/leaderboard` aggregates public `MatchSettled` events: wins, losses, draws, and COTI won. Hands are not on the board. `/lottery` shows the live pot, ticket weights, and past jackpots.
