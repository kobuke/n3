import { NextRequest, NextResponse } from "next/server";
import { getNFTById } from "@/lib/crossmint";
import { getNFTMetadata } from "@/lib/alchemy";

// CrossmintのリストからTokenIDでNFTを検索するヘルパー
async function findNFTInCrossmint(collectionId: string, tokenId: string) {
  try {
    const apiKey = process.env.CROSSMINT_API_KEY;
    const res = await fetch(
      `https://www.crossmint.com/api/2022-06-09/collections/${collectionId}/nfts?perPage=50`,
      {
        headers: {
          "X-API-KEY": apiKey || "",
        },
      }
    );
    if (!res.ok) return null;
    const nfts = await res.json();
    return nfts.find((n: any) => n.onChain?.tokenId === tokenId);
  } catch (e) {
    console.error("Error searching in Crossmint:", e);
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nftId: string }> }
) {
  const { nftId } = await params;
  const contractAddress = process.env.NEXT_PUBLIC_COLLECTION_ID;
  const crossmintCollectionId = process.env.CROSSMINT_COLLECTION_ID;

  if (!contractAddress || !crossmintCollectionId) {
    return NextResponse.json(
      { error: "Collection IDs not configured" },
      { status: 500 }
    );
  }

  try {
    let nft: any;
    const isUUID = nftId.includes("-");

    if (isUUID) {
      console.log(`Using Crossmint for detail (UUID): ${nftId}`);
      nft = await getNFTById(crossmintCollectionId, nftId);
    } else {
      console.log(`Searching Crossmint for dynamic metadata (Token ID: ${nftId})`);
      const crossmintNft = await findNFTInCrossmint(crossmintCollectionId, nftId);

      if (crossmintNft) {
        console.log("Found dynamic metadata in Crossmint.");
        nft = crossmintNft;
      } else {
        console.log("Not found in Crossmint, falling back to Alchemy.");
        nft = await getNFTMetadata(contractAddress, nftId);
      }
    }

    // Normalize image URL logic to handle IPFS and different providers
    let imageUrl =
      nft.image?.cachedUrl ||
      nft.image?.thumbnailUrl ||
      nft.image?.originalUrl ||
      nft.metadata?.image ||
      nft.raw?.metadata?.image ||
      "";

    // Handle ipfs:// prefix
    if (imageUrl.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    // Format for frontend
    const formattedNft = {
      uuid: nft.id || (isUUID ? nftId : null),
      tokenId: nft.onChain?.tokenId || nft.tokenId,
      contractAddress: nft.onChain?.contractAddress || nft.contract?.address,
      name: nft.name || nft.metadata?.name || nft.raw?.metadata?.name || `NFT #${nft.tokenId}`,
      description: nft.description || nft.metadata?.description || nft.raw?.metadata?.description,
      image: imageUrl,
      metadata: {
        name: nft.name || nft.metadata?.name || nft.raw?.metadata?.name,
        description: nft.description || nft.metadata?.description || nft.raw?.metadata?.description,
        image: imageUrl,
        attributes: nft.metadata?.attributes ?? nft.raw?.metadata?.attributes ?? []
      }
    };

    return NextResponse.json(formattedNft);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT detail error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
