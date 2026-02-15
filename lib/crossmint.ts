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
