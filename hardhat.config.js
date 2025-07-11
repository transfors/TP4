require("@nomicfoundation/hardhat-toolbox");
const { vars } = require("hardhat/config");
require("dotenv").config();

const INFURA_NODO = process.env.NODO;
const SEPOLIA_PRIVATE_KEY = process.env.PRKEY;
const ETHERSCAN_API_KEY = process.env.ETHSCAN_KEY;

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: INFURA_NODO,
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
};

