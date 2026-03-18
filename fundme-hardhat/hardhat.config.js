require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();


const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;



/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: rpcUrl,
      accounts: [privateKey],
    },
  },
};
