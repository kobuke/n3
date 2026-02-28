import { NextRequest, NextResponse } from "next/server";
import { getNFTsForWallet } from "@/lib/thirdweb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // 1. Get wallet address
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();

    const { getSession } = await import("@/lib/session");
    const session = await getSession();
    let walletAddress = session?.walletAddress;

    if (!walletAddress) {
      const { data: user } = await supabase
        .from("users")
        .select("walletaddress")
        .eq("email", email)
        .maybeSingle();

      if (user?.walletaddress) {
        walletAddress = user.walletaddress;
      } else {
        return NextResponse.json({ nfts: [] });
      }
    }

    if (!walletAddress) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    // 2. Get all contract addresses from nft_templates + fallback to env var
    const { data: templates } = await supabase
      .from("nft_templates")
      .select("contract_address")
      .not("contract_address", "is", null)
      .not("contract_address", "eq", "");

    const contractAddresses = new Set<string>();
    if (templates) {
      for (const t of templates) {
        if (t.contract_address) contractAddresses.add(t.contract_address);
      }
    }
    // Fallback: also check env var
    const envCollection = process.env.NEXT_PUBLIC_COLLECTION_ID;
    if (envCollection) contractAddresses.add(envCollection);

    if (contractAddresses.size === 0) {
      return NextResponse.json({ nfts: [] });
    }

    // 2.5 Fetch local usages (Status: Used) from DB
    const { data: usages } = await supabase
      .from("ticket_usages")
      .select("token_id, contract_address, used_at, status")
      .eq("wallet_address", walletAddress)
      .eq("status", "used");

    const usagesMap = new Map();
    if (usages) {
      usages.forEach(u => {
        usagesMap.set(`${u.contract_address.toLowerCase()}-${u.token_id}`, u);
      });
    }

    // 2.7 Fetch transfers out (Status: CLAIMED)
    const { data: transfersOut } = await supabase
      .from("transfer_links")
      .select("tokenid")
      .eq("giveraddress", walletAddress)
      .eq("status", "CLAIMED");

    const hiddenTokenIds = new Set(transfersOut?.map(t => t.tokenid) || []);

    // 3. Fetch NFTs from all contracts
    const allNfts: any[] = [];
    for (const contractAddress of contractAddresses) {
      try {
        const ownedNfts = await getNFTsForWallet(contractAddress, walletAddress);
        for (const nft of ownedNfts) {
          const nftIdStr = nft.id.toString();
          if (hiddenTokenIds.has(nftIdStr)) {
            continue; // Hide NFTs that have been transferred out
          }

          const metadata = nft.metadata || {};
          let attributes = ((metadata as any).attributes || []).map((a: any) => ({ ...a })); // Deep clone each attribute object

          const usageLog = usagesMap.get(`${contractAddress.toLowerCase()}-${nft.id.toString()}`);
          if (usageLog) {
            const hasStatus = attributes.some((a: any) => a.trait_type === "Status");
            if (!hasStatus) {
              attributes.push({ trait_type: "Status", value: "Used" });
              attributes.push({ trait_type: "Used_At", value: usageLog.used_at });
            } else {
              const statusAttr = attributes.find((a: any) => a.trait_type === "Status");
              if (statusAttr) statusAttr.value = "Used";
              const usedAtAttr = attributes.find((a: any) => a.trait_type === "Used_At");
              if (usedAtAttr) usedAtAttr.value = usageLog.used_at;
              else attributes.push({ trait_type: "Used_At", value: usageLog.used_at });
            }
          }

          let imageUrl = (metadata as any).image || "";
          if (imageUrl && imageUrl.startsWith("ipfs://")) {
            imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
          }

          allNfts.push({
            id: nft.id.toString(),
            tokenId: nft.id.toString(),
            contractAddress: contractAddress,
            name: (metadata as any).name || `Ticket #${nft.id.toString()}`,
            description: (metadata as any).description || "",
            image: imageUrl,
            supply: (nft as any).supply ? Number((nft as any).supply) : ((nft as any).quantityOwned ? Number((nft as any).quantityOwned) : 1),
            metadata: {
              name: (metadata as any).name,
              description: (metadata as any).description,
              image: imageUrl,
              attributes: attributes,
            },
          });
        }
      } catch (contractErr: any) {
        console.warn(`[NFT] Failed to fetch from ${contractAddress}:`, contractErr.message);
        // Continue to next contract
      }
    }

    return NextResponse.json({ nfts: allNfts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("NFT fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
