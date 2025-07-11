const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther, MaxUint256 } = ethers;

describe("SimpleSwapTest", function () {
    let owner;
    let tokenA, tokenB, simpleSwap;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        const TokenA = await ethers.getContractFactory("TokenA");
        tokenA = await TokenA.deploy(owner.address);
        await tokenA.waitForDeployment();

        const TokenB = await ethers.getContractFactory("TokenB");
        tokenB = await TokenB.deploy(owner.address);
        await tokenB.waitForDeployment();

        const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
        simpleSwap = await SimpleSwap.deploy(tokenA.target, tokenB.target);
        await simpleSwap.waitForDeployment();

        await tokenA.mint(owner.address, parseEther("10000"));
        await tokenB.mint(owner.address, parseEther("10000"));

        await tokenA.approve(simpleSwap.target, MaxUint256);
        await tokenB.approve(simpleSwap.target, MaxUint256);
    });

    describe("Deployment", function () {
        it("Should set correct token addresses", async function () {
            expect(await simpleSwap.token0()).to.be.oneOf([tokenA.target, tokenB.target]);
            expect(await simpleSwap.token1()).to.be.oneOf([tokenA.target, tokenB.target]);
        });

        it("Should initialize reserves to zero", async function () {
            expect(await simpleSwap.reserve0()).to.equal(0n);
            expect(await simpleSwap.reserve1()).to.equal(0n);
        });
    });

    describe("Liquidity Management", function () {
        // --- Add Liquidity Tests ---     
        it("Should allow adding liquidity", async function () {
            const tx = await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );

            await tx.wait();
            const liquidity = await simpleSwap.liquidityProvided(owner.address);
            expect(liquidity).to.be.gt(0n);
            expect(await simpleSwap.reserve0()).to.equal(parseEther("100"));
            expect(await simpleSwap.reserve1()).to.equal(parseEther("100"));
        });

        it("Should revert when minimum amountA for adding liquidity is too high", async function () {
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("1"),
                parseEther("1"),
                parseEther("0.9"),
                parseEther("0.9"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );

            await expect(
                simpleSwap.addLiquidity(
                    tokenA.target,
                    tokenB.target,
                    parseEther("100"),
                    parseEther("10"),
                    parseEther("95"),
                    parseEther("5"),
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("Splippage a too high");
        });


        it("Should revert when minimum amountB for adding liquidity is too high", async function () {
            // Add initial liquidity so splippage logic is hit
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("1"),
                parseEther("1"),
                parseEther("0.9"),
                parseEther("0.9"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );

            await expect(
                simpleSwap.addLiquidity(
                    tokenA.target,
                    tokenB.target,
                    parseEther("100"),
                    parseEther("100"),
                    parseEther("95"),
                    parseEther("200"),
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("Slippage B too high");
        });

        it("Should revert when adding zero liquidity", async function () {
            await expect(
                simpleSwap.addLiquidity(
                    tokenA.target,
                    tokenB.target,
                    parseEther("0"),
                    parseEther("0"),
                    parseEther("0"),
                    parseEther("0"),
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("Cannot add zero liquidity");
        });

        // --- Remove Liquidity Tests ---
        it("Should allow removing liquidity", async function () {
            // Add initial liquidity
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );

            const liquidity = await simpleSwap.liquidityProvided(owner.address);
            expect(liquidity).to.be.gt(0n); // Ensure liquidity was added

            const initialTokenABalance = await tokenA.balanceOf(owner.address);
            const initialTokenBBalance = await tokenB.balanceOf(owner.address);

            const tx = await simpleSwap.removeLiquidity(
                tokenA.target,
                tokenB.target,
                liquidity, // Total liquidity to burn
                parseEther("90"), // minAmountAOut
                parseEther("90"), // minAmountBOut
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );

            await tx.wait();

            const newLiquidity = await simpleSwap.liquidityProvided(owner.address);
            expect(newLiquidity).to.equal(0n); // Verify all liquidity was removed
            // Verify tokens were returned. Need to check if they increased by *at least* expected.
            expect(await tokenA.balanceOf(owner.address)).to.be.gt(initialTokenABalance);
            expect(await tokenB.balanceOf(owner.address)).to.be.gt(initialTokenBBalance);
        });

        it("Should correctly update reserves when tokenB is token0", async function () {
            // addLiquidity con B como token0
            const token0 = await simpleSwap.token0();
            const isTokenB_token0 = tokenB.target === token0;

            const tokenX = isTokenB_token0 ? tokenB : tokenA;
            const tokenY = isTokenB_token0 ? tokenA : tokenB;

            await simpleSwap.addLiquidity(
                tokenX.target,
                tokenY.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60
            );

            const liquidity = await simpleSwap.liquidityProvided(owner.address);
            await simpleSwap.removeLiquidity(
                tokenX.target,
                tokenY.target,
                liquidity,
                0,
                0,
                owner.address,
                Math.floor(Date.now() / 1000) + 60
            );

            const newLiquidity = await simpleSwap.liquidityProvided(owner.address);
            expect(newLiquidity).to.equal(0n);
        });

        it("Should revert on removing more liquidity than available", async function () {
            // Add initial liquidity
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );

            const liquidity = await simpleSwap.liquidityProvided(owner.address);

            // Attempt to remove more liquidity than available
            await expect(
                simpleSwap.removeLiquidity(
                    tokenA.target,
                    tokenB.target,
                    liquidity + 1n,
                    parseEther("0"),
                    parseEther("0"),
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("Insufficient Liquidity");
        });

        it("Should revert when minimum amountA out for removing liquidity is too high", async function () {
            // Add initial liquidity
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );
            const liquidity = await simpleSwap.liquidityProvided(owner.address);

            await expect(
                simpleSwap.removeLiquidity(
                    tokenA.target,
                    tokenB.target,
                    liquidity,
                    parseEther("200"),
                    parseEther("0"),
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("TokenA slippage error");
        });

        it("Should revert when minimum amountB out for removing liquidity is too high", async function () {
            // Add initial liquidity
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );
            const liquidity = await simpleSwap.liquidityProvided(owner.address);

            await expect(
                simpleSwap.removeLiquidity(
                    tokenA.target,
                    tokenB.target,
                    liquidity,
                    parseEther("0"),
                    parseEther("200"), // minAmountBOut - too high
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("TokenB slippage error");
        });
    });

    describe("Token Swapping", function () {
        beforeEach(async function () {
            // Add initial liquidity for swap tests
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );
        });

        it("Should execute token swap from TokenA to TokenB", async function () {
            const amountIn = parseEther("10");
            const amountOutMin = parseEther("9");
            const path = [tokenA.target, tokenB.target];

            const balanceBeforeTokenA = await tokenA.balanceOf(owner.address);
            const balanceBeforeTokenB = await tokenB.balanceOf(owner.address);
            const reserveATokenBefore = await simpleSwap.reserve0();
            const reserveBTokenBefore = await simpleSwap.reserve1();

            const tx = await simpleSwap.swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );
            await tx.wait();

            const balanceAfterTokenA = await tokenA.balanceOf(owner.address);
            const balanceAfterTokenB = await tokenB.balanceOf(owner.address);
            const reserveATokenAfter = await simpleSwap.reserve0();
            const reserveBTokenAfter = await simpleSwap.reserve1();

            // Owner's TokenA balance should decrease
            expect(balanceAfterTokenA).to.equal(balanceBeforeTokenA - amountIn);
            // Owner's TokenB balance should increase by at least amountOutMin
            expect(balanceAfterTokenB).to.be.gt(balanceBeforeTokenB);
            expect(balanceAfterTokenB).to.be.gte(balanceBeforeTokenB + amountOutMin);

            // Reserves should update
            expect(reserveATokenAfter).to.equal(reserveATokenBefore + amountIn);
            expect(reserveBTokenAfter).to.be.lt(reserveBTokenBefore);
        });

        it("Should execute token swap from TokenB to TokenA", async function () {
            const amountIn = parseEther("10");
            const amountOutMin = parseEther("9"); // Expect at least 9 TokenA
            const path = [tokenB.target, tokenA.target]; // Swap in the other direction

            const balanceBeforeTokenA = await tokenA.balanceOf(owner.address);
            const balanceBeforeTokenB = await tokenB.balanceOf(owner.address);
            const reserveATokenBefore = await simpleSwap.reserve0();
            const reserveBTokenBefore = await simpleSwap.reserve1();

            const tx = await simpleSwap.swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );
            await tx.wait();

            const balanceAfterTokenA = await tokenA.balanceOf(owner.address);
            const balanceAfterTokenB = await tokenB.balanceOf(owner.address);
            const reserveATokenAfter = await simpleSwap.reserve0();
            const reserveBTokenAfter = await simpleSwap.reserve1();

            // Owner's TokenB balance should decrease
            expect(balanceAfterTokenB).to.equal(balanceBeforeTokenB - amountIn);

            // Owner's TokenA balance should increase by at least amountOutMin
            expect(balanceAfterTokenA).to.be.gt(balanceBeforeTokenA);
            // THE PROBLEM LINE (328):
            expect(balanceAfterTokenA).to.be.gte(balanceBeforeTokenA + amountOutMin);

            // Reserves should update
            expect(reserveBTokenAfter).to.equal(reserveBTokenBefore + amountIn);
            expect(reserveATokenAfter).to.be.lt(reserveATokenBefore);
        });

        it("Should revert if amountOutMin is too high for swap", async function () {
            const amountIn = parseEther("10");
            // Request an impossible amountOutMin
            const amountOutMin = parseEther("500");
            const path = [tokenA.target, tokenB.target];

            await expect(
                simpleSwap.swapExactTokensForTokens(
                    amountIn,
                    amountOutMin,
                    path,
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("Excessive slippage");
        });

        it("Should revert on swap with zero amountIn", async function () {
            const path = [tokenA.target, tokenB.target];
            await expect(
                simpleSwap.swapExactTokensForTokens(
                    parseEther("0"), // amountIn = 0
                    parseEther("0"),
                    path,
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("Input must be > 0");
        });
    });

    describe("Edge Cases", function () {
        it("Should revert on invalid token swap path", async function () {
            await expect(
                simpleSwap.swapExactTokensForTokens(
                    parseEther("10"),
                    parseEther("9"),
                    [tokenA.target, owner.address], // owner.address is not a valid token in the pool
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 10
                )
            ).to.be.revertedWith("Invalid token");
        });

        it("Should revert when deadline is in the past for addLiquidity", async function () {
            await expect(
                simpleSwap.addLiquidity(
                    tokenA.target,
                    tokenB.target,
                    parseEther("100"),
                    parseEther("100"),
                    parseEther("95"),
                    parseEther("95"),
                    owner.address,
                    Math.floor(Date.now() / 1000) - 60 // Deadline in the past
                )
            ).to.be.revertedWith("Transaction expired");
        });

        it("Should revert when deadline is in the past for removeLiquidity", async function () {
            // Add liquidity first
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );
            const liquidity = await simpleSwap.liquidityProvided(owner.address);

            await expect(
                simpleSwap.removeLiquidity(
                    tokenA.target,
                    tokenB.target,
                    liquidity,
                    parseEther("0"),
                    parseEther("0"),
                    owner.address,
                    Math.floor(Date.now() / 1000) - 60 // Deadline in the past
                )
            ).to.be.revertedWith("Transaction expired");
        });

        it("Should revert when deadline is in the past for swapExactTokensForTokens", async function () {
            // Add liquidity first so swap is possible
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("100"),
                parseEther("95"),
                parseEther("95"),
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 10
            );

            await expect(
                simpleSwap.swapExactTokensForTokens(
                    parseEther("10"),
                    parseEther("9"),
                    [tokenA.target, tokenB.target],
                    owner.address,
                    Math.floor(Date.now() / 1000) - 60 // Deadline in the past
                )
            ).to.be.revertedWith("Transaction expired");
        });
    });

    describe("getPrice()", function () {
        it("Should revert if one of the tokens is address(0)", async function () {
            await expect(
                simpleSwap.getPrice(ethers.ZeroAddress, tokenB.target)
            ).to.be.revertedWith("Invalid tokens");

            await expect(
                simpleSwap.getPrice(tokenA.target, ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid tokens");
        });

        it("Should revert if the token pair is not valid", async function () {
            const [_, other] = await ethers.getSigners();
            await expect(
                simpleSwap.getPrice(tokenA.target, other.address)
            ).to.be.revertedWith("Invalid token");
        });

        it("Should return 0 if reserves are zero", async function () {
            const price = await simpleSwap.getPrice(tokenA.target, tokenB.target);
            expect(price).to.equal(0n);
        });

        it("Should return correct price when reserves are non-zero", async function () {
            await simpleSwap.addLiquidity(
                tokenA.target,
                tokenB.target,
                parseEther("100"),
                parseEther("200"),
                parseEther("90"),
                parseEther("180"),
                owner.address,
                Math.floor(Date.now() / 1000) + 600
            );

            const price = await simpleSwap.getPrice(tokenA.target, tokenB.target);
            // TokenB = 200, TokenA = 100 → price = 2e18
            expect(price).to.equal(parseEther("2"));

            const reversePrice = await simpleSwap.getPrice(tokenB.target, tokenA.target);
            // TokenA = 100, TokenB = 200 → price = 0.5e18
            expect(reversePrice).to.equal(parseEther("0.5"));
        });
    });

});