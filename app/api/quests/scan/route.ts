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
        const { locationId, lat, lng } = body

        if (!locationId || lat === undefined || lng === undefined) {
            console.error("[QuestScan] Error: Missing required locationId or GPS coords.");
            return NextResponse.json({ error: "必要な情報（位置情報など）が欠落しています。" }, { status: 400 })
        }

        const supabase = createAdminClient()
        const userWallet = session.walletAddress
        console.log(`[QuestScan] User: ${userWallet}, Location: ${locationId}`);

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
            console.warn("[QuestScan] Warning: Quest is not active.");
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
            console.log("[QuestScan] User already checked in to this location.");
            return NextResponse.json({ error: "既にこの地点はチェックイン済みです！" }, { status: 409 })
        }

        // 3. Distance Validation
        const distance = getDistanceFromLatLonInM(lat, lng, location.lat, location.lng)
        console.log(`[QuestScan] Distance to target: ${Math.round(distance)}m (Max allowed: ${location.radius_meters}m)`);
        if (distance > location.radius_meters) {
            return NextResponse.json({
                error: `指定地点から離れすぎています。（現在地から約${Math.round(distance)}m離れています。${location.radius_meters}m以内に近づいてください）`
            }, { status: 403 })
        }

        // 4. NFT Ownership & TokenId Resolution Check
        let targetTokenId: string | null = null;
        if (quest.base_nft_template_id) {
            console.log(`[QuestScan] Resolving tokenId for base NFT template: ${quest.base_nft_template_id}...`);

            const { data: templateInfo } = await supabase
                .from('nft_templates')
                .select('contract_address')
                .eq('id', quest.base_nft_template_id)
                .single();

            if (!templateInfo) {
                console.error("[QuestScan] Base NFT template not found in DB.");
                return NextResponse.json({ error: "ベースNFTのテンプレート情報が見つかりません。" }, { status: 404 });
            }

            const contractAddress = templateInfo.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID;

            try {
                const { getNFTsForWallet } = await import("@/lib/thirdweb");
                const { extractTemplateId } = await import("@/lib/nft-helpers");

                const ownedNfts = await getNFTsForWallet(contractAddress!, userWallet);

                const matchingNft = ownedNfts.find(nft => {
                    const attributes = (nft.metadata as any)?.attributes || [];
                    const tid = extractTemplateId(attributes);
                    return tid === quest.base_nft_template_id;
                });

                if (!matchingNft) {
                    console.warn(`[QuestScan] User ${userWallet} does not own any NFT of template ${quest.base_nft_template_id}`);
                    return NextResponse.json({
                        error: `スタンプラリーに参加するには『${quest.nft_templates?.name || '参加証NFT'}』が必要です。ストアまたは運営より取得してください。`
                    }, { status: 403 });
                }

                targetTokenId = matchingNft.id.toString();
                console.log(`[QuestScan] Resolved tokenId: ${targetTokenId} for user.`);

            } catch (err) {
                console.error("[QuestScan] Error resolving tokenId via blockchain: ", err);
                return NextResponse.json({ error: "NFTの所有確認中にエラーが発生しました。" }, { status: 500 });
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
                    .in('location_id', priorIds);

                if (!priorScans || priorScans.length < priorLocations.length) {
                    console.warn("[QuestScan] Sequence violation detected.");
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

        if (insertError) {
            console.error("[QuestScan] DB Insert Error: ", insertError);
            throw insertError;
        }
        console.log("[QuestScan] Success: Check-in saved for user.");

        // 7. Check for Quest Complete & Determine Metadata Update
        const { data: allLocations } = await supabase.from('quest_locations').select('id').eq('quest_id', quest.id);
        const { data: allScans } = await supabase.from('user_quest_progress').select('id').eq('user_wallet', userWallet).eq('quest_id', quest.id);

        let isComplete = false;
        let isLevelUp = false;
        let rewardMinted = false;

        const isLastScan = (allLocations && allScans && allScans.length >= allLocations.length);

        // Helper to perform the Thirdweb metadata update
        const doMetadataUpdate = async (rawUri: string, templateId: string) => {
            console.log(`[QuestScan] Starting metadata update for templateId: ${templateId}...`);
            let metadataPayload: any = rawUri;
            try { metadataPayload = JSON.parse(rawUri); } catch (e) { /* ignore */ }

            const { data: templateInfo } = await supabase.from('nft_templates').select('token_id').eq('id', templateId).single();
            if (templateInfo && templateInfo.token_id !== null) {
                const TW_ENGINE_URL = process.env.THIRDWEB_ENGINE_URL;
                const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
                const CHAIN = process.env.NEXT_PUBLIC_CHAIN_NAME;
                const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ID;

                const res = await fetch(`https://${TW_ENGINE_URL}/contract/${CHAIN}/${CONTRACT_ADDRESS}/erc1155/metadata/update`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${TW_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "tokenId": templateInfo.token_id.toString(),
                        "metadata": metadataPayload
                    })
                });

                if (res.ok) {
                    console.log("[QuestScan] NFT Metadata updated successfully.");
                    return true;
                } else {
                    const errorText = await res.text();
                    console.error("[QuestScan] Thirdweb Engine Error (Metadata Update): ", errorText);
                    return false;
                }
            }
            console.error("[QuestScan] Missing template tokenId for metadata update.");
            return false;
        };

        if (isLastScan) {
            console.log("[QuestScan] Quest Complete! Triggering final updates...");
            isComplete = true;

            if (quest.clear_metadata_uri && targetTokenId) {
                isLevelUp = await doMetadataUpdate(quest.clear_metadata_uri, targetTokenId, quest.base_nft_template_id);
            }
            else if (location.levelup_metadata_uri && targetTokenId) {
                isLevelUp = await doMetadataUpdate(location.levelup_metadata_uri, targetTokenId, quest.base_nft_template_id);
            }

            // Handle additional reward NFT (Mint logic)
            if (quest.reward_nft_template_id) {
                console.log(`[QuestScan] Minting reward NFT: ${quest.reward_nft_template_id}...`);
                const { data: rewardTemplateInfo } = await supabase.from('nft_templates').select('token_id').eq('id', quest.reward_nft_template_id).single();
                if (rewardTemplateInfo && rewardTemplateInfo.token_id !== null) {
                    const TW_ENGINE_URL = process.env.THIRDWEB_ENGINE_URL;
                    const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
                    const BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET;
                    const CHAIN = process.env.NEXT_PUBLIC_CHAIN_NAME;
                    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ID;

                    const res = await fetch(`https://${TW_ENGINE_URL}/contract/${CHAIN}/${CONTRACT_ADDRESS}/erc1155/mint-to`, {
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
                                metadata: {
                                    id: rewardTemplateInfo.token_id.toString()
                                }
                            }
                        })
                    });
                    if (res.ok) {
                        rewardMinted = true;
                        console.log("[QuestScan] Reward NFT minted successfully.");
                    } else {
                        const errorText = await res.text();
                        console.error("[QuestScan] Thirdweb Engine Error (Mint): ", errorText);
                    }
                }
            }
        } else {
            console.log("[QuestScan] Quest progress updated. Leveling up NFT...");
            if (location.levelup_metadata_uri && targetTokenId) {
                isLevelUp = await doMetadataUpdate(location.levelup_metadata_uri, targetTokenId, quest.base_nft_template_id);
            }
        }

        return NextResponse.json({
            success: true,
            message: "チェックインしました！",
            isLevelUp,
            isComplete,
            rewardMinted
        })

    } catch (error: any) {
        console.error("[QuestScan] Critical Server Error: ", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 })
    }
}
