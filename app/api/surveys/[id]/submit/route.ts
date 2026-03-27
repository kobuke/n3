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
                        from: "なんじょうNFTポータル <updates@resend.nomadresort.jp>",
                        to: userEmail,
                        subject: `アンケートご回答完了＆NFT配布のお知らせ`,
                        html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%);padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:1px;text-transform:uppercase;">なんじょうNFTポータル</p>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;">アンケートご回答完了</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#333333;line-height:1.7;">この度はアンケートにご協力いただき、<br>誠にありがとうございました。</p>
              <!-- NFT Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f7ff;border:1px solid #d0e4ff;border-radius:10px;margin:24px 0;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#1a73e8;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">配布されたNFT</p>
                    <p style="margin:0;font-size:20px;color:#1a1a2e;font-weight:700;">${templateData.name}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 32px;font-size:15px;color:#555555;line-height:1.7;">NFTはあなたのウォレットに配布されました。<br>マイページよりご確認いただけます。</p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%);border-radius:8px;">
                    <a href="${appUrl}/" style="display:block;padding:16px 48px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">NFTを確認する</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:24px 40px;border-top:1px solid #e9ecef;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999999;line-height:1.6;">このメールは自動送信されています。心当たりがない場合はこのメールを無視してください。</p>
              <p style="margin:8px 0 0;font-size:12px;color:#bbbbbb;">© なんじょうNFTポータル</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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
