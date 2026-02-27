import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    const queueId = "5b0b36c9-167f-463d-87a4-9b0b29eb165a";
    const url = `https://${process.env.THIRDWEB_ENGINE_URL}/transaction/status/${queueId}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.THIRDWEB_ENGINE_ACCESS_TOKEN}`,
        },
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
