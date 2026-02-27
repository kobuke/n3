import { verifyShopifyWebhook } from '@/lib/shopify'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const hmac = request.headers.get('X-Shopify-Hmac-Sha256')
    const rawBody = await request.text()

    // HMAC検証
    if (!verifyShopifyWebhook(hmac, rawBody, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
        console.error('[Webhook] HMAC verification FAILED')
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 })
    }

    console.log('[Webhook] HMAC verified OK - triggering Netlify Background Function...')

    // Netlify Background Function を呼び出す（即座に202が返るため Shopify タイムアウトを回避）
    const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL || 'https://n3-nanjo-nft.netlify.app'
    const bgFunctionUrl = `${siteUrl}/.netlify/functions/process-shopify-order-background`

    fetch(bgFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawBody }),
    }).catch(err => console.error('[Webhook] Failed to trigger background function:', err))

    // Shopifyに即座に200を返す
    return NextResponse.json({ received: true })
}
