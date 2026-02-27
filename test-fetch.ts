import { createThirdwebClient, getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { getNFT } from "thirdweb/extensions/erc1155";
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

    const nft = await getNFT({ contract, tokenId: 2n });
    console.log(nft);
}

main().catch(console.error);
