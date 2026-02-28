import { getWalletBalance } from "thirdweb/wallets";
import { polygon } from "thirdweb/chains";
import { client } from "./lib/thirdweb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
    try {
        const balance = await getWalletBalance({
            client,
            chain: polygon,
            address: process.env.THIRDWEB_ENGINE_BACKEND_WALLET!
        });
        console.log("Balance:", balance.displayValue, balance.symbol);
    } catch(e) { console.error(e); }
}
run();
