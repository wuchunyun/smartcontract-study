const { networkConfig, developmentChains } = {
  developmentChains: ["hardhat", "localhost"],
  networkConfig: {
    localhost: {
      blockConfirmations: 1,
    },
    hardhat: {
      blockConfirmations: 1,
    },
    sepolia: {
      blockConfirmations: 6,
    },
  },
};

module.exports = {
  networkConfig,
  developmentChains,
};