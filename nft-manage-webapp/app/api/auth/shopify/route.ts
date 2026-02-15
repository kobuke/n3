import { NextResponse } from 'next/server'

export async function GET() {
    const shop = process.env.SHOPIFY_SHOP_DOMAIN
    const clientId = process.env.SHOPIFY_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/shopify/callback`
    const scopes = 'read_products,write_products,read_orders,read_inventory,write_inventory'

    if (!shop || !clientId) {
        return NextResponse.json({ error: 'Missing SHOPIFY_SHOP_DOMAIN or SHOPIFY_CLIENT_ID in .env.local' }, { status: 500 })
    }

    // Shopifyの承認画面URLを生成
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`

    return NextResponse.redirect(authUrl)
}
