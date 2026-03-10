import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getSession()
        if (!session || !session.email) {
            return NextResponse.json({ error: "認証されていません。先にログインしてください。" }, { status: 401 })
        }

        const surveyId = id
        const body = await request.json()
        const { answers } = body

        if (!answers) {
            return NextResponse.json({ error: "回答内容が空です。" }, { status: 400 })
        }

        const supabase = createAdminClient()
        const userEmail = session.email
        const userWallet = session.walletAddress

        // 1. Fetch Survey
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', surveyId)
            .single()

        if (surveyError || !survey) {
            return NextResponse.json({ error: "アンケートが見つかりませんでした。" }, { status: 404 })
        }

        if (!survey.is_active) {
            return NextResponse.json({ error: "このアンケートは現在回答を受け付けていません。" }, { status: 403 })
        }

        // 2. Limit Check (Has the user reached the answer limit?)
        const maxAnswers = survey.max_answers_per_user ?? 1; // Default to 1 if not set
        if (maxAnswers > 0) {
            const { count, error: countError } = await supabase
                .from('survey_responses')
                .select('*', { count: 'exact', head: true })
                .eq('survey_id', surveyId)
                .eq('user_email', userEmail)

            if (count !== null && count >= maxAnswers) {
                return NextResponse.json({ error: `あなたは既に回答上限（${maxAnswers}回）に達しています。` }, { status: 409 })
            }
        }

        // 3. Save Response
        const { error: insertError } = await supabase
            .from('survey_responses')
            .insert([{
                survey_id: surveyId,
                user_email: userEmail,
                user_wallet: userWallet,
                answers: answers
            }])

        if (insertError) {
            return NextResponse.json({ error: "アンケートの保存に失敗しました。" }, { status: 500 })
        }

        // 4. Trigger Minting for each NFT Template associated with the survey
        if (survey.nft_template_ids && survey.nft_template_ids.length > 0 && userWallet) {
            for (const templateId of survey.nft_template_ids) {
                try {
                    // Fetch Template Data
                    const { data: templateData } = await supabase
                        .from("nft_templates")
                        .select("*")
                        .eq("id", templateId)
                        .single()

                    if (!templateData) continue;

                    const contractAddressToUse = templateData.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID

                    const metadata = {
                        name: templateData.name,
                        description: templateData.description || "Minted via Survey Reward",
                        image: templateData.image_url || undefined,
                        attributes: [
                            { trait_type: "Type", value: templateData.type || "reward" },
                            { trait_type: "Source", value: "Survey" },
                            { trait_type: "SurveyID", value: surveyId },
                            { trait_type: "TemplateID", value: templateId },
                        ],
                    }

                    const chain = process.env.NEXT_PUBLIC_CHAIN_NAME || "polygon"
                    const mintUrl = `https://${process.env.THIRDWEB_ENGINE_URL}/contract/${chain}/${contractAddressToUse}/erc1155/mint-to`

                    const mintRes = await fetch(mintUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${process.env.THIRDWEB_ENGINE_ACCESS_TOKEN}`,
                            "x-backend-wallet-address": process.env.THIRDWEB_ENGINE_BACKEND_WALLET!,
                        },
                        body: JSON.stringify({
                            receiver: userWallet,
                            metadataWithSupply: {
                                metadata: metadata,
                                supply: "1",
                            },
                        }),
                    })

                    const mintData = await mintRes.json()
                    if (!mintRes.ok) {
                        console.error(`[Survey Mint] Failed for template ${templateId}:`, mintData)
                        throw new Error("Mint failed")
                    }

                    const txHash = mintData.result?.queueId || null

                    // 成功ログ
                    const dummyOrderId = `survey-${surveyId}-${Date.now()}`
                    await supabase.from("mint_logs").insert({
                        shopify_order_id: dummyOrderId,
                        product_name: `[Survey Reward] ${templateData.name}`,
                        status: "success",
                        recipient_email: userEmail,
                        recipient_wallet: userWallet,
                        transaction_hash: txHash,
                        contract_address: contractAddressToUse,
                        template_id: templateId
                    })

                    // 送信元メールは環境に合わせて
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://n3-nanjo-nft.netlify.app'
                    await resend.emails.send({
                        from: "N3 NFT System <updates@resend.nomadresort.jp>",
                        to: userEmail,
                        subject: `アンケートご回答完了＆NFT配布のお知らせ`,
                        html: `<p>アンケートへのご協力ありがとうございました！</p><p>報酬のNFT（${templateData.name}）をあなたのウォレット（${userWallet}）へ配布しました。</p><p><a href="${appUrl}/mypage/nfts">確認する</a></p>`,
                    })

                } catch (mintError) {
                    console.error(`[Survey Mint] Handled error in loop for template ${templateId}`, mintError)
                    // We don't throw here to ensure other NFTs or the survey response itself are not reverted.
                }
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Error submitting survey:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
