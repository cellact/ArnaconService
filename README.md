# ArnaconService

A simple npm module for registering subdomains on the Arnacon ENS system.

## Installation

### From GitHub (Recommended for development)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ArnaconService.git
cd ArnaconService

# Install dependencies
npm install

# Copy environment example and configure
cp .env.example .env
# Edit .env with your private key
```

### As an npm dependency

```bash
npm install git+https://github.com/matan-fridman/ArnaconService.git
```

## Quick Start

1. **Setup Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your private key:
   ```
   PRIVATE_KEY=your_private_key_here_without_0x_prefix
   ```

2. **Run the Example**
   ```bash
   npm run example
   ```

3. **Use in Your Project**
   ```javascript
   const ArnaconService = require('arnacon-service');
   
   async function main() {
       const service = new ArnaconService();
       const walletAddress = await service.init(process.env.PRIVATE_KEY);
       
       // Register a subdomain
       const result = await service.registerSubdomain(
           "myapp",          // label
           "example",        // parent domain
           walletAddress,    // owner address
           30               // duration in days
       );
       
       console.log("Registration successful:", result);
   }
   
   main().catch(console.error);
   ```

## Usage

```javascript
const ArnaconService = require('arnacon-service');

async function main() {
    const service = new ArnaconService();
    
    // Initialize with private key
    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = "https://rpc-amoy.polygon.technology/"; // Optional, defaults to Polygon Amoy
    
    const walletAddress = await service.init(privateKey, rpcUrl);
    
    // Get owned names
    const names = await service.getOwnedNames();
    console.log("Owned names:", names);
    
    // Register a subdomain
    try {
        const result = await service.registerSubdomain(
            "test",           // label (subdomain)
            "example",        // parent domain name  
            walletAddress,    // owner address (optional, defaults to your wallet)
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

### `new ArnaconService()`

Creates a new instance of the ArnaconService.

### `init(privateKey, rpcUrl?, contractAddresses?)`

Initializes the ArnaconService with a private key and network configuration.

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
- ArnaconService not initialized
- Missing required parameters
- Contract not found
- Transaction failures

Always wrap calls in try-catch blocks for proper error handling.

## License

MIT 