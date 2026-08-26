export const COTI_TESTNET_CHAIN_ID = 7082400;
export const COTI_TESTNET_RPC =
  process.env.NEXT_PUBLIC_COTI_RPC_URL ?? "https://testnet.coti.io/rpc";
export const COTI_EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER ?? "https://testnet.cotiscan.io";
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0xE1959DEf514227E7A53718053C3d74f92c039c00";
export const DEFAULT_FEE_BPS = Number(process.env.NEXT_PUBLIC_FEE_BPS ?? 200);
export const DEFAULT_MIN_STAKE = process.env.NEXT_PUBLIC_MIN_STAKE ?? "0.1";
export const DEFAULT_MIN_LOTTERY_POT =
  process.env.NEXT_PUBLIC_MIN_LOTTERY_POT ?? "0.05";

export function feePercentLabel(bps = DEFAULT_FEE_BPS) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

export const MOVE_CODES = {
  rock: 1,
  paper: 2,
  scissors: 3,
} as const;

export type Hand = keyof typeof MOVE_CODES;

export const HANDS: { id: Hand; label: string; glyph: string }[] = [
  { id: "rock", label: "Rock", glyph: "🪨" },
  { id: "paper", label: "Paper", glyph: "📄" },
  { id: "scissors", label: "Scissors", glyph: "✂️" },
];

export function handFromCode(code: number) {
  return HANDS.find((item) => MOVE_CODES[item.id] === code) ?? null;
}

export const STATUS = {
  None: 0,
  Open: 1,
  Ready: 2,
  Settled: 3,
  Canceled: 4,
} as const;

export const PRIVATE_RPS_ABI = [
  {
    type: "function",
    name: "createMatch",
    stateMutability: "payable",
    inputs: [
      {
        name: "move",
        type: "tuple",
        internalType: "struct itUint64",
        components: [
          { name: "ciphertext", type: "uint256" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "matchId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinMatch",
    stateMutability: "payable",
    inputs: [
      { name: "matchId", type: "uint256" },
      {
        name: "move",
        type: "tuple",
        internalType: "struct itUint64",
        components: [
          { name: "ciphertext", type: "uint256" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getOpenMatchIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getMatch",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [
      { name: "playerA", type: "address" },
      { name: "playerB", type: "address" },
      { name: "grossStake", type: "uint256" },
      { name: "escrowEach", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "createdAt", type: "uint64" },
      { name: "revealedA", type: "uint64" },
      { name: "revealedB", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "feeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "feeRecipient",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "minStake",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "lotteryPot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lotteryRound",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalTickets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "minLotteryPot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ticketsOf",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getLotteryPlayers",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "canDrawLottery",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "drawLottery",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "event",
    name: "MatchOpened",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "grossStake", type: "uint256", indexed: false },
      { name: "escrowEach", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MatchJoined",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "MatchSettled",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "loser", type: "address", indexed: true },
      { name: "pot", type: "uint256", indexed: false },
      { name: "draw", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MatchCanceled",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "HandsRevealed",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "moveA", type: "uint64", indexed: false },
      { name: "moveB", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LotteryTicketsIssued",
    inputs: [
      { name: "round", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "tickets", type: "uint256", indexed: false },
      { name: "matchId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "LotteryFunded",
    inputs: [
      { name: "round", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "matchId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "LotteryDrawn",
    inputs: [
      { name: "round", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "prize", type: "uint256", indexed: false },
      { name: "totalTickets", type: "uint256", indexed: false },
    ],
  },
] as const;
