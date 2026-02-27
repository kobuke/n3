import { createThirdwebClient, getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { readContract } from "thirdweb";
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

  const uri = await readContract({
    contract,
    method: "function uri(uint256) view returns (string)",
    params: [2n],
  });
  console.log("URI for 2:", uri);
}

main().catch(console.error);
