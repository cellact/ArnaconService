const { amoy } = require('./amoy');
const { polygon } = require('./polygon');
const { sapphireTestnet } = require('./sapphire-testnet');
const { hoodi } = require('./hoodi');

const networkToChainId = {
    'polygon': 137,
    'amoy': 80002,
    'sepolia': 11155111,
    'hoodi': 560048,
    'tara': 841,
    'sapphire': 23295
};

const chainIdToNetwork = {
    137: polygon,
    80002: amoy,
    11155111: null, // sepolia - placeholder for future implementation
    11155420: null, // hoodi - placeholder for future implementation
    841: null,      // tara - placeholder for future implementation
    23295: sapphireTestnet,     // sapphire - placeholder for future implementation
    560048: hoodi
};

/**
 * Get network configuration by chainId
 * @param {number} chainId - The chain ID
 * @returns {object} Network configuration object with rpcUrl and contractAddresses
 */
function getNetworkByChainId(chainId) {
    const network = chainIdToNetwork[chainId];
    if (!network) {
        throw new Error(`Unsupported chainId: ${chainId}. Supported chainIds: ${Object.keys(chainIdToNetwork).join(', ')}`);
    }
    return network;
}

module.exports = {
    networkToChainId,
    chainIdToNetwork,
    getNetworkByChainId
}; 