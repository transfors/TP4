const tokenAAddress = "0x6619F80E8b660da5688CA94C7ceFa3EDF5fF3ED7"; // Replace with your deployed TokenA address
const tokenBAddress = "0xD7cA99474702Dd0ed9D4C69919e914f26048499c"; // Replace with your deployed TokenB address
const simpleSwapAddress = "0xCaF5EC5123C53FE0f2Bf3D2154924Aa0adBcc343"; // Replace with your deployed SimpleSwap address

let provider;
let signer;
let simpleSwapContract;

// IMPORTANT: This ABI must perfectly match your SimpleSwap.sol contract
const SIMPLE_SWAP_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_tokenA", "type": "address" },
            { "internalType": "address", "name": "_tokenB", "type": "address" }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" }
        ],
        "name": "OwnableInvalidOwner",
        "type": "error"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "account", "type": "address" }
        ],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "provider", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amountA", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "amountB", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "liquidityMinted", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "LiquidityAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "provider", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amountA", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "amountB", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "LiquidityRemoved",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "swapper", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "tokenIn", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "tokenOut", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "TokensSwapped",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_tokenA", "type": "address" },
            { "internalType": "address", "name": "_tokenB", "type": "address" },
            { "internalType": "uint256", "name": "amountADesired", "type": "uint256" },
            { "internalType": "uint256", "name": "amountBDesired", "type": "uint256" },
            { "internalType": "uint256", "name": "amountAMin", "type": "uint256" },
            { "internalType": "uint256", "name": "amountBMin", "type": "uint256" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "name": "addLiquidity",
        "outputs": [
            { "internalType": "uint256", "name": "actualAmountA", "type": "uint256" },
            { "internalType": "uint256", "name": "actualAmountB", "type": "uint256" },
            { "internalType": "uint256", "name": "liquidity", "type": "uint256" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
            { "internalType": "uint256", "name": "reserveIn", "type": "uint256" },
            { "internalType": "uint256", "name": "reserveOut", "type": "uint256" }
        ],
        "name": "getAmountOut",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
        ],
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_tokenA", "type": "address" },
            { "internalType": "address", "name": "_tokenB", "type": "address" }
        ],
        "name": "getPrice",
        "outputs": [
            { "internalType": "uint256", "name": "price", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "name": "liquidityProvided",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_tokenA", "type": "address" },
            { "internalType": "address", "name": "_tokenB", "type": "address" },
            { "internalType": "uint256", "name": "liquidityToBurn", "type": "uint256" },
            { "internalType": "uint256", "name": "amountAMin", "type": "uint256" },
            { "internalType": "uint256", "name": "amountBMin", "type": "uint256" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "name": "removeLiquidity",
        "outputs": [
            { "internalType": "uint256", "name": "amountAWithdrawn", "type": "uint256" },
            { "internalType": "uint256", "name": "amountBWithdrawn", "type": "uint256" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "reserve0",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "reserve1",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
            { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
            { "internalType": "address[]", "name": "path", "type": "address[]" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "name": "swapExactTokensForTokens",
        "outputs": [
            { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token0",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token1",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalLiquidity",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "newOwner", "type": "address" }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Minimal ABI for the ERC-20 functions we need to call (approve, mint if it exists, decimals, balanceOf)
const ERC20_ABI_MINIMAL = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount) public",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function symbol() view returns (string)" // Added for better display
];

// Global contract instances for TokenA and TokenB
let tokenAContract;
let tokenBContract;

async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            const addr = await signer.getAddress();
            document.getElementById("accountAddress").innerText = `Connected: ${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

            simpleSwapContract = new ethers.Contract(simpleSwapAddress, SIMPLE_SWAP_ABI, signer);
            tokenAContract = new ethers.Contract(tokenAAddress, ERC20_ABI_MINIMAL, signer);
            tokenBContract = new ethers.Contract(tokenBAddress, ERC20_ABI_MINIMAL, signer);

            alert("Wallet connected successfully!");
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert("Error connecting wallet. Make sure MetaMask is installed and unlocked");
        }
    } else {
        alert("MetaMask isn't installed. Please install MetaMask to use this DApp");
        console.log("Create a MetaMask");
    }
}

/**
 * Mints tokens of type A or B.
 * @param {string} tokenType 'A' or 'B'
 */
async function mintToken(tokenType) {
    if (!signer) {
        alert("Please connect your wallet first");
        return;
    }

    const amountToMint = document.getElementById("mintAmount").value;
    const mintResultElement = document.getElementById("mintResult");

    if (isNaN(amountToMint) || parseFloat(amountToMint) <= 0) {
        mintResultElement.innerText = "Enter a valid amount to mint";
        return;
    }

    let tokenContract;
    let tokenAddress;

    if (tokenType === 'A') {
        tokenContract = tokenAContract;
        tokenAddress = tokenAAddress;
    } else if (tokenType === 'B') {
        tokenContract = tokenBContract;
        tokenAddress = tokenBAddress;
    } else {
        mintResultElement.innerText = "Invalid token selection";
        return;
    }

    try {
        let decimals;
        try {
            decimals = await tokenContract.decimals();
        } catch (error) {
            console.warn(`Could not get token decimals ${tokenType}. Assuming 18. Error:`, error);
            decimals = 18;
        }

        const amountInWei = ethers.utils.parseUnits(amountToMint, decimals);
        const userAddress = await signer.getAddress();

        mintResultElement.innerText = `Minting ${amountToMint} Token ${tokenType} a ${userAddress.substring(0, 6)}... Please confirm in MetaMask`;

        // Check if the contract has a 'mint' function
        if (tokenContract.mint) {
            const mintTx = await tokenContract.mint(userAddress, amountInWei);
            const receipt = await mintTx.wait();
            console.log("Minting transaction successful:", receipt);
            mintResultElement.innerText = `Successfully minted ${amountToMint} Token ${tokenType}! Hash: ${receipt.transactionHash.substring(0, 6)}...${receipt.transactionHash.substring(receipt.transactionHash.length - 4)}`;
        } else {
            mintResultElement.innerText = `Error: The Token contract ${tokenType} does not have a public 'mint' function`;
            console.error(`Error: Token ${tokenType} contract at ${tokenAddress} does not have a 'mint' function`);
        }

    } catch (error) {
        console.error(`Error minting Token ${tokenType}:`, error);
        if (error.code === 4001) {
            mintResultElement.innerText = "Minting transaction rejected by the user";
        } else if (error.code === "CALL_EXCEPTION" || (error.reason && error.reason.includes("execution reverted"))) {
            mintResultElement.innerText = `Error minting Token ${tokenType}: The transaction was reverted`;
        } else {
            mintResultElement.innerText = `Error minting Tokens: ${error.message || error.reason || "Check the console for more details"}`;
        }
    }
}

/**
 * Approves tokens for the SimpleSwap contract.
 * @param {string} tokenType 'A' or 'B'
 */
async function approveToken(tokenType) {
    if (!signer) {
        alert("Please connect your wallet first");
        return;
    }

    const approveAmountElementId = tokenType === 'A' ? "approveAmountA" : "approveAmountB";
    const amountToApprove = document.getElementById(approveAmountElementId).value;
    const approveResultElement = document.getElementById("approveResult");

    if (isNaN(amountToApprove) || parseFloat(amountToApprove) <= 0) {
        approveResultElement.innerText = "Please enter a valid amount to approve";
        return;
    }

    let tokenContract;
    let tokenAddress;

    if (tokenType === 'A') {
        tokenContract = tokenAContract;
        tokenAddress = tokenAAddress;
    } else if (tokenType === 'B') {
        tokenContract = tokenBContract;
        tokenAddress = tokenBAddress;
    } else {
        approveResultElement.innerText = "Invalid token selection";
        return;
    }

    try {
        let decimals;
        try {
            decimals = await tokenContract.decimals();
        } catch (error) {
            console.warn(`Could not get the Token's decimals ${tokenType}. Assuming 18. Error:`, error);
            decimals = 18;
        }

        const amountInWei = ethers.utils.parseUnits(amountToApprove, decimals);

        approveResultElement.innerText = `Approving ${amountToApprove} Token ${tokenType} to ${simpleSwapAddress.substring(0, 6)}... Please confirm in MetaMask`;
        const approveTx = await tokenContract.approve(simpleSwapAddress, amountInWei);
        const receipt = await approveTx.wait();
        console.log(`Token approval transaction ${tokenType} Successful:`, receipt);
        approveResultElement.innerText = `Token approval successful ${tokenType}! Hash: ${receipt.transactionHash.substring(0, 6)}...${receipt.transactionHash.substring(receipt.transactionHash.length - 4)}`;
    } catch (error) {
        console.error(`Error approving Token ${tokenType}:`, error);
        if (error.code === 4001) {
            approveResultElement.innerText = "Approval transaction rejected by the user";
        } else if (error.code === "CALL_EXCEPTION" || (error.reason && error.reason.includes("execution reverted"))) {
            approveResultElement.innerText = `Error approving Token ${tokenType}: The transaction was reverted`;
        } else {
            approveResultElement.innerText = `Error approving Tokens: ${error.message || error.reason || "Check the console for more details"}`;
        }
    }
}


async function addLiquidity() {
    if (!simpleSwapContract || !signer) {
        alert("Please connect your wallet first");
        return;
    }

    const amountA = document.getElementById("amountA_liq").value;
    const amountB = document.getElementById("amountB_liq").value;
    const addLiquidityResultElement = document.getElementById("addLiquidityResult");

    if (isNaN(amountA) || isNaN(amountB) || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
        addLiquidityResultElement.innerText = "Please enter valid amounts to add liquidity";
        return;
    }

    try {
        // Get decimals for each token
        let decimalsA = 18;
        let decimalsB = 18;
        try {
            decimalsA = await tokenAContract.decimals();
            decimalsB = await tokenBContract.decimals();
        } catch (error) {
            console.warn("Couldn't get exact decimals. Using 18 as default", error);
        }

        // Convert amounts to wei
        const amountAInWei = ethers.utils.parseUnits(amountA, decimalsA);
        const amountBInWei = ethers.utils.parseUnits(amountB, decimalsB);

        // Define minimums and deadline
        const amountAMin = amountAInWei.mul(99).div(100); // 1% slippage tolerance
        const amountBMin = amountBInWei.mul(99).div(100); // 1% slippage tolerance
        const toAddress = await signer.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + (20 * 60); // 20 minutes from now

        addLiquidityResultElement.innerText = "Adding liquidity... Please confirm the transaction in MetaMask";

        const tx = await simpleSwapContract.addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountAInWei,
            amountBInWei,
            amountAMin,
            amountBMin,
            toAddress,
            deadline
        );

        const receipt = await tx.wait();
        console.log("Add liquidity transaction successful:", receipt);
        addLiquidityResultElement.innerText = `¡Liquidity added successfully! Hash: ${receipt.transactionHash.substring(0, 6)}...${receipt.transactionHash.substring(receipt.transactionHash.length - 4)}`;
    } catch (error) {
        console.error("Error adding liquidity:", error);
        if (error.code === 4001) {
            addLiquidityResultElement.innerText = "Transaction rejected by the user";
        } else if (error.reason && error.reason.includes("execution reverted")) {
            addLiquidityResultElement.innerText = `Error adding liquidity)`;
        } else {
            addLiquidityResultElement.innerText = `Error adding liquidity: ${error.message || error.reason || "Check the console for more details"}`;
        }
    }
}

async function removeLiquidity() {
    if (!simpleSwapContract || !signer) {
        alert("Please connect your wallet first");
        return;
    }

    const liquidityToRemoveInput = document.getElementById("liquidityToBurn").value;
    const removeLiquidityResultElement = document.getElementById("removeLiquidityResult");

    if (isNaN(liquidityToRemoveInput) || parseFloat(liquidityToRemoveInput) <= 0) {
        removeLiquidityResultElement.innerText = "Please enter a valid liquidity amount to remove";
        return;
    }

    // Assuming LP tokens have 18 decimals, like most ERC20s.
    const liquidityToBurnWei = ethers.utils.parseUnits(liquidityToRemoveInput, 18);

    // Minimums of tokens to receive (slippage protection). For now, 0, but adjustable.
    const amountAMin = 0; // You might want to let the user specify this
    const amountBMin = 0; // You might want to let the user specify this

    const toAddress = await signer.getAddress(); // Address to receive withdrawn tokens
    const deadline = Math.floor(Date.now() / 1000) + (20 * 60); // 20 minutes from now

    try {
        removeLiquidityResultElement.innerText = "Removing liquidity... Please confirm the transaction in MetaMask";

        const removeLiquidityTx = await simpleSwapContract.removeLiquidity(
            tokenAAddress, // _tokenA
            tokenBAddress, // _tokenB
            liquidityToBurnWei, // liquidityToBurn
            amountAMin,
            amountBMin,
            toAddress,
            deadline
        );

        const receipt = await removeLiquidityTx.wait();
        console.log("Remove liquidity transaction successful:", receipt);
        removeLiquidityResultElement.innerText = `Liquidity removed successfully! Hash: ${receipt.transactionHash.substring(0, 6)}...${receipt.transactionHash.substring(receipt.transactionHash.length - 4)}`;

    } catch (error) {
        console.error("Error removing liquidity:", error);
        if (error.code === 4001) {
            removeLiquidityResultElement.innerText = "Transaction rejected by the user";
        } else if (error.reason && error.reason.includes("execution reverted")) {
            removeLiquidityResultElement.innerText = `Error removing liquidity`;
        } else {
            removeLiquidityResultElement.innerText = `Error removing liquidity: ${error.message || error.reason || "Check the console for more details"}`;
        }
    }
}


async function swap() {
    if (!simpleSwapContract || !signer) {
        alert("Please connect your wallet first");
        return;
    }

    const tokenInSelection = document.getElementById("tokenIn").value;
    const amountIn = document.getElementById("amountIn").value;
    const swapResultElement = document.getElementById("swapResult");

    if (isNaN(amountIn) || parseFloat(amountIn) <= 0) {
        swapResultElement.innerText = "Please enter a valid amount for the swap";
        return;
    }

    let tokenInAddress;
    let tokenOutAddress;
    let tokenInContract;

    if (tokenInSelection === "A") {
        tokenInAddress = tokenAAddress;
        tokenOutAddress = tokenBAddress;
        tokenInContract = tokenAContract;
    } else if (tokenInSelection === "B") {
        tokenInAddress = tokenBAddress;
        tokenOutAddress = tokenAAddress;
        tokenInContract = tokenBContract;
    } else {
        swapResultElement.innerText = "Invalid token selection";
        return;
    }

    try {
        let decimalsIn;
        try {
            decimalsIn = await tokenInContract.decimals();
        } catch (error) {
            console.warn(`Couldn't get the input token's decimals (${tokenInSelection}). Assuming 18`, error);
            decimalsIn = 18;
        }

        const amountInWei = ethers.utils.parseUnits(amountIn, decimalsIn);

        // --- APPROVAL for the Input Token ---
        swapResultElement.innerText = `Approving Token ${tokenInSelection} for the swap... Please CONFIRM the transaction in MetaMask`;
        const approveTx = await tokenInContract.approve(simpleSwapAddress, amountInWei);
        await approveTx.wait(); // Wait for approval to be mined
        console.log(`Aprobación de Token ${tokenInSelection} exitosa:`, approveTx.hash);

        // --- CALCULATION OF amountOutMin (slippage protection) ---
        // Fetch current reserves to calculate expected amountOut and set amountOutMin
        const currentToken0 = await simpleSwapContract.token0();
        const currentToken1 = await simpleSwapContract.token1();

        let reserveIn;
        let reserveOut;

        if (tokenInAddress === currentToken0) {
            reserveIn = await simpleSwapContract.reserve0();
            reserveOut = await simpleSwapContract.reserve1();
        } else if (tokenInAddress === currentToken1) {
            reserveIn = await simpleSwapContract.reserve1();
            reserveOut = await simpleSwapContract.reserve0();
        } else {
             // This case should ideally not happen if tokenInAddress is always token0 or token1
             console.error("Invalid tokenInAddress relative to simpleSwap's token0/token1");
             swapResultElement.innerText = "Error: Incorrect token configuration";
             return;
        }


        let expectedAmountOut = await simpleSwapContract.getAmountOut(amountInWei, reserveIn, reserveOut);
        // Set a 1% slippage tolerance for amountOutMin
        const amountOutMin = expectedAmountOut.mul(99).div(100);

        // --- SWAP ---
        const path = [tokenInAddress, tokenOutAddress];
        const toAddress = await signer.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + (20 * 60); // 20 minutes from now

        swapResultElement.innerText = "Performing swap... Please CONFIRM the final transaction in MetaMask";

        const transaction = await simpleSwapContract.swapExactTokensForTokens(
            amountInWei,
            amountOutMin,
            path,
            toAddress,
            deadline
        );

        const receipt = await transaction.wait();
        console.log("Swap transaction successful:", receipt);
        const tokenOutSymbol = tokenInSelection === 'A' ? await tokenBContract.symbol() : await tokenAContract.symbol();
        swapResultElement.innerText = `Swap successful! You received ~${ethers.utils.formatUnits(expectedAmountOut, await tokenInContract.decimals())} ${tokenOutSymbol}. Hash: ${receipt.transactionHash.substring(0, 6)}...${receipt.transactionHash.substring(receipt.transactionHash.length - 4)}`;
    } catch (error) {
        console.error("Error performing swap:", error);
        if (error.code === 4001) {
            swapResultElement.innerText = "Transaction rejected by the user (approval or swap)";
        } else if (error.reason && error.reason.includes("execution reverted")) {
            swapResultElement.innerText = `Swap error: Transaction reverted`;
        } else {
            swapResultElement.innerText = `Error performing swap: ${error.message || error.reason || "Check the console for more details"}`;
        }
    }
}

async function getPrice() {
    if (!simpleSwapContract) {
        alert("Please connect your wallet first");
        return;
    }

    const tokenA_price_selection = document.getElementById("tokenA_price").value;
    const tokenB_price_selection = document.getElementById("tokenB_price").value;
    const priceDisplayElement = document.getElementById("priceDisplay");

    let priceTokenA;
    let priceTokenB;

    if (tokenA_price_selection === 'A') {
        priceTokenA = tokenAAddress;
    } else if (tokenA_price_selection === 'B') {
        priceTokenA = tokenBAddress;
    } else {
        priceDisplayElement.innerText = "Invalid Token A selection for price";
        return;
    }

    if (tokenB_price_selection === 'A') {
        priceTokenB = tokenAAddress;
    } else if (tokenB_price_selection === 'B') {
        priceTokenB = tokenBAddress;
    } else {
        priceDisplayElement.innerText = "Invalid Token B selection for price";
        return;
    }

    if (priceTokenA === priceTokenB) {
        priceDisplayElement.innerText = "Cannot get the price of a token in terms of itself";
        return;
    }

    try {
        const price = await simpleSwapContract.getPrice(priceTokenA, priceTokenB);

        // Get decimals for Token B (the quote token in "Price A in B")
        let decimalsQuoteToken = 18;
        try {
            decimalsQuoteToken = (priceTokenB === tokenAAddress) ? await tokenAContract.decimals() : await tokenBContract.decimals();
        } catch (error) {
            console.warn("Couldn't get the reference token's decimals for the price. Using 18 as default", error);
        }

        const formattedPrice = ethers.utils.formatUnits(price, 18); // Price is scaled by 1e18 in contract
        
        const symbolTokenA = (priceTokenA === tokenAAddress) ? await tokenAContract.symbol() : await tokenBContract.symbol();
        const symbolTokenB = (priceTokenB === tokenAAddress) ? await tokenAContract.symbol() : await tokenBContract.symbol();

        priceDisplayElement.innerText = `1 ${symbolTokenA} = ${formattedPrice} ${symbolTokenB}`;

    } catch (error) {
        console.error("Error getting price:", error);
        if (error.reason && error.reason.includes("Invalid token")) {
             priceDisplayElement.innerText = "Error: Invalid tokens selected for the pool. Check the contracts";
        } else if (error.reason && error.reason.includes("reverted")) {
             priceDisplayElement.innerText = "Error: Transaction reverted";
        }
        else {
            priceDisplayElement.innerText = `Error getting price: ${error.message || error.reason || "Check the console for more details"}`;
        }
    }
}