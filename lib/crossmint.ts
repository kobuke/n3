const BASE_URL = "https://www.crossmint.com/api";

function headers() {
  return {
    "X-API-KEY": process.env.CROSSMINT_API_KEY!,
    "Content-Type": "application/json",
  };
}

export async function getWalletByEmail(email: string) {
  const res = await fetch(
    `${BASE_URL}/v1-alpha1/wallets/polygon:email:${encodeURIComponent(email)}:polygon`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wallet lookup failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getNFTsForWallet(address: string) {
  const res = await fetch(
    `${BASE_URL}/v1-alpha1/wallets/polygon:${address}/nfts`,
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
    `${BASE_URL}/v1-alpha1/collections/${collectionId}/nfts/${nftId}`,
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
  attributes: Array<{ trait_type: string; value: string }>
) {
  const res = await fetch(
    `${BASE_URL}/v1-alpha1/collections/${collectionId}/nfts/${nftId}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        metadata: {
          attributes,
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NFT update failed (${res.status}): ${text}`);
  }
  return res.json();
}
