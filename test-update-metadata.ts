import { createThirdwebClient, getContract, sendTransaction } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { updateMetadata } from "thirdweb/extensions/erc1155";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    const client = createThirdwebClient({
        clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
    });

    const contract = getContract({
        client,
        chain: polygon,
        address: "0xa5028B6aA265EEC937D031E17D5998B9fe11eb8A",
    });

    try {
        const tx = updateMetadata({
            contract,
            targetTokenId: 0n,
            newMetadata: {
                name: "ERC1155 Test Ticket (Updated)",
                description: "This ticket has been updated to Used!",
                attributes: [
                    { trait_type: "Status", value: "Used" }
                ]
            }
        });

        console.log("Transaction created successfully. It supports updateMetadata!");
        console.log(tx);
    } catch (error: any) {
        console.error("Not supported:", error.message);
    }
}

main().catch(console.error);
