import { createThirdwebClient, getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { getOwnedNFTs } from "thirdweb/extensions/erc1155";
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

  const nfts = await getOwnedNFTs({
    contract,
    address: "0xF945aD76B4b9074AE2e71bfa112E33bD07a13809",
  });

  console.log(JSON.stringify(nfts, null, 2));
}

main().catch(console.error);
