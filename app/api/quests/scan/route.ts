import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Radius of the earth in m
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in m
    return d;
}

export async function POST(request: Request) {
    try {
        console.log("[QuestScan] Processing new check-in request...");
        const session = await getSession()
        if (!session || !session.walletAddress) {
            console.error("[QuestScan] Error: No valid session or wallet address.");
            return NextResponse.json({ error: "ウォレットが接続されていません。ログインしてください。" }, { status: 401 })
        }

        const body = await request.json()
        const { locationId, lat, lng, tokenId } = body

        if (!locationId || lat === undefined || lng === undefined) {
            console.error("[QuestScan] Error: Missing required fields.");
            return NextResponse.json({ error: "必要な情報（位置情報など）が欠落しています。" }, { status: 400 })
        }

        const supabase = createAdminClient()
        const userWallet = session.walletAddress
        console.log(`[QuestScan] User: ${userWallet}, Location: ${locationId}, TokenID: ${tokenId || 'Not provided'}`);

        // 1. Fetch Location and Quest data
        const { data: location, error: locError } = await supabase
            .from('quest_locations')
            .select(`
                *,
                quests:quest_id (
                    id, title, is_active, base_nft_template_id, is_sequential, clear_metadata_uri, reward_nft_template_id,
                    nft_templates!base_nft_template_id (name)
                )
            `)
            .eq('id', locationId)
            .single()

        if (locError || !location) {
            console.error("[QuestScan] Error: Location not found.", locError);
            return NextResponse.json({ error: "存在しないQRコード（地点）です。" }, { status: 404 })
        }

        const quest = location.quests;
        if (!quest.is_active) {
            return NextResponse.json({ error: "このクエストは現在非公開または終了しています。" }, { status: 403 })
        }

        // 2. Check if user already scanned this location
        const { data: existingScan } = await supabase
            .from('user_quest_progress')
            .select('*')
            .eq('user_wallet', userWallet)
            .eq('location_id', locationId)
            .single()

        if (existingScan) {
            return NextResponse.json({ error: "既にこの地点はチェックイン済みです！" }, { status: 409 })
        }

        // 3. Distance Validation
        const distance = getDistanceFromLatLonInM(lat, lng, location.lat, location.lng)
        if (distance > location.radius_meters) {
            return NextResponse.json({
                error: `指定地点から離れすぎています。（現在地から約${Math.round(distance)}m離れています。${location.radius_meters}m以内に近づいてください）`
            }, { status: 403 })
        }

        // 4. NFT Ownership & TokenId Resolution
        let targetTokenId = tokenId;
        if (quest.base_nft_template_id) {
            const { getNFTsForWallet } = await import("@/lib/thirdweb");
            const { extractTemplateId } = await import("@/lib/nft-helpers");

            const { data: templateInfo } = await supabase
                .from('nft_templates')
                .select('contract_address')
                .eq('id', quest.base_nft_template_id)
                .single();

            const contractAddress = templateInfo?.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID;
            console.log(`[QuestScan] Fetching NFTs from contract: ${contractAddress}`);
            const ownedNfts = await getNFTsForWallet(contractAddress!, userWallet);

            const eligibleNfts = ownedNfts.filter(nft => {
                const attributes = (nft.metadata as any)?.attributes || [];
                const tid = extractTemplateId(attributes);
                return tid === quest.base_nft_template_id;
            });

            if (eligibleNfts.length === 0) {
                return NextResponse.json({
                    error: `スタンプラリーに参加するには『${quest.nft_templates?.name || '参加証NFT'}』が必要です。`,
                    requireNft: true
                }, { status: 403 });
            }

            // If multiple exists OR user hasn't selected yet, return choice to UI
            if (!targetTokenId) {
                return NextResponse.json({
                    selectionRequired: true,
                    eligibleNfts: eligibleNfts.map(n => ({
                        tokenId: n.id.toString(),
                        name: n.metadata.name,
                        image: n.metadata.image,
                        description: n.metadata.description
                    }))
                });
            }

            // Verify owned
            const ownsMatching = eligibleNfts.some(n => n.id.toString() === targetTokenId);
            if (!ownsMatching) {
                return NextResponse.json({ error: "選択されたNFTはこのクエストの対象ではありません。" }, { status: 403 });
            }
        }

        // 5. Sequence Validation
        if (quest.is_sequential) {
            const { data: priorLocations } = await supabase
                .from('quest_locations')
                .select('id')
                .eq('quest_id', quest.id)
                .lt('order_index', location.order_index);

            if (priorLocations && priorLocations.length > 0) {
                const priorIds = priorLocations.map(p => p.id);
                const { data: priorScans } = await supabase
                    .from('user_quest_progress')
                    .select('location_id')
                    .eq('user_wallet', userWallet)
                    .eq('quest_id', quest.id)
                    .in('location_id', priorIds);

                if (!priorScans || priorScans.length < priorLocations.length) {
                    return NextResponse.json({ error: "前の地点をクリアしていません。決められた順序で回ってください。" }, { status: 403 })
                }
            }
        }

        // 6. Save Progress
        const { error: insertError } = await supabase
            .from('user_quest_progress')
            .insert([{
                quest_id: quest.id,
                location_id: location.id,
                user_wallet: userWallet
            }]);

        if (insertError) throw insertError;

        // 7. Check for Quest Complete & Metadata Update
        const { data: allLocations } = await supabase.from('quest_locations').select('id').eq('quest_id', quest.id);
        const { data: allScans } = await supabase.from('user_quest_progress').select('id').eq('user_wallet', userWallet).eq('quest_id', quest.id);

        let isComplete = false;
        let isLevelUp = false;
        let rewardMinted = false;

        const isLastScan = (allLocations && allScans && allScans.length >= allLocations.length);

        const doMetadataUpdate = async (rawUri: string, tokenId: string, templateId: string) => {
            console.log(`[QuestScan] Starting metadata update for tokenId: ${tokenId}...`);
            let metadataPayload: any = rawUri;
            try {
                // If it's a JSON string, parse it. If it's a CID, keep it as is or wrap it.
                if (rawUri.trim().startsWith('{')) {
                    metadataPayload = JSON.parse(rawUri);
                }
            } catch (e) {
                console.warn("[QuestScan] Metadata URI is not a JSON string, sending as raw value.");
            }

            const { data: templateInfo } = await supabase.from('nft_templates').select('contract_address').eq('id', templateId).single();
            const contractAddress = templateInfo?.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID;

            const TW_ENGINE_URL = process.env.THIRDWEB_ENGINE_URL;
            const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
            const CHAIN = process.env.NEXT_PUBLIC_CHAIN_NAME;

            console.log(`[QuestScan] Requesting Engine update: Contract ${contractAddress}, Token ${tokenId}`);

            const res = await fetch(`https://${TW_ENGINE_URL}/contract/${CHAIN}/${contractAddress}/erc1155/token/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TW_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "tokenId": tokenId,
                    "metadata": metadataPayload
                })
            });

            if (res.ok) {
                console.log("[QuestScan] NFT Metadata updated successfully on Engine.");
                return true;
            } else {
                const errorText = await res.text();
                console.error("[QuestScan] Thirdweb Engine Error (Metadata Update): ", errorText);
                return false;
            }
        };

        if (isLastScan) {
            isComplete = true;
            if (quest.clear_metadata_uri && targetTokenId) {
                isLevelUp = await doMetadataUpdate(quest.clear_metadata_uri, targetTokenId, quest.base_nft_template_id);
            } else if (location.levelup_metadata_uri && targetTokenId) {
                isLevelUp = await doMetadataUpdate(location.levelup_metadata_uri, targetTokenId, quest.base_nft_template_id);
            }

            // Reward NFT
            if (quest.reward_nft_template_id) {
                const { data: rewardTemplateInfo } = await supabase.from('nft_templates').select('token_id, contract_address').eq('id', quest.reward_nft_template_id).single();
                if (rewardTemplateInfo && rewardTemplateInfo.token_id !== null) {
                    const TW_ENGINE_URL = process.env.THIRDWEB_ENGINE_URL;
                    const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
                    const BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET;
                    const CHAIN = process.env.NEXT_PUBLIC_CHAIN_NAME;
                    const contractAddress = rewardTemplateInfo.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID;

                    const res = await fetch(`https://${TW_ENGINE_URL}/contract/${CHAIN}/${contractAddress}/erc1155/mint-to`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${TW_ACCESS_TOKEN}`,
                            "Content-Type": "application/json",
                            "x-backend-wallet-address": BACKEND_WALLET || "",
                        },
                        body: JSON.stringify({
                            receiver: userWallet,
                            metadataWithSupply: {
                                supply: "1",
                                metadata: { id: rewardTemplateInfo.token_id.toString() }
                            }
                        })
                    });
                    rewardMinted = res.ok;
                }
            }
        } else {
            if (location.levelup_metadata_uri && targetTokenId) {
                isLevelUp = await doMetadataUpdate(location.levelup_metadata_uri, targetTokenId, quest.base_nft_template_id);
            }
        }

        return NextResponse.json({
            success: true,
            isLevelUp,
            isComplete,
            rewardMinted
        })

    } catch (error: any) {
        console.error("[QuestScan] Critical Error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 })
    }
}
