import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    const uri = "ipfs://QmPynWYEF4eV8iMZU8nzroPJ7iqH3KYAPYpt3eYygrVQFc/0";
    const url = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    const res = await fetch(url);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}

main().catch(console.error);
