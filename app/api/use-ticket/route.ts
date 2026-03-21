import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSession } from "@/lib/session";
import { isStaffAuthenticated } from "@/lib/staff-auth";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const tokenId = body.tokenId || body.nftId;
        const walletAddress = body.walletAddress;
        const isSelfCheckin = body.selfCheckin === true;

        const contractAddress = body.contractAddress || process.env.NEXT_PUBLIC_COLLECTION_ID;

        // 認証: もぎり（ユーザー自身）またはスタッフ
        if (isSelfCheckin) {
            // ユーザーセッションから本人確認
            const session = await getSession();
            if (!session?.walletAddress || !session.authenticated) {
                return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
            }
            // セッションのウォレットとリクエストのウォレットが一致するか検証
            if (session.walletAddress.toLowerCase() !== walletAddress?.toLowerCase()) {
                return NextResponse.json({ error: "本人確認に失敗しました" }, { status: 403 });
            }
        } else {
            // スタッフ認証
            const isStaff = await isStaffAuthenticated();
            const validSecret = body.staffSecret === process.env.STAFF_SECRET;
            if (!isStaff && !validSecret) {
                return NextResponse.json({ error: "認証に失敗しました。スタッフ権限が必要です" }, { status: 403 });
            }
        }

        if (!tokenId || !walletAddress || !contractAddress) {
            return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 2. Check if already used locally
        const { data: usageLog } = await supabase
            .from('ticket_usages')
            .select('status')
            .eq('token_id', tokenId.toString())
            .eq('contract_address', contractAddress)
            .eq('status', 'used')
            .maybeSingle();

        if (usageLog) {
            return NextResponse.json({ error: "このチケットは既に使用されています" }, { status: 400 });
        }

        // 3. Dynamic NFT Metadata Rewrite On-Chain (Uses setTokenURI on Edition)
        const ENGINE_URL = process.env.THIRDWEB_ENGINE_URL || "";
        const ENGINE_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN || "";
        const ENGINE_BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET || "";
        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon";

        // Fetch current NFT to duplicate metadata
        const { getNFTById } = await import("@/lib/thirdweb");
        const nft = await getNFTById(contractAddress, tokenId);
        if (!nft) {
            return NextResponse.json({ error: "NFTがブロックチェーン上に見つかりません" }, { status: 404 });
        }

        const oldMetadata = nft.metadata || {};
        const oldAttributes = (oldMetadata as any).attributes || [];
        const newAttributes = [...oldAttributes];
        const hasStatus = newAttributes.some((a: any) => a.trait_type === "Status");
        
        // --- Expiration Check ---
        const templateAttr = oldAttributes.find((a: any) => a.trait_type === "TemplateID" || a.trait_type === "templateId");
        const templateId = templateAttr?.value;
        if (templateId) {
            const { data: mintLog } = await supabase
                .from('mint_logs')
                .select('created_at')
                .eq('token_id', tokenId.toString())
                .eq('contract_address', contractAddress)
                .ilike('recipient_wallet', walletAddress)
                .eq('status', 'success')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (mintLog?.created_at) {
                const { data: tmpl } = await supabase
                    .from('nft_templates')
                    .select('validity_days')
                    .eq('id', templateId)
                    .single();

                if (tmpl?.validity_days) {
                    const expDate = new Date(mintLog.created_at);
                    expDate.setDate(expDate.getDate() + tmpl.validity_days);
                    if (new Date() > expDate) {
                        return NextResponse.json({ error: "このチケットは有効期限が切れています" }, { status: 400 });
                    }
                }
            }
        }
        // ------------------------

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
            name: (oldMetadata as any).name ? `${(oldMetadata as any).name} (Used)` : "Ticket (Used)",
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
            throw new Error("IPFSメタデータのアップロードに失敗しました");
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
            throw new Error(`Engine書き込みエラー: ${errText}`);
        }

        const writeData = await writeRes.json();
        const txHash = writeData.result?.queueId || "engine_used_mutation";

        // 4. Log Usage
        await supabase.from('ticket_usages').insert({
            token_id: tokenId.toString(),
            contract_address: contractAddress,
            wallet_address: walletAddress,
            transaction_hash: txHash,
            status: "used"
        });

        // Audit Log
        const auditUserId = isSelfCheckin ? walletAddress : 'Staff';
        await supabase.from('audit_logs').insert({
            user_id: auditUserId,
            action: 'TICKET_USED',
            details: { tokenId, contractAddress, walletAddress, txHash, isSelfCheckin }
        });

        return NextResponse.json({ success: true, txHash });

    } catch (error: any) {
        console.error("Use ticket error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
