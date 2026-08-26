require("dotenv").config();
const {
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  parseEther,
} = require("@coti-io/coti-ethers");
const artifact = require("../artifacts/contracts/PrivateRps.sol/PrivateRps.json");

async function main() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) {
    throw new Error("DEPLOYER_PRIVATE_KEY is missing");
  }
  const rpc = process.env.COTI_RPC_URL || "https://testnet.coti.io/rpc";
  const provider = new JsonRpcProvider(rpc);
  const wallet = new Wallet(key, provider);
  const feeRecipient = process.env.FEE_RECIPIENT || wallet.address;
  const feeBps = Number(process.env.FEE_BPS || 200);
  const minStake = parseEther(process.env.MIN_STAKE || "0.1");
  const minLotteryPot = parseEther(process.env.MIN_LOTTERY_POT || "0.05");

  console.log("deployer", wallet.address);
  console.log("feeRecipient", feeRecipient);
  console.log("balance", (await provider.getBalance(wallet.address)).toString());

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  // COTI RPC has no pending block, so skip estimateGas.
  const contract = await factory.deploy(feeRecipient, feeBps, minStake, minLotteryPot, {
    gasLimit: 5_000_000,
  });
  const tx = contract.deploymentTransaction();
  if (tx) {
    console.log("deploy tx", tx.hash);
  }
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("PrivateRps", address);
  console.log("feeBps", feeBps);
  console.log("minLotteryPot", minLotteryPot.toString());
  console.log("explorer", `https://testnet.cotiscan.io/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
