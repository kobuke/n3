import { NextRequest, NextResponse } from "next/server";
import { getNFTById } from "@/lib/thirdweb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nftId: string }> }
) {
  const { nftId } = await params;
  const contractAddress = _req.nextUrl.searchParams.get("contract") || process.env.NEXT_PUBLIC_COLLECTION_ID;

  if (!contractAddress) {
    return NextResponse.json(
      { error: "Collection ID not configured" },
      { status: 500 }
    );
  }

  try {
    let nft: any;
    try {
      nft = await getNFTById(contractAddress, nftId);
    } catch (err: any) {
      console.error("fetch NFT failed:", err.message);
      return NextResponse.json({ error: "NFT not found" }, { status: 404 });
    }

    if (!nft) {
      return NextResponse.json({ error: "NFT not found" }, { status: 404 });
    }

    let imageUrl = nft.metadata?.image || "";
    if (imageUrl.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    const formattedNft = {
      tokenId: nft.id.toString(),
      contractAddress: contractAddress,
      name: nft.metadata?.name || `NFT #${nft.id.toString()}`,
      description: nft.metadata?.description || "",
      image: imageUrl,
      metadata: {
        name: nft.metadata?.name || "",
        description: nft.metadata?.description || "",
        image: imageUrl,
        attributes: nft.metadata?.attributes || []
      }
    };

    return NextResponse.json(formattedNft);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT detail error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
