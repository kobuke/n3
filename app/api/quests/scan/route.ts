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
        const session = await getSession()
        if (!session || !session.walletAddress) {
            return NextResponse.json({ error: "ウォレットが接続されていません。ログインしてください。" }, { status: 401 })
        }

        const body = await request.json()
        const { locationId, lat, lng } = body

        if (!locationId || lat === undefined || lng === undefined) {
            return NextResponse.json({ error: "必要な情報（位置情報など）が欠落しています。" }, { status: 400 })
        }

        const supabase = createAdminClient()
        const userWallet = session.walletAddress

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

        // 4. NFT Ownership Check
        // If the quest requires a base NFT, check user's held tokens.
        // For N3, we could check the local DB or directly via Thirdweb Engine.
        // Assuming we have user_nfts or we can call engine API:
        // Here we do a simplified mock check via DB if we have a tracking table, 
        // OR we can rely on `walletAddress` to fetch from Engine.
        if (quest.base_nft_template_id) {
            // Ideally call `fetch("/api/nfts")` for user or Engine directly.
            // For now, let's assume we have an internal check or we get user's NFTs
            const { data: userTokens } = await supabase
                .from('user_nfts') // Assuming this exists or similar tracking exists, else rely on Thirdweb
                .select('*')
                .eq('wallet_address', userWallet)
                .eq('template_id', quest.base_nft_template_id)

            // Note: Since N3 doesn't strictly have user_nfts in schema previously shown,
            // We should use the Engine API to get `balanceOf` for the template.
            const TW_ENGINE_URL = process.env.NEXT_PUBLIC_THIRDWEB_ENGINE_URL;
            const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
            const CHAIN = process.env.NEXT_PUBLIC_CHAIN || "mumbai";
            const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

            // We need the token_id of the required NFT template.
            const { data: templateInfo } = await supabase.from('nft_templates').select('token_id').eq('id', quest.base_nft_template_id).single();

            if (templateInfo) {
                const balRes = await fetch(`${TW_ENGINE_URL}/contract/${CHAIN}/${CONTRACT_ADDRESS}/erc1155/balance-of?walletAddress=${userWallet}&tokenId=${templateInfo.token_id}`, {
                    headers: { 'Authorization': `Bearer ${TW_ACCESS_TOKEN}` }
                });
                if (balRes.ok) {
                    const balData = await balRes.json();
                    if (parseInt(balData.result || "0", 10) === 0) {
                        return NextResponse.json({
                            error: `スタンプラリーに参加するには『${quest.nft_templates?.name || '参加証NFT'}』が必要です。ストアまたは運営より取得してください。`
                        }, { status: 403 });
                    }
                }
            }
        }

        // 5. Sequence Validation
        if (quest.is_sequential) {
            // Must have scanned all previous locations in order
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

        // 7. Check for Quest Complete & Determine Metadata Update
        const { data: allLocations } = await supabase.from('quest_locations').select('id').eq('quest_id', quest.id);
        const { data: allScans } = await supabase.from('user_quest_progress').select('id').eq('user_wallet', userWallet).eq('quest_id', quest.id);

        let isComplete = false;
        let isLevelUp = false;
        let rewardMinted = false;

        const isLastScan = (allLocations && allScans && allScans.length >= allLocations.length);

        // Helper to perform the Thirdweb metadata update
        const doMetadataUpdate = async (rawUri: string, templateId: string) => {
            let metadataPayload: any = rawUri;
            try { metadataPayload = JSON.parse(rawUri); } catch (e) { /* ignore */ }

            const { data: templateInfo } = await supabase.from('nft_templates').select('token_id').eq('id', templateId).single();
            if (templateInfo && templateInfo.token_id !== null) {
                const TW_ENGINE_URL = process.env.NEXT_PUBLIC_THIRDWEB_ENGINE_URL;
                const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
                const CHAIN = process.env.NEXT_PUBLIC_CHAIN;
                const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

                await fetch(`${TW_ENGINE_URL}/contract/${CHAIN}/${CONTRACT_ADDRESS}/erc1155/metadata/update`, {
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
                return true;
            }
            return false;
        };

        if (isLastScan) {
            isComplete = true;

            // Priority 1: Quest 'clear_metadata_uri'
            if (quest.clear_metadata_uri && quest.base_nft_template_id) {
                isLevelUp = await doMetadataUpdate(quest.clear_metadata_uri, quest.base_nft_template_id);
            }
            // Priority 2: Fallback to this Location's 'levelup_metadata_uri' if no clear metadata exists
            else if (location.levelup_metadata_uri && quest.base_nft_template_id) {
                isLevelUp = await doMetadataUpdate(location.levelup_metadata_uri, quest.base_nft_template_id);
            }

            // Handle additional reward NFT (Mint logic)
            if (quest.reward_nft_template_id) {
                const { data: rewardTemplateInfo } = await supabase.from('nft_templates').select('token_id').eq('id', quest.reward_nft_template_id).single();
                if (rewardTemplateInfo && rewardTemplateInfo.token_id !== null) {
                    const TW_ENGINE_URL = process.env.NEXT_PUBLIC_THIRDWEB_ENGINE_URL;
                    const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
                    const BACKEND_WALLET = process.env.BACKEND_WALLET_ADDRESS;
                    const CHAIN = process.env.NEXT_PUBLIC_CHAIN;
                    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

                    await fetch(`${TW_ENGINE_URL}/contract/${CHAIN}/${CONTRACT_ADDRESS}/erc1155/mint-to`, {
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
                    rewardMinted = true;
                }
            }
        } else {
            // Not complete yet, normal location level up
            if (location.levelup_metadata_uri && quest.base_nft_template_id) {
                isLevelUp = await doMetadataUpdate(location.levelup_metadata_uri, quest.base_nft_template_id);
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
        console.error("Scan Error: ", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 })
    }
}
