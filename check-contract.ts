import { createThirdwebClient, getContract, readContract, resolveMethod } from "thirdweb";
import { polygon } from "thirdweb/chains";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    const client = createThirdwebClient({
        clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
    });

    const contract = getContract({
        client,
        chain: polygon,
        address: "0xF7c4fd3Ee759cAF58c3fE11344DC5FE24E993fE8",
    });

    try {
        const is1155 = await readContract({
            contract,
            method: "function supportsInterface(bytes4) returns (bool)",
            params: ["0xd9b67a26"]
        });
        console.log("Is ERC1155?", is1155);

        const is721 = await readContract({
            contract,
            method: "function supportsInterface(bytes4) returns (bool)",
            params: ["0x80ac58cd"]
        });
        console.log("Is ERC721?", is721);
    } catch (e) {
        console.error("Failed to read supportsInterface", e);
    }
}

main().catch(console.error);
