import { createThirdwebClient, getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""
});

async function main() {
  console.log("clientId:", process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID);
  
  const contract = getContract({
    client,
    chain: polygon,
    address: "0xF7c4fd3Ee759cAF58c3fE11344DC5FE24E993fE8",
  });
  
  console.log(contract);
}

main();
