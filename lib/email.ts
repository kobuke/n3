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

    const { data, error } = await resend.emails.send({
        from: "なんじょうNFTポータル <updates@resend.nomadresort.jp>",
        to,
        subject: `【なんじょうNFTポータル】「${nftName}」を受け取りました`,
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
                        <h1 class="title">「${nftName}」を受け取りました</h1>
                        <div class="message">
                            なんじょうNFTポータルをご利用いただきありがとうございます。<br><br>
                            <span class="highlight">「${nftName}」</span> があなたのウォレットへ発行されました。<br>
                            下記のボタンからNFTをご確認いただけます。
                        </div>

                        <div class="warning">
                            <strong>【ログイン時のご注意】</strong><br>
                            NFTを確認するには、取得時に使用した <strong>このメールアドレス（${to}）</strong> でログインしてください。別のアドレスでログインするとNFTが表示されません。
                        </div>

                        <div class="btn-wrapper">
                            <a href="${finalAppUrl}/mypage/nfts" class="btn">NFTを確認する</a>
                        </div>

                        <div class="address-box">
                            受取ウォレット: ${recipientWallet}
                        </div>
                    </div>
                    <div class="footer">
                        <p><strong>なんじょうNFTポータル</strong></p>
                        <p>※このメールは送信専用です。返信はできません。</p>
                        <p>© Nanjo City NFT Project. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    });

    if (error) {
        console.error(`[Email Error] Failed to send email to ${to}:`, error);
    } else {
        console.log(`[Email Success] Email sent to ${to}, ID: ${data?.id}`);
    }
}

interface SendSbtDuplicateEmailParams {
    to: string;
    nftName: string;
    appUrl?: string;
}

/**
 * SBT重複取得時（既に所持しているためスキップ）の通知メールを送信する
 */
export async function sendSbtDuplicateEmail({
    to,
    nftName,
    appUrl,
}: SendSbtDuplicateEmailParams) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        console.log(`[Email] Skipping duplicate notification for invalid address: ${to}`);
        return;
    }

    const finalAppUrl = appUrl || (
        process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
            ? process.env.NEXT_PUBLIC_APP_URL
            : 'https://n3-nanjo-nft.netlify.app'
    );

    const { data, error } = await resend.emails.send({
        from: "なんじょうNFTポータル <updates@resend.nomadresort.jp>",
        to,
        subject: `【なんじょうNFTポータル】「${nftName}」は既に取得済みです`,
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
                    .notice { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; color: #991b1b; font-size: 14px; margin-bottom: 25px; text-align: left; }
                    .highlight { font-weight: bold; color: #1a8fc4; }
                    .btn { display: inline-block; padding: 14px 32px; background-color: #1a8fc4; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; }
                    .footer { padding: 25px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #fafafa; border-top: 1px solid #f3f4f6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <img src="https://n3-nanjo-nft.netlify.app/images/email-hero.webp" alt="Nanjo City" class="hero-image">
                    <div class="content">
                        <h1 class="title">NFTを発行できませんでした</h1>
                        <div class="message">
                            なんじょうNFTポータルをご利用いただきありがとうございます。<br><br>
                            <span class="highlight">「${nftName}」</span> のお申し込みを受け付けましたが、既に同じNFTをお持ちのため、新たな発行はできませんでした。
                        </div>

                        <div class="notice">
                            <strong>【発行できなかった理由】</strong><br>
                            このNFTは1人につき1枚のみ取得可能です。既にお持ちのNFTは引き続きご利用いただけます。
                        </div>

                        <div class="btn-wrapper">
                            <a href="${finalAppUrl}/mypage/nfts" class="btn">所持NFTを確認する</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p><strong>なんじょうNFTポータル</strong></p>
                        <p>※このメールは送信専用です。返信はできません。</p>
                        <p>© Nanjo City NFT Project. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    });

    if (error) {
        console.error(`[Email Error] Failed to send duplicate notification to ${to}:`, error);
    } else {
        console.log(`[Email Success] Duplicate notification sent to ${to}, ID: ${data?.id}`);
    }
}
