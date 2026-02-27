import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getContract } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { polygon, polygonAmoy } from "thirdweb/chains";

import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const tokenId = body.tokenId || body.nftId;
        const walletAddress = body.walletAddress;

        const cookieStore = await cookies();
        const staffSecret = cookieStore.get("nanjo_staff_secret")?.value || body.staffSecret;

        const contractAddress = body.contractAddress || process.env.NEXT_PUBLIC_COLLECTION_ID;

        // 1. Verify Staff Secret
        if (staffSecret !== process.env.STAFF_SECRET) {
            return NextResponse.json({ error: "Invalid staff secret" }, { status: 403 });
        }

        if (!tokenId || !walletAddress || !contractAddress) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 2. Check if already used locally
        const { data: usageLog } = await supabase
            .from('ticket_usages')
            .select('status')
            .eq('token_id', tokenId)
            .eq('contract_address', contractAddress)
            .eq('status', 'used')
            .single();

        if (usageLog) {
            return NextResponse.json({ error: "Ticket feels like it's already used." }, { status: 400 });
        }

        // 3. Dynamic NFT Metadata Rewrite On-Chain (Uses setTokenURI on Edition)
        const ENGINE_URL = process.env.THIRDWEB_ENGINE_URL || "";
        const ENGINE_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN || "";
        const ENGINE_BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET || "";
        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "Polygon";

        // Fetch current NFT to duplicate metadata
        const { getNFTById } = await import("@/lib/thirdweb");
        const nft = await getNFTById(contractAddress, tokenId);
        if (!nft) {
            return NextResponse.json({ error: "On-chain NFT not found" }, { status: 404 });
        }

        const oldMetadata = nft.metadata || {};
        const oldAttributes = (oldMetadata.attributes as any[]) || [];
        const newAttributes = [...oldAttributes];
        const hasStatus = newAttributes.some((a: any) => a.trait_type === "Status");

        // Use ISO string for deterministic used date
        const usedAtTime = new Date().toISOString();

        if (!hasStatus) {
            newAttributes.push({ trait_type: "Status", value: "Used" });
            newAttributes.push({ trait_type: "Used_At", value: usedAtTime });
        } else {
            const statusAttr = newAttributes.find((a: any) => a.trait_type === "Status");
            if (statusAttr) statusAttr.value = "Used";
            const usedAtAttr = newAttributes.find((a: any) => a.trait_type === "Used_At");
            if (usedAtAttr) usedAtAttr.value = usedAtTime;
            else newAttributes.push({ trait_type: "Used_At", value: usedAtTime });
        }

        const newMetadata = {
            ...oldMetadata,
            name: oldMetadata.name ? `${oldMetadata.name} (Used)` : "Ticket (Used)",
            attributes: newAttributes
        };

        // Upload updated metadata via Thirdweb backend client (needs Secret Key)
        const { createThirdwebClient } = await import("thirdweb");
        const { upload } = await import("thirdweb/storage");

        const backendClient = createThirdwebClient({
            clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
            secretKey: process.env.THIRDWEB_SECRET_KEY || ""
        });

        let newMetadataUri;
        try {
            newMetadataUri = await upload({
                client: backendClient,
                files: [newMetadata]
            });
        } catch (uploadErr: any) {
            console.error("IPFS Metadata Upload Failed:", uploadErr);
            throw new Error("IPFS metadata rewrite upload failed");
        }

        // Apply via Engine to bypass user approval constraint (Engine signs for the contract via backend wallet as admin)
        const writeUrl = `https://${ENGINE_URL}/contract/${chain}/${contractAddress}/write`;
        const writeRes = await fetch(writeUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ENGINE_ACCESS_TOKEN}`,
                "x-backend-wallet-address": ENGINE_BACKEND_WALLET,
            },
            body: JSON.stringify({
                functionName: "setTokenURI(uint256,string)",
                args: [tokenId.toString(), newMetadataUri]
            })
        });

        if (!writeRes.ok) {
            const errText = await writeRes.text();
            throw new Error(`Engine write error: ${errText}`);
        }

        const writeData = await writeRes.json();
        const txHash = writeData.result?.queueId || "engine_used_mutation";

        // 4. Log Usage
        await supabase.from('ticket_usages').insert({
            token_id: tokenId,
            contract_address: contractAddress,
            wallet_address: walletAddress,
            transaction_hash: txHash,
            status: "used"
        });

        // Audit Log
        await supabase.from('audit_logs').insert({
            user_id: 'Staff',
            action: 'TICKET_USED',
            details: { tokenId, contractAddress, walletAddress, txHash }
        });

        return NextResponse.json({ success: true, txHash });

    } catch (error: any) {
        console.error("Use ticket error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
