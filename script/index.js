const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    const tokenAAddress = "0x6619F80E8b660da5688CA94C7ceFa3EDF5fF3ED7";
    const tokenBAddress = "0xD7cA99474702Dd0ed9D4C69919e914f26048499c";
    const simpleSwapAddress = "0xCaF5EC5123C53FE0f2Bf3D2154924Aa0adBcc343";

    // Connect contracts
    const TokenA = await ethers.getContractFactory("TokenA");
    const tokenA = TokenA.attach(tokenAAddress);

    const TokenB = await ethers.getContractFactory("TokenB");
    const tokenB = TokenB.attach(tokenBAddress);

    const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    const simpleSwap = SimpleSwap.attach(simpleSwapAddress);

    console.log("Contracts connected successfully");

    const amountToAddLiquidity = ethers.parseUnits("0.05", 18);
    const amountToRemoveLiquidity = ethers.parseUnits("0.01", 18);
    const amountToSwapAforB = ethers.parseUnits("0.01", 18);
    const amountToSwapBforA = ethers.parseUnits("0.02", 18);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

    // Mint tokens
    const amountToMint = ethers.parseUnits("1000", 18);

    console.log("\n0. Minting tokens to the deployer...");
    await tokenA.mint(deployer.address, amountToMint);
    await tokenB.mint(deployer.address, amountToMint);
    console.log("Tokens minted successfully");

    // Add Liquidity
    console.log("\n1. Add Liquidity SimpleSwap");
    await tokenA.approve(simpleSwapAddress, amountToAddLiquidity);
    await tokenB.approve(simpleSwapAddress, amountToAddLiquidity);
    console.log("Tokens approved to add liquidity");

    await simpleSwap.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountToAddLiquidity,
        amountToAddLiquidity,
        amountToAddLiquidity,
        amountToAddLiquidity,
        deployer.address,
        deadline
    );
    console.log("Liquidity added successfully");

    // Remove Liquidity
    console.log("\n2. Remove liquidity from SimpleSwap");
    await simpleSwap.removeLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountToRemoveLiquidity,
        0, // amountAMin
        0, // amountBMin
        deployer.address,
        deadline
    );
    console.log(`Liquidity removal: ${ethers.formatUnits(amountToRemoveLiquidity, 18)} Liquidity burned`);

    // Swap TokenA for TokenB
    console.log("\n3. Swap TokenA for TokenB");
    await tokenA.approve(simpleSwapAddress, amountToSwapAforB);
    await simpleSwap.swapExactTokensForTokens(
        amountToSwapAforB,
        0, // amountOutMin
        [tokenAAddress, tokenBAddress],
        deployer.address,
        deadline
    );
    console.log(`Swapped ${ethers.formatUnits(amountToSwapAforB, 18)} TokenA for TokenB`);

    // Swap TokenB for TokenA
    console.log("\n4. Swap TokenB for TokenA");
    await tokenB.approve(simpleSwapAddress, amountToSwapBforA);
    await simpleSwap.swapExactTokensForTokens(
        amountToSwapBforA,
        0, // amountOutMin
        [tokenBAddress, tokenAAddress],
        deployer.address,
        deadline
    );
    console.log(`Swapped ${ethers.formatUnits(amountToSwapBforA, 18)} TokenB for TokenA`);

    // Get prices
    console.log("\n5. Get current prices");
    const priceA = await simpleSwap.getPrice(tokenAAddress, tokenBAddress);
    const priceB = await simpleSwap.getPrice(tokenBAddress, tokenAAddress);

    console.log(`Price of TokenA in TokenB: ${ethers.formatUnits(priceA, 18)}`);
    console.log(`Price of TokenB in TokenA: ${ethers.formatUnits(priceB, 18)}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Script error:", error);
        process.exit(1);
    });
