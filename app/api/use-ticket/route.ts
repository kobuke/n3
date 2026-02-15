import { NextRequest, NextResponse } from "next/server";
import { updateNFTMetadata, getNFTById } from "@/lib/crossmint";
import { getNFTMetadata } from "@/lib/alchemy";

export async function POST(req: NextRequest) {
  try {
    // Verify staff auth via cookie
    const staffSecret = req.cookies.get("nanjo_staff_secret")?.value;
    if (!staffSecret || staffSecret !== process.env.STAFF_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { nftId } = await req.json();

    if (!nftId) {
      return NextResponse.json({ error: "nftId is required" }, { status: 400 });
    }

    const contractAddress = process.env.NEXT_PUBLIC_COLLECTION_ID;
    const crossmintCollectionId = process.env.CROSSMINT_COLLECTION_ID;

    if (!contractAddress || !crossmintCollectionId) {
      console.error("Configuration error: Missing collection IDs");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 1. Fetch current NFT metadata
    let nft: any;
    const isUUID = nftId.includes("-");

    try {
      if (isUUID) {
        console.log(`Fetching metadata from Crossmint for UUID: ${nftId}`);
        nft = await getNFTById(crossmintCollectionId, nftId);
      } else {
        console.log(`Fetching metadata from Alchemy for Token ID: ${nftId}`);
        nft = await getNFTMetadata(contractAddress, nftId);
      }
    } catch (fetchErr: any) {
      console.error("Metadata fetch failed:", fetchErr.message);
      return NextResponse.json({ error: `NFT not found: ${fetchErr.message}` }, { status: 404 });
    }

    // Normalize attributes based on the response format (Crossmint vs Alchemy)
    const currentAttributes: any[] =
      (nft.metadata?.attributes) ||
      (nft.raw?.metadata?.attributes) ||
      [];

    // Check current status
    const statusAttr = currentAttributes.find((a: any) => a.trait_type === "Status");
    if (statusAttr?.value === "Used") {
      return NextResponse.json({ error: "This ticket has already been used", nft }, { status: 409 });
    }

    // 2. Prepare metadata update
    const now = new Date().toISOString();
    const updatedAttributes = currentAttributes
      .filter((a: any) => a.trait_type !== "Status" && a.trait_type !== "Used_At")
      .concat([
        { trait_type: "Status", value: "Used" },
        { trait_type: "Used_At", value: now },
      ]);

    // Construct the full metadata object as required by Crossmint PATCH API
    const updatedMetadata = {
      name: nft.name || nft.metadata?.name || nft.raw?.metadata?.name || "NFT Ticket",
      description: nft.description || nft.metadata?.description || nft.raw?.metadata?.description || "",
      image: nft.image?.originalUrl || nft.image?.cachedUrl || nft.metadata?.image || nft.raw?.metadata?.image || "",
      attributes: updatedAttributes
    };

    // 3. Update via Crossmint
    // Use locator format if numeric Token ID, otherwise if UUID use it directly
    const targetIdForUpdate = isUUID ? nftId : `polygon:${contractAddress}:${nftId}`;
    console.log(`Updating via Crossmint. Target ID: ${targetIdForUpdate}`);

    const result = await updateNFTMetadata(crossmintCollectionId, targetIdForUpdate, updatedMetadata);
    return NextResponse.json({ ok: true, result, usedAt: now });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Use ticket error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
