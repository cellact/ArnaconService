# Subdomain Registrar

A simple npm module for registering subdomains on the Arnacon ENS system.

## Installation

```bash
npm install ./subdomain-registrar
```

## Usage

```javascript
const SubdomainRegistrar = require('subdomain-registrar');

async function main() {
    const registrar = new SubdomainRegistrar();
    
    // Initialize with private key
    const privateKey = "your-private-key-here";
    const rpcUrl = "https://rpc-amoy.polygon.technology/"; // Optional, defaults to Polygon Amoy
    
    await registrar.init(privateKey, rpcUrl);
    
    // Register a subdomain
    try {
        const result = await registrar.registerSubdomain(
            "test",           // label (subdomain)
            "example",        // parent domain name  
            "0x123...",       // owner address (optional, defaults to your wallet)
            10                // duration in days (optional, defaults to 10)
        );
        
        console.log("Registration successful:", result);
        // Output: test.example.global registered successfully
        
    } catch (error) {
        console.error("Registration failed:", error.message);
    }
}

main();
```

## API Reference

### `new SubdomainRegistrar()`

Creates a new instance of the subdomain registrar.

### `init(privateKey, rpcUrl?, contractAddresses?)`

Initializes the registrar with a private key and network configuration.

**Parameters:**
- `privateKey` (string): Private key for the wallet that will sign transactions
- `rpcUrl` (string, optional): RPC URL for the blockchain network. Defaults to Polygon Amoy testnet
- `contractAddresses` (object, optional): Object containing contract addresses. If not provided, will try to load from `amoy-addresses.json`

**Returns:** Promise resolving to the wallet address

### `registerSubdomain(label, name, ownerAddress?, durationInDays?)`

Registers a new subdomain.

**Parameters:**
- `label` (string): The subdomain label (e.g., "test" for test.example.global)
- `name` (string): The parent domain name (e.g., "example" for test.example.global)  
- `ownerAddress` (string, optional): Address that will own the subdomain. Defaults to the signer's address
- `durationInDays` (number, optional): Duration in days for the registration. Defaults to 10 days

**Returns:** Promise resolving to registration result object:
```javascript
{
    success: true,
    subdomain: "test.example.global",
    owner: "0x123...",
    expiry: Date,
    transactionHash: "0xabc...",
    blockNumber: 12345
}
```

### `setContractAddresses(addresses)`

Manually set contract addresses.

**Parameters:**
- `addresses` (object): Object containing contract addresses

### `getWalletAddress()`

Get the current wallet address.

**Returns:** String wallet address or null if not initialized

## Contract Addresses

The module requires the following contract addresses to be available:
- `GlobalRegistrarController`: Address of the global registrar controller contract

You can provide these addresses either:
1. As a parameter to the `init()` function
2. By calling `setContractAddresses()` after initialization  
3. By having them in an `amoy-addresses.json` file in the current directory

## Example Contract Addresses Object

```javascript
const contractAddresses = {
    "GlobalRegistrarController": "0x1234567890123456789012345678901234567890"
};
```

## Error Handling

The module throws descriptive errors for common issues:
- Registrar not initialized
- Missing required parameters
- Contract not found
- Transaction failures

Always wrap calls in try-catch blocks for proper error handling.

## License

MIT 