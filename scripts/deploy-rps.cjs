require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const feeRecipient =
    process.env.FEE_RECIPIENT || (await hre.ethers.getSigners())[0].address;
  const feeBps = Number(process.env.FEE_BPS || 200);
  const minStake = hre.ethers.parseEther(process.env.MIN_STAKE || "0.1");

  const factory = await hre.ethers.getContractFactory("PrivateRps");
  const contract = await factory.deploy(feeRecipient, feeBps, minStake);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("PrivateRps", address);
  console.log("feeRecipient", feeRecipient);
  console.log("feeBps", feeBps);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
