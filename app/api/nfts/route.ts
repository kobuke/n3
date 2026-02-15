import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getNFTsForWallet } from "@/lib/crossmint";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const data = await getNFTsForWallet(session.walletAddress);
    const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID;

    // data may be an array or { nfts: [...] }
    const allNfts: unknown[] = Array.isArray(data) ? data : data.nfts ?? [];

    // Filter to only NFTs from the Nanjo collection
    const filtered = collectionId
      ? allNfts.filter((nft: any) => {
          const id =
            nft.collectionId ??
            nft.collection?.id ??
            nft.metadata?.collection_id;
          return id === collectionId;
        })
      : allNfts;

    return NextResponse.json({ nfts: filtered });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
