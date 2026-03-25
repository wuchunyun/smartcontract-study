const { network } = require("hardhat");

async function main() {
  const sepoliaEthUsdPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const mainnetEthUsdPriceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";

  let priceFeedAddress;
  if (network.name === "sepolia") {
    priceFeedAddress = sepoliaEthUsdPriceFeed;
  } else if (network.name === "mainnet") {
    priceFeedAddress = mainnetEthUsdPriceFeed;
  } else {
    // 本地测试网或其他网络
    priceFeedAddress = sepoliaEthUsdPriceFeed; // 或使用模拟器
  }

  const fundMe = await ethers.deployContract("FundMe", [priceFeedAddress]);
  await fundMe.waitForDeployment();

  console.log(`FundMe deployed to ${fundMe.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});