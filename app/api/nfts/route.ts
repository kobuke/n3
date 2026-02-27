import { NextRequest, NextResponse } from "next/server";
import { getNFTsForWallet } from "@/lib/thirdweb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const contractAddress = process.env.NEXT_PUBLIC_COLLECTION_ID;

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Configuration missing" },
        { status: 500 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // 1. Get Session state to retrieve wallet address
    // The client typically passes email or relies on session.
    // We should ideally fetch walletAddress from the DB based on the email.
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    // First, try session wallet if available
    const { getSession } = await import("@/lib/session");
    const session = await getSession();
    let walletAddress = session?.walletAddress;

    // If no wallet in session, lookup by email
    if (!walletAddress) {
      const { data: user } = await supabase
        .from("users")
        .select("walletaddress")
        .eq("email", email)
        .maybeSingle();

      if (user?.walletaddress) {
        walletAddress = user.walletaddress;
      } else {
        // No wallet means no NFTs. Returning 404 causes the UI to show an error screen.
        // Returning an empty array gracefully handles "new" users who haven't linked a wallet.
        return NextResponse.json({ nfts: [] });
      }
    }

    if (!walletAddress) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // 2. Get NFTs from thirdweb
    // thirdweb.ts already defaults to the correct Chain object (polygon or polygonAmoy)
    const ownedNfts = await getNFTsForWallet(contractAddress, walletAddress);

    // 3. Format data
    const nfts = ownedNfts.map((nft: any) => {
      const metadata = nft.metadata || {};
      const attributes = metadata.attributes || [];

      let imageUrl = metadata.image || "";

      // Handle ipfs:// prefix
      if (imageUrl && imageUrl.startsWith("ipfs://")) {
        imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
      }

      return {
        id: nft.id.toString(), // Token ID as string
        tokenId: nft.id.toString(),
        contractAddress: contractAddress,
        name: metadata.name || `Ticket #${nft.id.toString()}`,
        description: metadata.description || "",
        image: imageUrl,
        supply: nft.supply ? Number(nft.supply) : 1,
        metadata: {
          name: metadata.name,
          description: metadata.description,
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
