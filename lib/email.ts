import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendNftDeliveryEmailParams {
    to: string;
    nftName: string;
    recipientWallet: string;
    appUrl?: string;
}

/**
 * ユーザーへNFT配布完了メールを送信する
 */
export async function sendNftDeliveryEmail({
    to,
    nftName,
    recipientWallet,
    appUrl
}: SendNftDeliveryEmailParams) {
    // Verify that the 'to' address looks like a valid email, not a wallet address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        console.log(`[Email] Skipping email delivery for invalid/dummy address: ${to}`);
        return;
    }

    const finalAppUrl = appUrl || (
        process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
            ? process.env.NEXT_PUBLIC_APP_URL
            : 'https://n3-nanjo-nft.netlify.app'
    );

    await resend.emails.send({
        from: "なんじょうNFT <updates@resend.nomadresort.jp>",
        to,
        subject: `【なんじょうNFT】NFTお受け取り準備完了 / NFT Ready for Collection`,
        html: `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; color: #333; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .hero-image { width: 100%; height: auto; display: block; border-bottom: 1px solid #eee; }
                    .content { padding: 40px 30px; text-align: center; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #1a1a1a; }
                    .message { font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 30px; text-align: left; }
                    .warning { background-color: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; color: #92400e; font-size: 14px; margin-bottom: 25px; text-align: left; }
                    .highlight { font-weight: bold; color: #1a8fc4; }
                    .btn { display: inline-block; padding: 14px 32px; background-color: #1a8fc4; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; }
                    .footer { padding: 25px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #fafafa; border-top: 1px solid #f3f4f6; }
                    .address-box { margin-top: 15px; padding: 10px; background-color: #f9fafb; border-radius: 6px; font-family: monospace; font-size: 11px; color: #6b7280; word-break: break-all; }
                </style>
            </head>
            <body>
                <div class="container">
                    <img src="https://n3-nanjo-nft.netlify.app/images/email-hero.webp" alt="Nanjo City" class="hero-image">
                    <div class="content">
                        <h1 class="title">NFTが届きました！ / NFT Received!</h1>
                        <div class="message">
                            南城市「N3」NFTシステムをご利用いただきありがとうございます。<br>
                            取得された <span class="highlight">「${nftName}」</span> のNFTが、お客様のウォレットへ配布されました。<br><br>
                            Thank you for using the Nanjo City "N3" NFT system.<br>
                            The NFT <span class="highlight">"${nftName}"</span> you obtained has been distributed to your wallet.
                        </div>

                        <div class="warning">
                            <strong>【重要 / IMPORTANT】</strong><br>
                            NFTを表示・利用するには、<strong>取得時に使用したこのメールアドレス (${to})</strong> でログインしてください。別のアドレスでログインするとNFTが表示されません。<br><br>
                            To view and use your NFT, please log in with <strong>this email address (${to})</strong> used when you obtained it. NFTs will not be displayed if you log in with a different address.
                        </div>

                        <div class="btn-wrapper">
                            <a href="${finalAppUrl}/mypage/nfts" class="btn">NFTを確認する / View NFT</a>
                        </div>
                        
                        <div class="address-box">
                            受取ウォレット / Recipient Wallet: ${recipientWallet}
                        </div>
                    </div>
                    <div class="footer">
                        <p><strong>南城市デジタル住民・貢献プラットフォーム「N3」</strong></p>
                        <p>Nanjo City Digital Citizen & Contribution Platform "N3"</p>
                        <p>※このメールは送信専用です / This is a send-only email.</p>
                        <p>© Nanjo City NFT Project. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    });
}
