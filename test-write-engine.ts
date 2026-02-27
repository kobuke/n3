import * as dotenv from "dotenv";
import { createThirdwebClient, getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { updateMetadata } from "thirdweb/extensions/erc1155";
import { upload } from "thirdweb/storage";

dotenv.config({ path: ".env.local" });

async function main() {
    const ENGINE_URL = process.env.THIRDWEB_ENGINE_URL || "";
    const ENGINE_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN || "";
    const ENGINE_BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET || "";

    const client = createThirdwebClient({
        clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
        secretKey: process.env.THIRDWEB_SECRET_KEY || "", // Needed for upload
    });

    const chainName = "Polygon";
    const contractAddress = "0xa5028B6aA265EEC937D031E17D5998B9fe11eb8A";
    const tokenId = "0";

    try {
        // 1. First upload new metadata exactly as we want it
        const newMetadataUri = await upload({
            client,
            files: [{
                name: "ERC1155 Test Ticket (Used)",
                description: "This ticket has been used ons-chain!",
                image: "ipfs://...", // keep standard
                attributes: [
                    { trait_type: "Type", value: "ticket" },
                    { trait_type: "Status", value: "Used" }
                ]
            }]
        });

        console.log("Uploaded new metadata URI:", newMetadataUri);

        // 2. Call Engine generic write endpoint to set token URI
        // The standard Edition contract uses `setTokenURI(uint256 tokenId, string uri)`
        const setUri = await fetch(`https://${ENGINE_URL}/contract/${chainName}/${contractAddress}/write`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ENGINE_ACCESS_TOKEN}`,
                "x-backend-wallet-address": ENGINE_BACKEND_WALLET,
            },
            body: JSON.stringify({
                functionName: "setTokenURI(uint256,string)",
                args: [tokenId, newMetadataUri]
            })
        });

        const res = await setUri.json();
        console.log("Engine response:", res);

    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

main().catch(console.error);
