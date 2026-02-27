import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    const ENGINE_URL = process.env.THIRDWEB_ENGINE_URL || "";
    const ENGINE_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN || "";
    const ENGINE_BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET || "";

    const chain = "Polygon"; // or your chain id 137
    const contractAddress = "0xa5028B6aA265EEC937D031E17D5998B9fe11eb8A"; // Ticket contract
    const tokenId = "0";

    // Using the Thirdweb Engine generic /write endpoint
    // To update metadata, we need to know the function signature.
    // Wait, let's check what extensions are on this deployed contract via Engine.
    const extRes = await fetch(`https://${ENGINE_URL}/contract/${chain}/${contractAddress}/extensions`, {
        headers: { Authorization: `Bearer ${ENGINE_ACCESS_TOKEN}` }
    });
    const exts = await extRes.json();
    console.log("Extentions Supported:", JSON.stringify(exts.result, null, 2));
}

main().catch(console.error);
