import { createThirdwebClient, getContract } from "thirdweb";
import { polygon, polygonAmoy } from "thirdweb/chains";

// Client for frontend / standard SDK usage
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});

const ENGINE_URL = process.env.THIRDWEB_ENGINE_URL || "";
const ENGINE_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN || "";
const ENGINE_BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET || "";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${ENGINE_ACCESS_TOKEN}`,
  "x-backend-wallet-address": ENGINE_BACKEND_WALLET,
};

/**
 * Mint NFT via thirdweb Engine (Backend Wallet)
 */
export async function mintTo(
  chain: string,
  contractAddress: string,
  receiverAddress: string,
  metadata: any
) {
  const url = `https://${ENGINE_URL}/contract/${chain}/${contractAddress}/erc1155/mint-to`;

  const body = {
    receiver: receiverAddress,
    metadataWithSupply: {
      supply: "1",
      metadata: metadata,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[thirdweb Engine Mint Error] Status: ${res.status}, Response: ${errorText}`);
    throw new Error(`Engine mintTo error: ${res.status} ${errorText}`);
  }

  return res.json();
}

/**
 * Transfer NFT via thirdweb Engine (Backend Wallet)
 * Used mainly for Escrow transfer (Backend Wallet -> Claimer)
 */
export async function transfer(
  chain: string,
  contractAddress: string,
  toAddress: string,
  tokenId: string,
  amount: string = "1"
) {
  const url = `${ENGINE_URL}/contract/${chain}/${contractAddress}/erc1155/transfer`;

  const body = {
    to: toAddress,
    tokenId,
    amount,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[thirdweb Engine Transfer Error] Status: ${res.status}, Response: ${errorText}`);
    throw new Error(`Engine transfer error: ${res.status} ${errorText}`);
  }

  return res.json();
}

/**
 * Burn NFT from a specific address via thirdweb Engine
 * Note: Requires approval from the user's wallet to the Backend Wallet
 * If using an SBT with a custom 'use' function, you would call /write instead.
 */
export async function burnFrom(
  chain: string,
  contractAddress: string,
  accountAddress: string,
  tokenId: string,
  amount: string = "1"
) {
  const url = `${ENGINE_URL}/contract/${chain}/${contractAddress}/erc1155/burn-from`;

  const body = {
    account: accountAddress,
    tokenId,
    amount,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[thirdweb Engine Burn Error] Status: ${res.status}, Response: ${errorText}`);
    throw new Error(`Engine burnFrom error: ${res.status} ${errorText}`);
  }

  return res.json();
}

/**
 * Fetch NFTs for a specific wallet address using thirdweb SDK
 */
export async function getNFTsForWallet(
  contractAddress: string,
  walletAddress: string,
  chain = process.env.NEXT_PUBLIC_CHAIN_NAME === "polygon-amoy" ? polygonAmoy : polygon
) {
  const contract = getContract({
    client,
    chain,
    address: contractAddress as `0x${string}`,
  });

  // The contract is ERC721 based on our checks. We use the erc721 extension to get owned NFTs.
  try {
    const { getOwnedNFTs } = await import("thirdweb/extensions/erc721");
    const nfts = await getOwnedNFTs({
      contract,
      owner: walletAddress,
    });
    return nfts;
  } catch (error) {
    console.error("Error fetching NFTs via thirdweb:", error);
    throw error;
  }
}

/**
 * Helper to fetch a specific NFT on a contract
 */
export async function getNFTById(
  contractAddress: string,
  tokenId: bigint | string,
  chain = process.env.NEXT_PUBLIC_CHAIN_NAME === "polygon-amoy" ? polygonAmoy : polygon
) {
  const contract = getContract({
    client,
    chain,
    address: contractAddress as `0x${string}`,
  });

  try {
    const { getNFT } = await import("thirdweb/extensions/erc1155");
    const nft = await getNFT({
      contract,
      tokenId: BigInt(tokenId),
    });
    return nft;
  } catch (error) {
    console.error("Error fetching specific NFT via thirdweb:", error);
    throw error;
  }
}
