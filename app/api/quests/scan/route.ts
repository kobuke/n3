import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { computeDynamicMetadata } from '@/lib/nft-helpers'

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

        // (2は NFTの tokenId の特定後、または tokenId が不要なクエストの場合に実施する)

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
            console.log(`[QuestScan] ownedNfts=${ownedNfts.length}, eligible=${eligibleNfts.length} (base_template=${quest.base_nft_template_id})`);

            if (eligibleNfts.length === 0) {
                return NextResponse.json({
                    error: `スタンプラリーに参加するには『${quest.nft_templates?.name || '参加証NFT'}』が必要です。`,
                    requireNft: true
                }, { status: 403 });
            }

            // If multiple exists OR user hasn't selected yet, return choice to UI
            if (!targetTokenId) {
                // ローカル情報の進行状況を取得して、NFTの見た目を動的に計算する
                const { data: qpResult } = await supabase
                    .from('user_quest_progress')
                    .select(`
                        token_id, location_id, quest_id, 
                        quests ( base_nft_template_id, clear_metadata_uri, quest_locations ( id, order_index, levelup_metadata_uri ) )
                    `)
                    .eq('user_wallet', userWallet)
                    .eq('quest_id', quest.id);

                return NextResponse.json({
                    selectionRequired: true,
                    eligibleNfts: eligibleNfts.map(n => {
                        const computed = computeDynamicMetadata(n.metadata, qpResult as any, n.id.toString());
                        return {
                            tokenId: n.id.toString(),
                            name: computed.name || n.metadata.name,
                            image: computed.image || n.metadata.image,
                            description: computed.description || n.metadata.description
                        };
                    })
                });
            }

            // Verify owned
            const ownsMatching = eligibleNfts.some(n => n.id.toString() === targetTokenId);
            if (!ownsMatching) {
                return NextResponse.json({ error: "選択されたNFTはこのクエストの対象ではありません。" }, { status: 403 });
            }
        }

        // 2. Check if user already scanned this location (with specific tokenId if required)
        let scanQuery = supabase
            .from('user_quest_progress')
            .select('*')
            .eq('user_wallet', userWallet)
            .eq('location_id', locationId);

        if (targetTokenId) {
            scanQuery = scanQuery.eq('token_id', targetTokenId);
        }

        const { data: existingScan } = await scanQuery.single();

        if (existingScan) {
            return NextResponse.json({ error: targetTokenId ? "このNFTでは既にチェックイン済みです！" : "既にこの地点はチェックイン済みです！" }, { status: 409 })
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
                let priorScansQuery = supabase
                    .from('user_quest_progress')
                    .select('location_id')
                    .eq('user_wallet', userWallet)
                    .eq('quest_id', quest.id)
                    .in('location_id', priorIds);

                if (targetTokenId) {
                    priorScansQuery = priorScansQuery.eq('token_id', targetTokenId);
                }

                const { data: priorScans } = await priorScansQuery;

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
                user_wallet: userWallet,
                token_id: targetTokenId || null
            }]);

        if (insertError) throw insertError;

        // 7. Check for Quest Complete & Metadata Update
        const { data: allLocations } = await supabase.from('quest_locations').select('id').eq('quest_id', quest.id);

        let allScansQuery = supabase.from('user_quest_progress').select('id').eq('user_wallet', userWallet).eq('quest_id', quest.id);
        if (targetTokenId) {
            allScansQuery = allScansQuery.eq('token_id', targetTokenId);
        }
        const { data: allScans } = await allScansQuery;

        let isComplete = false;
        let isLevelUp = false;
        let rewardMinted = false;

        const isLastScan = (allLocations && allScans && allScans.length >= allLocations.length);

        const doMetadataUpdate = async (rawUri: string, tokenId: string, templateId: string) => {
            console.log(`[QuestScan] Starting metadata update for tokenId: ${tokenId}...`);
            let metadataPayload: any = rawUri;
            try {
                // If it's a JSON string, parse it.
                if (typeof rawUri === 'string' && rawUri.trim().startsWith('{')) {
                    metadataPayload = JSON.parse(rawUri);
                }
            } catch (e) {
                console.warn("[QuestScan] Metadata URI is not a JSON string, sending as raw value.");
            }

            const { data: templateInfo } = await supabase.from('nft_templates').select('contract_address').eq('id', templateId).single();
            const contractAddress = templateInfo?.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID;

            // 既存のメタデータをマージするために取得する
            let mergedMetadata = metadataPayload;
            try {
                const { getNFTById } = await import("@/lib/thirdweb");
                const currentNft = await getNFTById(contractAddress!, tokenId);
                if (currentNft && currentNft.metadata) {
                    const currentAttributes = (currentNft.metadata as any).attributes || [];

                    if (typeof metadataPayload === 'object' && metadataPayload !== null) {
                        mergedMetadata = {
                            ...metadataPayload,
                            attributes: [
                                ...currentAttributes,
                                { trait_type: "LastUpdatedTokenID", value: tokenId } // どのNFTを更新したかの目印を追加
                            ]
                        };
                    } else if (typeof metadataPayload === 'string') {
                        mergedMetadata = {
                            ...(currentNft.metadata as any), // 古いプロパティを引継ぎ
                            image: metadataPayload,          // 文字列ならとりあえず画像URLとして更新してみる
                            attributes: [
                                ...currentAttributes,
                                { trait_type: "LastUpdatedTokenID", value: tokenId }
                            ]
                        };
                    }
                }
            } catch (e) {
                console.warn("[QuestScan] Failed to fetch current NFT metadata for merging. Proceeding with raw payload.", e);
            }

            const TW_ENGINE_URL = process.env.THIRDWEB_ENGINE_URL;
            const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
            const BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET;
            const CHAIN = process.env.NEXT_PUBLIC_CHAIN_NAME;

            console.log(`[QuestScan] Requesting Engine update: Contract ${contractAddress}, Token ${tokenId}`);

            const res = await fetch(`https://${TW_ENGINE_URL}/contract/${CHAIN}/${contractAddress}/erc1155/token/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TW_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'x-backend-wallet-address': BACKEND_WALLET || ""
                },
                body: JSON.stringify({
                    "tokenId": tokenId,
                    "metadata": mergedMetadata
                })
            });

            if (res.ok) {
                console.log("[QuestScan] NFT Metadata updated successfully on Engine.");
                // DBの pending_metadata 書き込みは廃止。N3側は動的メタデータ計算を優先するため不要。
                return true;
            } else {
                const errorText = await res.text();
                console.error("[QuestScan] Thirdweb Engine Error (Metadata Update): ", errorText);
                return false;
            }
        };

        console.log(`[QuestScan] isLastScan: ${isLastScan}, allLocations: ${allLocations?.length}, allScans: ${allScans?.length}`);

        if (isLastScan) {
            isComplete = true;
            if (quest.clear_metadata_uri && targetTokenId) {
                isLevelUp = await doMetadataUpdate(quest.clear_metadata_uri, targetTokenId, quest.base_nft_template_id);
            } else if (location.levelup_metadata_uri && targetTokenId) {
                isLevelUp = await doMetadataUpdate(location.levelup_metadata_uri, targetTokenId, quest.base_nft_template_id);
            }

            // Reward NFT
            console.log(`[QuestScan] reward_nft_template_id: ${quest.reward_nft_template_id}`);
            if (quest.reward_nft_template_id) {
                try {
                    const { data: rewardTemplate, error: rewardErr } = await supabase
                        .from('nft_templates')
                        .select('id, contract_address, name, description, image_url, type')
                        .eq('id', quest.reward_nft_template_id)
                        .single();

                    if (rewardErr) {
                        console.error("[QuestScan] Error fetching reward template:", rewardErr);
                    }

                    if (!rewardTemplate) {
                        console.error(`[QuestScan] Reward template NOT FOUND in nft_templates! ID: ${quest.reward_nft_template_id}. Falling back to new mint.`);
                        // テンプレートがDBに無い場合、クエスト情報から直接ミントを試みる
                        const TW_ENGINE_URL = process.env.THIRDWEB_ENGINE_URL;
                        const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
                        const BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET;
                        const CHAIN = process.env.NEXT_PUBLIC_CHAIN_NAME;
                        const fallbackContract = process.env.NEXT_PUBLIC_COLLECTION_ID;

                        const fallbackMetadata = {
                            name: `${quest.title} - 達成報酬`,
                            description: `クエスト「${quest.title}」の達成報酬NFTです。`,
                            attributes: [
                                { trait_type: "Type", value: "reward" },
                                { trait_type: "Source", value: "Quest Reward" },
                                { trait_type: "QuestID", value: quest.id },
                                { trait_type: "TemplateID", value: quest.reward_nft_template_id },
                            ],
                        };

                        console.log(`[QuestScan] Fallback: Minting new reward NFT to ${userWallet}`);
                        const fallbackRes = await fetch(
                            `https://${TW_ENGINE_URL}/contract/${CHAIN}/${fallbackContract}/erc1155/mint-to`,
                            {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${TW_ACCESS_TOKEN}`,
                                    "Content-Type": "application/json",
                                    "x-backend-wallet-address": BACKEND_WALLET || "",
                                },
                                body: JSON.stringify({
                                    receiver: userWallet,
                                    metadataWithSupply: { metadata: fallbackMetadata, supply: "1" },
                                }),
                            }
                        );

                        if (fallbackRes.ok) {
                            console.log("[QuestScan] Fallback reward NFT minted successfully.");
                            rewardMinted = true;
                            const fbData = await fallbackRes.json();
                            await supabase.from("mint_logs").insert({
                                shopify_order_id: `quest-reward-${quest.id}-${Date.now()}`,
                                product_name: `[Quest Reward] ${quest.title}`,
                                status: "success",
                                recipient_email: session.email || null,
                                recipient_wallet: userWallet,
                                transaction_hash: fbData.result?.queueId || null,
                                contract_address: fallbackContract,
                                template_id: quest.reward_nft_template_id,
                            });
                        } else {
                            const errorText = await fallbackRes.text();
                            console.error("[QuestScan] Fallback reward mint FAILED:", errorText);
                        }
                    } else {
                        const TW_ENGINE_URL = process.env.THIRDWEB_ENGINE_URL;
                        const TW_ACCESS_TOKEN = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
                        const BACKEND_WALLET = process.env.THIRDWEB_ENGINE_BACKEND_WALLET;
                        const CHAIN = process.env.NEXT_PUBLIC_CHAIN_NAME;
                        const rewardContractAddress = rewardTemplate.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID;

                        let rewardRes: Response;

                        if ((rewardTemplate as any).token_id !== null && (rewardTemplate as any).token_id !== undefined) {
                            // 既存トークンの追加サプライをミント（ユーザーに配布）
                            console.log(`[QuestScan] Minting additional supply of token ${(rewardTemplate as any).token_id} to ${userWallet}`);
                            rewardRes = await fetch(
                                `https://${TW_ENGINE_URL}/contract/${CHAIN}/${rewardContractAddress}/erc1155/mint-additional-supply-to`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${TW_ACCESS_TOKEN}`,
                                        "Content-Type": "application/json",
                                        "x-backend-wallet-address": BACKEND_WALLET || "",
                                    },
                                    body: JSON.stringify({
                                        receiver: userWallet,
                                        tokenId: (rewardTemplate as any).token_id.toString(),
                                        additionalSupply: "1",
                                    }),
                                }
                            );
                        } else {
                            // token_id が無い場合は新規ミント
                            console.log(`[QuestScan] Minting new reward NFT to ${userWallet}`);
                            const metadata = {
                                name: rewardTemplate.name || "Quest Reward",
                                description: rewardTemplate.description || "Quest completion reward",
                                image: rewardTemplate.image_url || undefined,
                                attributes: [
                                    { trait_type: "Type", value: rewardTemplate.type || "reward" },
                                    { trait_type: "Source", value: "Quest Reward" },
                                    { trait_type: "QuestID", value: quest.id },
                                    { trait_type: "TemplateID", value: rewardTemplate.id },
                                ],
                            };
                            rewardRes = await fetch(
                                `https://${TW_ENGINE_URL}/contract/${CHAIN}/${rewardContractAddress}/erc1155/mint-to`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${TW_ACCESS_TOKEN}`,
                                        "Content-Type": "application/json",
                                        "x-backend-wallet-address": BACKEND_WALLET || "",
                                    },
                                    body: JSON.stringify({
                                        receiver: userWallet,
                                        metadataWithSupply: {
                                            metadata,
                                            supply: "1",
                                        },
                                    }),
                                }
                            );
                        }

                        if (rewardRes.ok) {
                            console.log("[QuestScan] Reward NFT minted successfully.");
                            rewardMinted = true;

                            // mint_logs に記録
                            const rewardMintData = await rewardRes.json();
                            const queueId = rewardMintData.result?.queueId || null;
                            await supabase.from("mint_logs").insert({
                                shopify_order_id: `quest-reward-${quest.id}-${Date.now()}`,
                                product_name: `[Quest Reward] ${rewardTemplate.name || 'Reward'}`,
                                status: "success",
                                recipient_email: session.email || null,
                                recipient_wallet: userWallet,
                                transaction_hash: queueId,
                                contract_address: rewardContractAddress,
                                template_id: rewardTemplate.id,
                                token_id: (rewardTemplate as any).token_id?.toString() || null,
                            });
                        } else {
                            const errorText = await rewardRes.text();
                            console.error("[QuestScan] Reward NFT mint FAILED:", errorText);
                        }
                    }
                } catch (rewardErr: any) {
                    console.error("[QuestScan] Reward NFT mint error:", rewardErr.message);
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
