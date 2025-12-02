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
        // Register a subdomain
        const label = "helloi";           // This will create myapp.example.global
        const parentName = "bank";     // The parent domain (should already be registered)
        const ownerAddress = "0xc38C9Adf157429386B2eb452Ba7332cCd4c8F122"; // Owner of the new subdomain
        const durationInDays = 30;       // Valid for 30 days

        console.log(`Registering ${label}.${parentName}.global...`)
        const result = await service.registerSubdomain(
            label,
            parentName,
            ownerAddress,
            durationInDays
        );
        return

        const timestamp = 1753352674
        const signature = "0x3a4f085f70d3f16b1a448ec8c62637252a2d505cc63b9d299017a36658572b5806a84fa2b772a818639cc918178941fd034db5d0e20a5b7b1080d95cf717e12a1c"
        await service.verifyProductAndActivate("0x2c859fcBEbfD1f49854c6131d33A45FdeCC5055e", "cellactl", "972797001020", timestamp, signature);

        
        
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