import { NextRequest, NextResponse } from "next/server";
import { getNFTsForOwner } from "@/lib/alchemy";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const contractAddress = process.env.NEXT_PUBLIC_COLLECTION_ID;
    const collectionId = process.env.CROSSMINT_COLLECTION_ID;

    if (!contractAddress || !collectionId) {
      return NextResponse.json(
        { error: "Configuration missing" },
        { status: 500 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email/Address is required" },
        { status: 400 }
      );
    }

    // 1. Get Session from Cookie to retrieve wallet address
    // Since we are already authenticated, the session should have the wallet address
    // (This part is handled by the calling page usually having session, but here we can rely on what we stored)
    // For now, let's just resolve the wallet address using Crossmint helper if we only have email, 
    // OR we can trust the previous flow stored it in session.
    // However, the `getNFTsForOwner` function in Alchemy expects a wallet address, NOT an email.

    // We will use a helper to get the wallet address from the email via Crossmint API, 
    // BUT to avoid redundant calls, we should check if the client passed the wallet address directly or if we can get it from session.
    // In this specific architecture, `getNFTsForOwner` (aliased from `getNFTsByAlchemy`) takes an `ownerAddress`.
    // The previous error "owner should be a valid address" confirms we passed an email to a function expecting an 0x... address.

    // Let's resolve the wallet address. Ideally, this should be in the session.
    // We'll quickly import getSession to check.
    const { getSession } = await import("@/lib/session");
    const session = await getSession();

    let walletAddress = session?.walletAddress;

    if (!walletAddress) {
      // Fallback: If session doesn't have it (legacy session?), fetch it again using email
      // This is a safety net.
      console.log(`Wallet address not in session, fetching for email: ${email}`);
      const { getWalletByEmail } = await import("@/lib/crossmint");
      try {
        const wallet = await getWalletByEmail(email);
        walletAddress = wallet.publicKey || wallet.address;
      } catch (e) {
        console.error("Failed to resolve wallet address:", e);
        return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
      }
    }

    if (!walletAddress) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // 2. Get NFTs from Alchemy using the WALLET ADDRESS
    console.log(`Using Alchemy to fetch NFTs for address: ${walletAddress}`);
    const alchemyResult = await getNFTsForOwner(walletAddress);
    const ownedNfts = alchemyResult.filter(
      (nft: any) =>
        nft.contract.address.toLowerCase() === contractAddress.toLowerCase()
    );

    console.log(`Alchemy found ${ownedNfts.length} NFTs for this collection.`);

    // 3. Fetch latest metadata from Crossmint to get "Status"
    const crossmintRes = await fetch(
      `https://www.crossmint.com/api/2022-06-09/collections/${collectionId}/nfts?perPage=50`,
      {
        headers: {
          "X-API-KEY": process.env.CROSSMINT_API_KEY || "",
        },
      }
    );

    let crossmintNfts: any[] = [];
    if (crossmintRes.ok) {
      crossmintNfts = await crossmintRes.json();
    }

    // 4. Merge/Format data
    const nfts = ownedNfts.map((nft: any) => {
      // Find matching NFT in Crossmint data by tokenId
      const dynamicNft = crossmintNfts.find(
        (cn: any) => cn.onChain?.tokenId === nft.tokenId
      );

      // Use Crossmint metadata if available (for "Status"), fallback to Alchemy
      const metadata = dynamicNft?.metadata || nft.raw?.metadata || {};
      const attributes = metadata.attributes || [];

      let imageUrl =
        nft.image?.cachedUrl ||
        nft.image?.thumbnailUrl ||
        nft.image?.originalUrl ||
        metadata.image ||
        "";

      // Handle ipfs:// prefix
      if (imageUrl && imageUrl.startsWith("ipfs://")) {
        imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
      }

      return {
        id: dynamicNft?.id || nft.tokenId, // Prefer Crossmint UUID if available
        tokenId: nft.tokenId,
        contractAddress: nft.contract.address,
        name: metadata.name || nft.name || `Ticket #${nft.tokenId}`,
        description: metadata.description || nft.description,
        image: imageUrl,
        metadata: {
          name: metadata.name || nft.name,
          description: metadata.description || nft.description,
          image: imageUrl,
          attributes: attributes
        }
      };
    });

    return NextResponse.json({ nfts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
