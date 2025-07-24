require('dotenv').config();
const ArnaconService = require('./index');

async function example() {
    
    try {
        // Initialize with your private key
        const privateKey = process.env.PRIVATE_KEY; // Replace with your actual private key
        console.log("Initializing registrar..." + privateKey);
        const service = new ArnaconService();

        const walletAddress = await service.init(privateKey, 23295);
        console.log("Initialized with wallet:", walletAddress);
        
        const names = await service.getOwnedNames();
        console.log("Names:", names);
        await service.transferNFT("0x6633D58054A80249cC9178E73D4F4373ADd76Ae4", 0, "0x2c859fcBEbfD1f49854c6131d33A45FdeCC5055e");
        return
        const timestamp = 1751293248
        const signature = ""
        await service.verifyProductAndActivate("0x2c859fcBEbfD1f49854c6131d33A45FdeCC5055e", "cellact", "5555555545", timestamp, signature);
        // Register a subdomain
        const label = "hello";           // This will create myapp.example.global
        const parentName = "final";     // The parent domain (should already be registered)
        const ownerAddress = "0xc38C9Adf157429386B2eb452Ba7332cCd4c8F122"; // Owner of the new subdomain
        const productType = "ISRAEL_100_MIN"; // Product type for the registration
        const durationInDays = 30;       // Valid for 30 days
        
        console.log(`Registering ${label}.${parentName}.global...`);
        
        const result = await service.registerSubdomain(
            label,
            parentName,
            ownerAddress,
            productType,
            durationInDays
        );
        
        console.log("✅ Registration successful!");
        console.log("Details:", result);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

// Run the example
if (require.main === module) {
    example().catch(console.error);
}

module.exports = example; 