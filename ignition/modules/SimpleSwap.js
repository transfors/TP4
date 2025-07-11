const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const SimpleSwapModule = buildModule("SimpleSwapModule", (deployer) => {
    const deployerAddress = deployer.getAccount(0);

    const tokenA = deployer.contract("TokenA", [deployerAddress]);
    const tokenB = deployer.contract("TokenB", [deployerAddress]);

    const simpleSwap = deployer.contract("SimpleSwap", [tokenA, tokenB]);

    return { tokenA, tokenB, simpleSwap };
});

module.exports = SimpleSwapModule;