import { NextRequest, NextResponse } from "next/server";
import { getNFTById, updateNFTMetadata } from "@/lib/crossmint";

export async function POST(req: NextRequest) {
  try {
    const { nftId, staffSecret } = await req.json();

    // Verify staff secret
    if (!staffSecret || staffSecret !== process.env.STAFF_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!nftId) {
      return NextResponse.json(
        { error: "nftId is required" },
        { status: 400 }
      );
    }

    const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID;
    if (!collectionId) {
      return NextResponse.json(
        { error: "Collection ID not configured" },
        { status: 500 }
      );
    }

    // Fetch current NFT to get existing attributes
    const nft = await getNFTById(collectionId, nftId);
    const currentAttributes: Array<{ trait_type: string; value: string }> =
      nft.metadata?.attributes ?? [];

    // Check current status
    const statusAttr = currentAttributes.find(
      (a) => a.trait_type === "Status"
    );
    if (statusAttr?.value === "Used") {
      return NextResponse.json(
        { error: "This ticket has already been used", nft },
        { status: 409 }
      );
    }

    // Build updated attributes
    const now = new Date().toISOString();
    const updatedAttributes = currentAttributes
      .filter(
        (a) =>
          a.trait_type !== "Status" && a.trait_type !== "Used_At"
      )
      .concat([
        { trait_type: "Status", value: "Used" },
        { trait_type: "Used_At", value: now },
      ]);

    const result = await updateNFTMetadata(
      collectionId,
      nftId,
      updatedAttributes
    );

    return NextResponse.json({ ok: true, result, usedAt: now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Use ticket error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
