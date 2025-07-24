const { ethers } = require('ethers');
const { namehash } = require('ethers/lib/utils');
const { getNetworkByChainId } = require('./networks');

class ArnaconService {
    constructor() {
        this.signer = null;
        this.provider = null;
        this.contracts = {};
        this.secondLevelController = null;
        this.secondLevelInteractor = null;
        this.chainId = null;
        this.gasMultiplier = 120;
    }

    /**
     * Initialize the registrar with a private key and chainId
     * @param {string} privateKey - Private key for the wallet
     * @param {number} chainId - Chain ID for the blockchain network
     * @param {string} rpcUrl - RPC URL for the blockchain network (optional, will be set based on chainId)
     * @param {object} contractAddresses - Object containing contract addresses (optional, will be loaded based on chainId)
     */
    async init(privateKey, chainId, rpcUrl = null, contractAddresses = null) {
        try {
            // Get network configuration based on chainId
            const network = getNetworkByChainId(chainId);
            this.chainId = chainId;
            
            // Set default RPC URL based on chainId if not provided
            if (!rpcUrl) {
                rpcUrl = network.rpcUrl;
            }

            // Setup provider and signer
            this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            this.signer = new ethers.Wallet(privateKey, this.provider);
            console.log("Signer:", this.signer.address);
            
            // Load contract addresses from network config if not provided
            if (!contractAddresses) {
                try {
                    this.contracts = network.contractAddresses;
                    console.log(`Loaded contract addresses for chainId ${chainId}`);
                } catch (fileError) {
                    console.warn(`Could not load contract addresses for chainId ${chainId}: ${fileError.message}`);
                    this.contracts = {};
                }
            } else {
                this.contracts = contractAddresses;
            }

            // Initialize second level controller and interactor for the signer's address
            await this._initializeSecondLevelContracts();

            console.log(`Initialized with wallet address: ${this.signer.address}`);
            console.log(`Chain ID: ${chainId}`);

            if(this.chainId === 23295){
                this.gasMultiplier = 300;
            }

            return this.signer.address;
        } catch (error) {
            throw new Error(`Failed to initialize: ${error.message}`);
        }
    }

    /**
     * Private method to initialize second level controller and interactor
     */
    async _initializeSecondLevelContracts() {
        if (!this.contracts.GlobalRegistrarController) {
            console.warn('GlobalRegistrarController address not found, skipping second level contract initialization');
            return;
        }

        try {
            // GlobalRegistrarController ABI (minimal)
            const globalRegistrarControllerABI = [
                "function get2LDControllerFor(address owner) view returns (address)"
            ];

            // SecondLevelController ABI (minimal)
            const secondLevelControllerABI = [
                "function getSecondLevelInteractor() view returns (address)",
                "function getRegisteredNames() view returns (string[] memory)"
            ];

            // SecondLevelInteractor ABI (minimal)
            const secondLevelInteractorABI = [
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "signer",
                            "type": "address"
                        },
                        {
                            "internalType": "address",
                            "name": "receiver",
                            "type": "address"
                        },
                        {
                            "internalType": "string",
                            "name": "name",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "label",
                            "type": "string"
                        },
                        {
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bytes",
                            "name": "signature",
                            "type": "bytes"
                        }
                    ],
                    "name": "verifyProductAndActivate",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "owner",
                            "type": "address"
                        },
                        {
                            "internalType": "string",
                            "name": "name",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "label",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "metadata",
                            "type": "string"
                        },
                        {
                            "internalType": "uint64",
                            "name": "expiry",
                            "type": "uint64"
                        }
                    ],
                    "name": "registerSubnodeAndMint",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ];
            console.log("settings contracts with signer address:", this.signer.address);
            const globalRegistrarController = new ethers.Contract(
                this.contracts.GlobalRegistrarController,
                globalRegistrarControllerABI,
                this.signer
            );

            const secondLevelControllerAddress = await globalRegistrarController.get2LDControllerFor(this.signer.address);
            
            if (secondLevelControllerAddress === "0x0000000000000000000000000000000000000000") {
                console.warn(`No SecondLevelController found for address: ${this.signer.address}`);
                return;
            }

            this.secondLevelController = new ethers.Contract(
                secondLevelControllerAddress,
                secondLevelControllerABI,
                this.signer
            );

            const secondLevelInteractorAddress = await this.secondLevelController.getSecondLevelInteractor();
            
            this.secondLevelInteractor = new ethers.Contract(
                secondLevelInteractorAddress,
                secondLevelInteractorABI,
                this.signer
            );
        } catch (error) {
            console.warn(`Failed to initialize second level contracts: ${error.message}`);
        }
    }

    /**
     * Register a subdomain
     * @param {string} label - The subdomain label (e.g., "test" for test.example.global)
     * @param {string} name - The parent domain name (e.g., "example" for test.example.global)
     * @param {string} ownerAddress - Address that will own the subdomain (optional, defaults to signer address)
     * @param {string} productType - Product type for the registration
     * @returns {object} Transaction result
     */
    async registerSubdomain(label, name, ownerAddress, productType, durationInDays = 10) {
        if (!this.signer) {
            throw new Error('Registrar not initialized. Call init() first.');
        }

        if (!label || !name) {
            throw new Error('Label and name are required');
        }

        // Calculate expiry timestamp 10 days from now
        const expiry = Math.floor(Date.now() / 1000) + (durationInDays * 24 * 60 * 60);

        try {
            console.log("Getting interactor...");
            // Use cached interactor if available for signer's address
            const interactor = this.secondLevelInteractor;
            console.log("interactor:", interactor.address);
            console.log(`Registering ${label}.${name}.global for ${ownerAddress || 'current signer'} until ${new Date(expiry * 1000)}`);
            
            // Get ProductTypeRegistry address (assuming it's in contracts)
            const productTypeRegistryAddress = this.contracts.ProductTypeRegistry || "0x0000000000000000000000000000000000000000";
            
            // Create metadata for on-chain storage (full JSON keys for flexibility)
            const metadata = JSON.stringify({
                name: `${label}.${name}.global`,
                number: label,
                productType: productType,
                typeRegistry: productTypeRegistryAddress,
                description: "Domain + product service",
                expiry: expiry,
                registrationTimestamp: Math.floor(Date.now() / 1000),
                category: "domain",
                version: "1.0"
            });

            // Estimate gas
            let gasLimit = 5000000;
            try {
                const gasEstimate = await interactor.estimateGas.registerSubnodeAndMint(ownerAddress, name, label, metadata, expiry);
                gasLimit = gasEstimate.mul(this.gasMultiplier).div(100); // Add 20% buffer
            } catch (error) {
                console.warn(`Error estimating gas, using default: ${error.message}`);
            }

            const txOptions = {
                gasLimit,
                maxPriorityFeePerGas: ethers.BigNumber.from("25000000000"), // 25 gwei
                maxFeePerGas: ethers.BigNumber.from("50000000000")          // 50 gwei
            };

            console.log(`Registering subdomain ${label}.${name}.global`);
            const registerTx = await interactor.registerSubnodeAndMint(ownerAddress, name, label, metadata, expiry, txOptions);
            console.log("Registering subdomain...", registerTx.hash);
            
            const receipt = await registerTx.wait();
            console.log("Subdomain registered successfully!");

            return {
                success: true,
                subdomain: `${label}.${name}.global`,
                owner: ownerAddress,
                expiry: new Date(expiry * 1000),
                transactionHash: registerTx.hash,
                blockNumber: receipt.blockNumber,
                metadata: JSON.parse(metadata)
            };

        } catch (error) {
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    /**
     * Get owned names for a given address
     * @param {string} address - Address to get owned names for (optional, defaults to signer address)
     * @returns {array} Array of registered names
     */
    async getOwnedNames() {
        if (!this.signer) {
            throw new Error('Registrar not initialized. Call init() first.');
        }

        // If requesting names for the signer's address and we have cached controller, use it
        if (this.secondLevelController) {
            try {
                const names = await this.secondLevelController.getRegisteredNames();
                console.log("got names: ", names);
                return names;
            } catch (error) {
                console.error("Failed to get owned names from cached controller:", error.message);
                throw new Error(`Failed to get owned names: ${error.message}`);
            }
        }

    }

    /**
     * Get info (owner and expiry) for a given ENS name
     * @param {string} ens - ENS name to get info for
     * @returns {object} Object containing expiry and owner
     */
    async getInfo(ens) {
        if (!this.signer) {
            throw new Error('Registrar not initialized. Call init() first.');
        }

        // NameWrapper ABI (minimal)
        const nameWrapperABI = [
            "function getData(bytes32 node) view returns (address owner, uint32 fuses, uint64 expiry)"
        ];

        if (!this.contracts.NameWrapper) {
            throw new Error('NameWrapper address not found in contract addresses');
        }

        try {
            const nameWrapper = new ethers.Contract(
                this.contracts.NameWrapper,
                nameWrapperABI,
                this.signer
            );

            const node = namehash.hash(ens);
            const data = await nameWrapper.getData(node);
            const expiry = data.expiry;
            const owner = data.owner;

            return { expiry, owner };

        } catch (error) {
            console.error("Failed to get info:", error.message);
            throw new Error(`Failed to get info for ${ens}: ${error.message}`);
        }
    }

    /**
     * Set contract addresses manually
     * @param {object} addresses - Object containing contract addresses
     */
    setContractAddresses(addresses) {
        this.contracts = { ...this.contracts, ...addresses };
    }

    /**
     * Get current chain ID
     * @returns {number} Chain ID
     */
    getChainId() {
        return this.chainId;
    }

    /**
     * Get current wallet address
     * @returns {string} Wallet address
     */
    getWalletAddress() {
        return this.signer ? this.signer.address : null;
    }

    /**
     * Transfer an NFT from the service provider wallet to a specified wallet
     * @param {string} nftContractAddress - The NFT contract address
     * @param {number|string} tokenId - The token ID to transfer
     * @param {string} wallet - The destination wallet address
     * @returns {object} Transaction result
     */
    async transferNFT(nftContractAddress, tokenId, wallet) {
        if (!this.signer) {
            throw new Error('Registrar not initialized. Call init() first.');
        }

        if (!nftContractAddress || (!tokenId && tokenId !== 0) || !wallet) {
            throw new Error('NFT contract address, token ID, and destination wallet are required');
        }

        try {
            // ERC721 ABI for safeTransferFrom
            const erc721ABI = [
                "function safeTransferFrom(address from, address to, uint256 tokenId)",
                "function ownerOf(uint256 tokenId) view returns (address)"
            ];

            const nftContract = new ethers.Contract(
                nftContractAddress,
                erc721ABI,
                this.signer
            );
            let owner;
            try{
                owner = await nftContract.ownerOf(tokenId);
            }catch(error){
                throw new Error('NFT not found');
            }
            if (owner !== this.signer.address) {
                throw new Error('You are not the owner of this NFT');
            }
            console.log(`Transferring NFT ${tokenId} from ${this.signer.address} to ${wallet}`);

            // Estimate gas
            let gasLimit = 200000;
            try {
                const gasEstimate = await nftContract.estimateGas.safeTransferFrom(
                    this.signer.address,
                    wallet,
                    tokenId
                );
                gasLimit = gasEstimate.mul(this.gasMultiplier).div(100); // Add 20% buffer
            } catch (error) {
                console.warn(`Error estimating gas, using default: ${error.message}`);
            }

            const txOptions = {
                gasLimit,
                maxPriorityFeePerGas: ethers.BigNumber.from("50000000000"), // 50 gwei
                maxFeePerGas: ethers.BigNumber.from("100000000000")          // 100 gwei
            };

            const transferTx = await nftContract.safeTransferFrom(
                this.signer.address,
                wallet,
                tokenId,
                txOptions
            );

            console.log("Transferring NFT...", transferTx.hash);
            
            const receipt = await transferTx.wait();
            console.log("NFT transferred successfully!");

            return {
                success: true,
                tokenId: tokenId,
                from: this.signer.address,
                to: wallet,
                nftContractAddress: nftContractAddress,
                transactionHash: transferTx.hash,
                blockNumber: receipt.blockNumber
            };

        } catch (error) {
            throw new Error(`NFT transfer failed: ${error.message}`);
        }
    }

    /**
     * Verify product and register subdomain with signature verification
     * @param {string} owner - The owner address for the subdomain
     * @param {string} name - The parent domain name (e.g., "example" for test.example.global)
     * @param {string} label - The subdomain label (e.g., "test" for test.example.global)
     * @param {number} timestamp - The timestamp for signature verification
     * @param {string} signature - The signature for verification
     * @returns {object} Transaction result
     */
    async verifyProductAndActivate(receiver, name, label, timestamp, signature) {
        if (!this.signer) {
            throw new Error('Registrar not initialized. Call init() first.');
        }

        if (!receiver || !name || !label || !timestamp || !signature) {
            throw new Error('Receiver, name, label, timestamp, and signature are required');
        }

        if (!this.secondLevelInteractor) {
            throw new Error('Second level interactor not initialized. Call init() first.');
        }

        try {

            console.log(`Verifying product and registering ${label}.${name}.global for ${receiver}`);
            console.log(`Timestamp: ${timestamp}, Signature: ${signature}`);
            console.log("interactor:", this.secondLevelInteractor.address);

            // Estimate gas
            let gasLimit = 5000000;
            try {
                const gasEstimate = await this.secondLevelInteractor.estimateGas.verifyProductAndActivate(
                    receiver,
                    receiver,
                    name,
                    label,
                    timestamp,
                    signature
                );
                gasLimit = gasEstimate.mul(this.gasMultiplier).div(100); // Add 20% buffer
            } catch (error) {
                console.warn(`Error estimating gas, using default: ${error.message}`);
            }

            const txOptions = {
                gasLimit,
                maxPriorityFeePerGas: ethers.BigNumber.from("50000000000"), // 50 gwei
                maxFeePerGas: ethers.BigNumber.from("100000000000")          // 100 gwei
            };

            const verifyTx = await this.secondLevelInteractor.verifyProductAndActivate(
                receiver,
                receiver,
                name,
                label,
                timestamp,
                signature,
                txOptions
            );

            console.log("Verifying product and registering...", verifyTx.hash);
            
            const receipt = await verifyTx.wait();
            console.log("Product verified and subdomain registered successfully!");

            return {
                success: true,
                subdomain: `${label}.${name}.global`,
                receiver: receiver,
                timestamp: timestamp,
                transactionHash: verifyTx.hash,
                blockNumber: receipt.blockNumber
            };

        } catch (error) {
            throw new Error(`Product verification and registration failed: ${error.message}`);
        }
    }
}

module.exports = ArnaconService; 