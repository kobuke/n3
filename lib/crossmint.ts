const BASE_URL = "https://www.crossmint.com/api";

function headers() {
  return {
    "X-API-KEY": process.env.CROSSMINT_API_KEY!,
    "Content-Type": "application/json",
  };
}

export async function getWalletByEmail(email: string) {
  const res = await fetch(
    `${BASE_URL}/2025-06-09/wallets/email:${encodeURIComponent(email)}:evm:smart`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wallet lookup failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getNFTs(identifier: string) {
  const res = await fetch(
    `${BASE_URL}/2025-06-09/wallets/${identifier}/nfts`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NFT fetch failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getNFTById(collectionId: string, nftId: string) {
  const res = await fetch(
    `${BASE_URL}/2022-06-09/collections/${collectionId}/nfts/${nftId}`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NFT detail fetch failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function updateNFTMetadata(
  collectionId: string,
  nftId: string,
  metadata: any
) {
  const res = await fetch(
    `${BASE_URL}/2022-06-09/collections/${collectionId}/nfts/${nftId}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        metadata,
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NFT update failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getCollections() {
  const res = await fetch(`${BASE_URL}/2022-06-09/collections`, {
    headers: headers()
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch collections: ${res.statusText}`);
  }

  return await res.json();
}

export async function getTemplates(collectionId: string) {
  const res = await fetch(`${BASE_URL}/2022-06-09/collections/${collectionId}/templates`, {
    headers: headers()
  });

  if (!res.ok) {
    // Some collections might not support templates, return empty
    return [];
  }

  return await res.json();
}

export async function mintNFT(
  collectionLocator: string, // format: collectionId or collectionId:templateId
  recipientEmail: string,
  recipientWallet: string | null
) {
  const [collectionId, templateId] = collectionLocator.split(':');

  const recipient = recipientWallet
    ? `polygon:${recipientWallet}` // Assuming Polygon for now
    : `email:${recipientEmail}:polygon`;

  console.log(`[Minting] Collection: ${collectionId}, Template: ${templateId || 'None'}, Recipient: ${recipient}`);

  const body: any = {
    recipient,
    metadata: {
      name: "Nomad Resort NFT",
      description: "Minted via Shopify Webhook",
    }
  };

  if (templateId) {
    body.templateId = templateId;
    // If template is used, metadata is usually handled by template, 
    // but we can override if needed. 
    // For now, let's remove metadata if template is present to avoid conflict unless specific logic needed.
    delete body.metadata;
  }

  const res = await fetch(`${BASE_URL}/2022-06-09/collections/${collectionId}/nfts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[Minting Error] Status: ${res.status}, Response: ${errorText}`);
    throw new Error(`Crossmint API error: ${res.status} ${errorText}`);
  }

  return await res.json();
}
