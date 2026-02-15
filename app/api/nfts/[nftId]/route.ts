import { NextRequest, NextResponse } from "next/server";
import { getNFTById } from "@/lib/crossmint";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nftId: string }> }
) {
  const { nftId } = await params;
  const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID;

  if (!collectionId) {
    return NextResponse.json(
      { error: "Collection ID not configured" },
      { status: 500 }
    );
  }

  try {
    const nft = await getNFTById(collectionId, nftId);
    return NextResponse.json(nft);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT detail error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
