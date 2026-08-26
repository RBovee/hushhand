"use client";

import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  formatEther,
  type JsonRpcSigner,
} from "@coti-io/coti-ethers";
import {
  CONTRACT_ADDRESS,
  COTI_EXPLORER,
  COTI_TESTNET_CHAIN_ID,
  COTI_TESTNET_RPC,
  PRIVATE_RPS_ABI,
} from "./constants";

export interface EthereumProvider {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
}

const COTI_CHAIN = {
  chainId: `0x${COTI_TESTNET_CHAIN_ID.toString(16)}`,
  chainName: "COTI Testnet",
  nativeCurrency: { name: "COTI", symbol: "COTI", decimals: 18 },
  rpcUrls: [COTI_TESTNET_RPC],
  blockExplorerUrls: [COTI_EXPLORER],
};

const AES_STORAGE_PREFIX = "hushhand.aes.";
const GAS_HEADROOM = BigInt("2000000000000000"); // 0.002 COTI

export function explorerTx(hash: string) {
  return `${COTI_EXPLORER}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${COTI_EXPLORER}/address/${address}`;
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function walletErrorMessage(err: unknown): string {
  return txErrorMessage(err, "Could not connect");
}

export function txErrorMessage(
  err: unknown,
  fallback = "Transaction failed",
): string {
  const code = walletErrorCode(err);
  if (code === 4001) {
    return fallback === "Could not connect"
      ? "Connection rejected in MetaMask."
      : "Transaction rejected in MetaMask.";
  }
  const text = [
    collectErrorText(err),
    err instanceof Error ? err.stack ?? "" : "",
    safeErrorString(err),
  ].join("\n");
  const lower = text.toLowerCase();
  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    lower.includes("exceeds the balance") ||
    lower.includes("exceeds balance") ||
    (lower.includes(" have ") && lower.includes(" want "))
  ) {
    return "Not enough testnet COTI in this wallet for the stake plus gas.";
  }
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("action_rejected")
  ) {
    return "Transaction rejected in MetaMask.";
  }
  if (err && typeof err === "object" && "shortMessage" in err) {
    const short = (err as { shortMessage?: string }).shortMessage;
    if (short && !looksLikeRawDump(short)) {
      return short;
    }
  }
  const first = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !looksLikeRawDump(line));
  if (first && !looksLikeRawDump(first)) {
    return first;
  }
  return fallback;
}

export async function getCotiBalance(address: string): Promise<bigint> {
  const provider = new JsonRpcProvider(COTI_TESTNET_RPC, COTI_TESTNET_CHAIN_ID);
  return BigInt(await provider.getBalance(address));
}

export async function assertCanSpend(
  needed: bigint,
  action = "join",
  from?: string | null,
): Promise<void> {
  let address = from ?? "";
  if (!address) {
    const signer = await getSigner();
    address = await signer.getAddress();
  }
  const balance = await getCotiBalance(address);
  const required = needed + GAS_HEADROOM;
  if (balance >= required) {
    return;
  }
  const have = formatCotiAmount(balance);
  const stake = formatCotiAmount(needed);
  if (balance < needed) {
    throw new Error(
      `Not enough testnet COTI to ${action}. This wallet has ${have} COTI; you need ${stake} COTI plus a little extra for gas.`,
    );
  }
  throw new Error(
    `This wallet has ${have} COTI, enough for the ${stake} COTI stake but not the gas on top. Add a little more testnet COTI and try again.`,
  );
}

export function getEthereum(): EthereumProvider {
  const injected = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!injected) {
    throw new Error("Install MetaMask to play HushHand");
  }
  if (Array.isArray(injected.providers) && injected.providers.length > 0) {
    return injected.providers.find((provider) => provider.isMetaMask) ?? injected;
  }
  return injected;
}

export async function connectWallet(): Promise<string> {
  const ethereum = getEthereum();
  await ethereum.request({ method: "eth_requestAccounts" });
  await ensureCotiChain(ethereum);

  const provider = new BrowserProvider(ethereum, COTI_TESTNET_CHAIN_ID);
  const signer = await provider.getSigner();
  await ensureAesKey(signer);
  return signer.getAddress();
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const ethereum = getEthereum();
  await ensureCotiChain(ethereum);
  const provider = new BrowserProvider(ethereum, COTI_TESTNET_CHAIN_ID);
  const signer = await provider.getSigner();
  await ensureAesKey(signer);
  return signer;
}

export function getReadContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  }
  const provider = new JsonRpcProvider(COTI_TESTNET_RPC, COTI_TESTNET_CHAIN_ID);
  return new Contract(CONTRACT_ADDRESS, PRIVATE_RPS_ABI, provider);
}

export async function getWriteContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  }
  const signer = await getSigner();
  return new Contract(CONTRACT_ADDRESS, PRIVATE_RPS_ABI, signer);
}

export async function encryptMove(
  moveCode: number,
  fn: "createMatch" | "joinMatch",
) {
  const signer = await getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, PRIVATE_RPS_ABI, signer);
  const fragment = contract.interface.getFunction(fn);
  if (!fragment) {
    throw new Error(`${fn} ABI is missing`);
  }
  return signer.encryptValue(
    BigInt(moveCode),
    CONTRACT_ADDRESS,
    fragment.selector,
  );
}

async function ensureCotiChain(ethereum: EthereumProvider) {
  const wanted = COTI_CHAIN.chainId.toLowerCase();
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: COTI_CHAIN.chainId }],
    });
  } catch (error) {
    if (walletErrorCode(error) !== 4902 && !isUnknownChain(error)) {
      throw new Error(
        `Could not switch MetaMask to COTI Testnet: ${walletErrorMessage(error)}`,
      );
    }
    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [COTI_CHAIN],
      });
    } catch (addError) {
      throw new Error(
        `Add COTI Testnet in MetaMask (chain 7082400): ${walletErrorMessage(addError)}`,
      );
    }
  }

  const current = String(
    await ethereum.request({ method: "eth_chainId" }),
  ).toLowerCase();
  if (current !== wanted) {
    throw new Error(
      "MetaMask is not on COTI Testnet. Switch network and try again.",
    );
  }
}

async function ensureAesKey(signer: JsonRpcSigner) {
  const address = await signer.getAddress();
  const cached = loadAesKey(address);
  if (cached) {
    signer.setAesKey(cached);
    return;
  }

  const publicProvider = new JsonRpcProvider(
    COTI_TESTNET_RPC,
    COTI_TESTNET_CHAIN_ID,
  );
  const balance = await publicProvider.getBalance(address);
  if (balance === BigInt(0)) {
    throw new Error(
      `This account has 0 testnet COTI. Switch to a funded wallet or send COTI to ${shortAddress(address)}.`,
    );
  }

  try {
    await signer.generateOrRecoverAes();
  } catch (error) {
    throw new Error(
      `COTI encryption onboarding failed. Approve the MetaMask signature. ${walletErrorMessage(error)}`,
    );
  }

  const aesKey = signer.getUserOnboardInfo()?.aesKey;
  if (!aesKey) {
    throw new Error("COTI AES key was not created. Try Connect wallet again.");
  }
  saveAesKey(address, aesKey);
}

function isUnknownChain(err: unknown) {
  const message = collectErrorText(err).toLowerCase();
  return (
    message.includes("unrecognized chain") ||
    message.includes("wallet_addethereumchain")
  );
}

function looksLikeRawDump(text: string) {
  const lower = text.toLowerCase();
  return (
    text.length > 180 ||
    lower.includes("transaction=") ||
    lower.includes("info={") ||
    lower.includes('"jsonrpc"')
  );
}

function collectErrorText(err: unknown, seen = new Set<object>()): string {
  if (err == null) {
    return "";
  }
  if (typeof err === "string") {
    return err;
  }
  if (typeof err !== "object") {
    return String(err);
  }
  if (seen.has(err)) {
    return "";
  }
  seen.add(err);
  const value = err as {
    shortMessage?: string;
    reason?: string;
    details?: string;
    message?: string;
    metaMessages?: string[];
    info?: { error?: { message?: string } };
    data?: { message?: string; originalError?: unknown };
    error?: unknown;
    cause?: unknown;
  };
  return [
    value.shortMessage,
    value.reason,
    value.details,
    value.message,
    ...(Array.isArray(value.metaMessages) ? value.metaMessages : []),
    value.info?.error?.message,
    value.data?.message,
    collectErrorText(value.error, seen),
    collectErrorText(value.cause, seen),
    collectErrorText(value.data?.originalError, seen),
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

function safeErrorString(err: unknown) {
  try {
    return String(err);
  } catch {
    return "";
  }
}

function formatCotiAmount(value: bigint) {
  const asNumber = Number(formatEther(value));
  if (!Number.isFinite(asNumber)) {
    return formatEther(value);
  }
  return asNumber.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function walletErrorCode(err: unknown): number | undefined {
  if (!err || typeof err !== "object") {
    return undefined;
  }
  const value = err as {
    code?: number | string;
    data?: { originalError?: { code?: number | string } };
    error?: { code?: number | string };
  };
  const raw = value.code ?? value.data?.originalError?.code ?? value.error?.code;
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function loadAesKey(address: string): string | null {
  try {
    return window.localStorage.getItem(AES_STORAGE_PREFIX + address.toLowerCase());
  } catch {
    return null;
  }
}

function saveAesKey(address: string, key: string) {
  try {
    window.localStorage.setItem(AES_STORAGE_PREFIX + address.toLowerCase(), key);
  } catch {
    // Ignore quota / private-mode failures; onboarding can run again.
  }
}
