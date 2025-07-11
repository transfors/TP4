🚀 SimpleSwap

📄 Description

SimpleSwap is a minimal Solidity smart contract implementing a two-token liquidity pool using an Automated Market Maker (AMM) model. It allows users to:

    ➕ Add liquidity by depositing two ERC-20 tokens in proportion.
    ➖ Remove liquidity to redeem their proportional share.
    🔄 Swap one token for the other.
    📊 Query the current price of one token in terms of the other.

This contract is an educational example inspired by the inner workings of protocols like Uniswap

🛠️ Token and Contract Addresses

Name	Address

TokenA	0x6619F80E8b660da5688CA94C7ceFa3EDF5fF3ED7

TokenB	0xD7cA99474702Dd0ed9D4C69919e914f26048499c

SimpleSwap	0xCaF5EC5123C53FE0f2Bf3D2154924Aa0adBcc343

✨ Main Features

➕ addLiquidity

Allows a user to deposit two tokens into the pool and mint internal liquidity tokens representing their share.

    Calculates optimal token amounts based on current reserves.
    Updates internal reserves.
    Emits a LiquidityAdded event.

➖ removeLiquidity

Allows a user to burn liquidity tokens and withdraw their proportional share of tokens.

    Calculates the withdrawal amounts based on pool share.
    Updates reserves.
    Emits a LiquidityRemoved event.

🔄 swapExactTokensForTokens

Swaps an exact input amount of one token for a minimum output amount of the other.

    Applies a 0.3% swap fee.
    Updates reserves after the swap.
    Emits a TokensSwapped event.
    Protects against excessive slippage.

📊 getPrice

Returns the current price of one token in terms of the other, based on the reserves.

📢 Events

    LiquidityAdded(address indexed provider, uint amountA, uint amountB)
    LiquidityRemoved(address indexed provider, uint amountA, uint amountB)
    TokensSwapped(address indexed user, address inputToken, uint inputAmount, address outputToken, uint outputAmount)

🔒 Security

    Uses OpenZeppelin’s ReentrancyGuard to prevent reentrancy attacks.
    Validates token addresses and deadlines.
    Uses ensure modifier to reject expired transactions.

🔗 Interfaces

The contract interacts with standard ERC-20 tokens using OpenZeppelin's IERC20 interface.

🧑‍💻 Basic Usage Example

// Add liquidity
simpleSwap.addLiquidity(
    tokenA,
    tokenB,
    100 ether,     // desired amount of tokenA
    200 ether,     // desired amount of tokenB
    90 ether,      // minimum amount of tokenA (slippage protection)
    180 ether,     // minimum amount of tokenB (slippage protection)
    msg.sender,
    block.timestamp + 600 // deadline (10 minutes)
);

// Swap tokens
address ;
path[0] = tokenA;
path[1] = tokenB;

simpleSwap.swapExactTokensForTokens(
    10 ether,       // amount of tokenA to swap
    9 ether,        // minimum tokenB to receive
    path,
    msg.sender,
    block.timestamp + 600
);

💻 Front-End DApp

A front-end was developed to interact with the SimpleSwap smart contract.

Users can:

    Connect their wallet (e.g., MetaMask)
    Add or remove liquidity
    Swap TokenA for TokenB and vice versa
    View the current token price

🔗 Launch the DApp on Vercel ← https://tp-modulo-4-eopc.vercel.app/

⚙️ Requirements

    Solidity ^0.8.20
    
    Standard ERC-20 token contracts
    
    OpenZeppelin Contracts:

        IERC20
        ReentrancyGuard

👤 Author

Nelly Herrero
