
const CROSSMINT_API_URL = 'https://staging.crossmint.com/api'; // Use staging for now? v0 prompt didn't specify, but safer. Or production.
// Given it is "NomadResort", likely production or they will switch. 
// I will use a constant that can be possibly overridden by env var if needed, or default to production if no env var implies staging.
// Actually, usually it's `www.crossmint.com` for prod and `staging.crossmint.com` for staging.
// Let's assume production but check 'CROSSMINT_ENV' or similar? 
// For now I'll hardcode to 'www.crossmint.com' but mentioned in comment.

const BASE_URL = process.env.CROSSMINT_ENV === 'staging' ? 'https://staging.crossmint.com/api' : 'https://www.crossmint.com/api';

export async function getCollections() {
    if (!process.env.CROSSMINT_API_KEY) {
        throw new Error('CROSSMINT_API_KEY is not defined');
    }

    const response = await fetch(`${BASE_URL}/2022-06-09/collections`, {
        headers: { 'X-API-KEY': process.env.CROSSMINT_API_KEY }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch collections: ${response.statusText}`);
    }

    return await response.json();
}

export async function getTemplates(collectionId: string) {
    if (!process.env.CROSSMINT_API_KEY) {
        throw new Error('CROSSMINT_API_KEY is not defined');
    }

    const response = await fetch(`${BASE_URL}/2022-06-09/collections/${collectionId}/templates`, {
        headers: { 'X-API-KEY': process.env.CROSSMINT_API_KEY }
    });

    if (!response.ok) {
        // Some collections might not support templates, return empty
        return [];
    }

    return await response.json();
}

export async function mintNFT(
    collectionLocator: string, // format: collectionId or collectionId:templateId
    recipientEmail: string,
    recipientWallet: string | null
) {
    if (!process.env.CROSSMINT_API_KEY) {
        throw new Error('CROSSMINT_API_KEY is not defined');
    }

    const [collectionId, templateId] = collectionLocator.split(':');

    const recipient = recipientWallet
        ? `polygon:${recipientWallet}` // Assuming Polygon for now
        : `email:${recipientEmail}:polygon`;

    console.log(`[Minting] Collection: ${collectionId}, Template: ${templateId || 'None'}, Recipient: ${recipient}`);

    const body: any = {
        recipient
    };

    // If we have a templateId, we usually let the template handle metadata.
    // Only add metadata if we are NOT using a template, or if we specifically want to override.
    if (templateId) {
        body.templateId = templateId;
    } else {
        body.metadata = {
            name: "Nomad Resort NFT",
            description: "Minted via Shopify Webhook",
        };
    }

    const response = await fetch(`${BASE_URL}/2022-06-09/collections/${collectionId}/nfts`, {
        method: 'POST',
        headers: {
            'X-API-KEY': process.env.CROSSMINT_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Minting Error] Status: ${response.status}, Response: ${errorText}`);
        throw new Error(`Crossmint API error: ${response.status} ${errorText}`);
    }

    return await response.json();
}
