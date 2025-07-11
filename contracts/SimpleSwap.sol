// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleSwap
 * @dev A decentralized exchange (DEX) contract for two ERC20 tokens.
 * Allows users to add and remove liquidity, and swap one token for another.
 * Implements a simplified AMM (Automated Market Maker) liquidity model.
 */
contract SimpleSwap is ReentrancyGuard {
    // --- State Variables ---

    /**
     * @dev Address of the first token in the liquidity pair. Always the lexicographically smaller address.
     */
    address public token0;
    /**
     * @dev Address of the second token in the liquidity pair. Always the lexicographically larger address.
     */
    address public token1;
    /**
     * @dev Amount of token0 held in the liquidity pool.
     */
    uint256 public reserve0;
    /**
     * @dev Amount of token1 held in the liquidity pool.
     */
    uint256 public reserve1;
    /**
     * @dev Total amount of liquidity (LP) tokens minted. Represents the total liquidity in the pool.
     */
    uint256 public totalLiquidity;
    /**
     * @dev Mapping that tracks the amount of liquidity (LP tokens) each provider has contributed.
     */
    mapping(address => uint256) public liquidityProvided;

    // --- Events ---

    /**
     * @dev Emitted when liquidity is added to the pool.
     * @param provider The address of the liquidity provider.
     * @param amountA The amount of token A added.
     * @param amountB The amount of token B added.
     * @param liquidityMinted The amount of liquidity (LP) tokens minted.
     * @param timestamp The timestamp of the transaction.
     */
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityMinted, uint256 timestamp);
    /**
     * @dev Emitted when liquidity is removed from the pool.
     * @param provider The address of the liquidity provider.
     * @param amountA The amount of token A withdrawn.
     * @param amountB The amount of token B withdrawn.
     * @param timestamp The timestamp of the transaction.
     */
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 timestamp);
    /**
     * @dev Emitted when tokens are swapped.
     * @param swapper The address of the user who performed the swap.
     * @param tokenIn The address of the token given.
     * @param tokenOut The address of the token received.
     * @param timestamp The timestamp of the transaction.
     */
    event TokensSwapped(address indexed swapper, address indexed tokenIn, address indexed tokenOut, uint256 timestamp);

    // --- Constructor ---

    /**
     * @dev Constructs the SimpleSwap contract.
     * Initializes the addresses of the two ERC20 tokens that will form the trading pair.
     * Token addresses are sorted lexicographically to ensure consistency (token0 < token1).
     * @param _tokenA Address of the first ERC20 token.
     * @param _tokenB Address of the second ERC20 token.
     */
    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid token address");
        require(_tokenA != _tokenB, "Tokens must be different");

        if (_tokenA < _tokenB) {
            token0 = _tokenA;
            token1 = _tokenB;
        } else {
            token0 = _tokenB;
            token1 = _tokenA;
        }
    }

    // --- Internal Structures ---

    /**
     * @dev Represents the current state of the liquidity pool at a given moment.
     * Used to capture the state at the beginning of state-modifying functions
     * to ensure consistent calculations and prevent reentrancy or race condition issues.
     * @param token0 Address of the first token in the pair.
     * @param token1 Address of the second token in the pair.
     * @param reserve0 Amount of token0 in reserve.
     * @param reserve1 Amount of token1 in reserve.
     * @param totalLiquidity Total liquidity in the pool.
     */
    struct PoolState {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalLiquidity;
    }

    // --- Modifiers ---

    /**
     * @dev Modifier to ensure a transaction completes before a specified deadline.
     * Prevents pending transactions from executing long after their original intent.
     * @param deadline Unix timestamp representing the transaction's expiry time.
     */
    modifier ensure(uint256 deadline) {
        require(block.timestamp <= deadline, "Transaction expired");
        _;
    }

    // --- External Functions ---

    /**
     * @dev Allows adding liquidity to the exchange pool.
     * Tokens are transferred from `msg.sender` to the contract.
     * The amount of liquidity (LP) tokens minted is calculated based on current reserves
     * and the amounts of tokens provided.
     * @param _tokenA Address of token A to add.
     * @param _tokenB Address of token B to add.
     * @param amountADesired Desired amount of token A to add.
     * @param amountBDesired Desired amount of token B to add.
     * @param amountAMin Minimum amount of token A to accept, for slippage protection.
     * @param amountBMin Minimum amount of token B to accept, for slippage protection.
     * @param to Address to which the liquidity (LP) tokens will be minted.
     * @param deadline Timestamp by which the transaction must be included.
     * @return actualAmountA The actual amount of token A transferred.
     * @return actualAmountB The actual amount of token B transferred.
     * @return liquidity The amount of liquidity (LP) tokens minted.
     */
    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 actualAmountA, uint256 actualAmountB, uint256 liquidity) {
        // Capture the current pool state for consistent calculations.
        PoolState memory ps = PoolState(token0, token1, reserve0, reserve1, totalLiquidity);

        require((_tokenA == ps.token0 && _tokenB == ps.token1) || (_tokenA == ps.token1 && _tokenB == ps.token0), "Invalid token");
        require(to != address(0), "Invalid 'to' address");
        require(amountADesired > 0 && amountBDesired > 0, "Zero liquidity");

        bool isTokenA_token0 = (_tokenA == ps.token0);
        uint256 reserveA = isTokenA_token0 ? ps.reserve0 : ps.reserve1;
        uint256 reserveB = isTokenA_token0 ? ps.reserve1 : ps.reserve0;

        actualAmountA = amountADesired;
        actualAmountB = amountBDesired;

        // If it's the first liquidity provision, calculate initial liquidity as the square root of the product of amounts.
        if (ps.totalLiquidity == 0) {
            liquidity = Math.sqrt(actualAmountA * actualAmountB);
            require(liquidity > 0, "Liquidity must be > 0");
        } else {
            // For subsequent contributions, calculate the ratio of desired amounts to existing reserves.
            uint256 ratioA = actualAmountA * reserveB;
            uint256 ratioB = actualAmountB * reserveA;

            require(ratioA == ratioB, "Invalid proportions"); // Proportions must match existing reserves.
            require(actualAmountA >= amountAMin, "Slippage A too high");
            require(actualAmountB >= amountBMin, "Slippage B too high");

            // Liquidity minted is based on the minimum proportional amount to prevent front-running.
            liquidity = Math.min(
                (actualAmountA * ps.totalLiquidity) / reserveA,
                (actualAmountB * ps.totalLiquidity) / reserveB
            );
            require(liquidity > 0, "Zero liquidity not allowed");
        }

        // Transfer tokens from the sender to the contract.
        IERC20(_tokenA).transferFrom(msg.sender, address(this), actualAmountA);
        IERC20(_tokenB).transferFrom(msg.sender, address(this), actualAmountB);

        // Update pool reserves.
        if (isTokenA_token0) {
            reserve0 += actualAmountA;
            reserve1 += actualAmountB;
        } else {
            reserve0 += actualAmountB;
            reserve1 += actualAmountA;
        }

        // Update total liquidity and user's provided liquidity.
        totalLiquidity += liquidity;
        liquidityProvided[to] += liquidity;

        // Emit LiquidityAdded event.
        emit LiquidityAdded(msg.sender, actualAmountA, actualAmountB, liquidity, block.timestamp);
    }

    /**
     * @dev Allows removing liquidity from the exchange pool.
     * Users burn their liquidity (LP) tokens to receive back a portion of the underlying tokens.
     * @param _tokenA Address of token A to withdraw.
     * @param _tokenB Address of token B to withdraw.
     * @param liquidityToBurn Amount of liquidity (LP) tokens to burn.
     * @param amountAMin Minimum amount of token A to receive, for slippage protection.
     * @param amountBMin Minimum amount of token B to receive, for slippage protection.
     * @param to Address to which the withdrawn tokens will be sent.
     * @param deadline Timestamp by which the transaction must be included.
     * @return amountAWithdrawn The actual amount of token A withdrawn.
     * @return amountBWithdrawn The actual amount of token B withdrawn.
     */
    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 liquidityToBurn,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 amountAWithdrawn, uint256 amountBWithdrawn) {
        // Capture the current pool state.
        PoolState memory ps = PoolState(token0, token1, reserve0, reserve1, totalLiquidity);

        require((_tokenA == ps.token0 && _tokenB == ps.token1) || (_tokenA == ps.token1 && _tokenB == ps.token0), "Invalid token");
        require(to != address(0), "Invalid 'to' address");
        require(liquidityToBurn > 0, "Zero liquidity burn");

        bool isTokenA_token0 = (_tokenA == ps.token0);
        uint256 reserveA = isTokenA_token0 ? ps.reserve0 : ps.reserve1;
        uint256 reserveB = isTokenA_token0 ? ps.reserve1 : ps.reserve0;

        uint256 userLiquidity = liquidityProvided[msg.sender];
        require(userLiquidity >= liquidityToBurn, "Insufficient liquidity");

        // Calculate the amounts of tokens to withdraw proportionally to the burned liquidity.
        amountAWithdrawn = (liquidityToBurn * reserveA) / ps.totalLiquidity;
        amountBWithdrawn = (liquidityToBurn * reserveB) / ps.totalLiquidity;

        require(amountAWithdrawn >= amountAMin, "Slippage A too high");
        require(amountBWithdrawn >= amountBMin, "Slippage B too high");

        // Update total liquidity and provider's liquidity.
        totalLiquidity -= liquidityToBurn;
        liquidityProvided[msg.sender] = userLiquidity - liquidityToBurn;

        // Update pool reserves.
        if (isTokenA_token0) {
            reserve0 -= amountAWithdrawn;
            reserve1 -= amountBWithdrawn;
        } else {
            reserve0 -= amountBWithdrawn;
            reserve1 -= amountAWithdrawn;
        }

        // Transfer withdrawn tokens to the user.
        IERC20(_tokenA).transfer(to, amountAWithdrawn);
        IERC20(_tokenB).transfer(to, amountBWithdrawn);

        // Emit LiquidityRemoved event.
        emit LiquidityRemoved(msg.sender, amountAWithdrawn, amountBWithdrawn, block.timestamp);
    }

    /**
     * @dev Allows swapping an exact amount of one token for another.
     * Implements the x * y = k formula, with a 0.3% fee (997/1000).
     * @param amountIn The exact amount of the input token to swap.
     * @param amountOutMin The minimum amount of the output token to receive, for slippage protection.
     * @param path An array containing the token addresses in the swap path.
     * Currently only supports one hop (path.length == 2).
     * @param to The address to which the output tokens will be sent.
     * @param deadline Timestamp by which the transaction must be included.
     * @return amounts An array containing [amountIn, amountOut], the actual amounts swapped.
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256[] memory amounts) {
        // Capture the current pool state.
        PoolState memory ps = PoolState(token0, token1, reserve0, reserve1, totalLiquidity);

        require(path.length == 2, "Only 1 hop allowed");
        require(to != address(0), "Invalid 'to' address");
        require(amountIn > 0, "Input must be > 0");

        address _tokenIn = path[0];
        address _tokenOut = path[1];

        require(
            (_tokenIn == ps.token0 && _tokenOut == ps.token1) ||
            (_tokenIn == ps.token1 && _tokenOut == ps.token0),
            "Invalid token"
        );

        // Transfer the input token from the sender to the contract.
        IERC20(_tokenIn).transferFrom(msg.sender, address(this), amountIn);

        bool isTokenIn_token0 = (_tokenIn == ps.token0);
        uint256 reserveIn = isTokenIn_token0 ? ps.reserve0 : ps.reserve1;
        uint256 reserveOut = isTokenIn_token0 ? ps.reserve1 : ps.reserve0;

        require(reserveIn > 0 && reserveOut > 0, "Insufficient reserves");

        // Calculate the amount of output token.
        uint256 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "Excessive slippage");

        // Update pool reserves.
        if (isTokenIn_token0) {
            reserve0 = reserveIn + amountIn;
            reserve1 = reserveOut - amountOut;
        } else {
            reserve1 = reserveIn + amountIn;
            reserve0 = reserveOut - amountOut;
        }

        // Transfer the output token to the user.
        IERC20(_tokenOut).transfer(to, amountOut);

        // Emit TokensSwapped event.
        emit TokensSwapped(msg.sender, _tokenIn, _tokenOut, block.timestamp);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
    }

    /**
     * @dev Retrieves the current price of one token in terms of the other.
     * Returns the amount of _tokenB that can be obtained for 1e18 (1 full unit) of _tokenA.
     * @param _tokenA Address of the reference token.
     * @param _tokenB Address of the token whose price is to be obtained.
     * @return price Amount of _tokenB per 1e18 of _tokenA. Returns 0 if reserves are zero.
     */
    function getPrice(address _tokenA, address _tokenB) external view returns (uint256 price) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid tokens");
        require((_tokenA == token0 && _tokenB == token1) || (_tokenA == token1 && _tokenB == token0), "Invalid token");

        if (reserve0 == 0 || reserve1 == 0) return 0;

        bool isTokenA_token0 = (_tokenA == token0);
        uint256 reserveA = isTokenA_token0 ? reserve0 : reserve1;
        uint256 reserveB = isTokenA_token0 ? reserve1 : reserve0;

        // Calculates (reserveB / reserveA) * 1e18 to get the price in a fixed-point format.
        return (reserveB * 1e18) / reserveA;
    }

    /**
     * @dev Calculates the amount of output token received for a given amount of input token.
     * Applies a 0.3% swap fee (997/1000).
     * Uses the AMM formula: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn).
     * @param amountIn Amount of the input token.
     * @param reserveIn Reserve of the input token in the pool.
     * @param reserveOut Reserve of the output token in the pool.
     * @return amountOut The calculated amount of the output token. Returns 0 if the denominator is zero.
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        // Applies a 0.3% fee (1 - 0.003 = 0.997).
        uint256 amountInWithFee = (amountIn * 997) / 1000;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn + amountInWithFee;
        if (denominator == 0) return 0;
        return numerator / denominator;
    }
}