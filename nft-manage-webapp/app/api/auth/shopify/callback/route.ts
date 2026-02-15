import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const shop = process.env.SHOPIFY_SHOP_DOMAIN

    if (!code || !shop) {
        return NextResponse.json({ error: 'Missing code or shop' }, { status: 400 })
    }

    try {
        // codeをアクセストークンに交換
        const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.SHOPIFY_CLIENT_ID,
                client_secret: process.env.SHOPIFY_CLIENT_SECRET,
                code,
            }),
        })

        const data = await response.json()

        if (data.access_token) {
            // 画面にトークンを表示
            return new NextResponse(`
                <html>
                    <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
                        <h1 style="color: #2c3e50;">Success! Shopify App Installed</h1>
                        <p>Copy the following token and paste it into your <strong>.env.local</strong> file for the variable <strong>SHOPIFY_ADMIN_API_ACCESS_TOKEN</strong>:</p>
                        <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; border: 1px solid #ddd; word-break: break-all; font-family: monospace; font-size: 1.2rem;">
                            ${data.access_token}
                        </div>
                        <p style="margin-top: 20px; color: #7f8c8d;">After saving the .env.local file, restart your development server (npm run dev) and try syncing products again.</p>
                        <a href="/dashboard/product-mapping" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 4px;">Back to App</a>
                    </body>
                </html>
            `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
        }

        return NextResponse.json({ error: 'Failed to obtain access token', details: data }, { status: 500 })
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
    }
}
