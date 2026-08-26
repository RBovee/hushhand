"use client";

import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  type JsonRpcSigner,
} from "@coti-io/coti-ethers";
import {
  CONTRACT_ADDRESS,
  COTI_EXPLORER,
  COTI_TESTNET_CHAIN_ID,
  COTI_TESTNET_RPC,
  PRIVATE_RPS_ABI,
} from "./constants";

const COTI_CHAIN = {
  chainId: `0x${COTI_TESTNET_CHAIN_ID.toString(16)}`,
  chainName: "COTI Testnet",
  nativeCurrency: { name: "COTI", symbol: "COTI", decimals: 18 },
  rpcUrls: [COTI_TESTNET_RPC],
  blockExplorerUrls: [COTI_EXPLORER],
};

export function explorerTx(hash: string) {
  return `${COTI_EXPLORER}/tx/${hash}`;
}

export function explorerAddress(address: string) {
  return `${COTI_EXPLORER}/address/${address}`;
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export async function connectWallet(): Promise<string> {
  const ethereum = getEthereum();
  await ethereum.request({ method: "eth_requestAccounts" });
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: COTI_CHAIN.chainId }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [COTI_CHAIN],
      });
    } else {
      throw error;
    }
  }
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  await signer.generateOrRecoverAes();
  return signer.getAddress();
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const provider = new BrowserProvider(getEthereum());
  const signer = await provider.getSigner();
  if (!signer.getUserOnboardInfo()?.aesKey) {
    await signer.generateOrRecoverAes();
  }
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

export async function encryptMove(moveCode: number, fn: "createMatch" | "joinMatch") {
  const signer = await getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, PRIVATE_RPS_ABI, signer);
  const fragment = contract.interface.getFunction(fn);
  if (!fragment) {
    throw new Error(`${fn} ABI is missing`);
  }
  return signer.encryptValue(BigInt(moveCode), CONTRACT_ADDRESS, fragment.selector);
}

function getEthereum() {
  const ethereum = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
  if (!ethereum) {
    throw new Error("Install MetaMask to play HushHand");
  }
  return ethereum;
}
