import { NextResponse } from 'next/server'
import { getShopifyRestClient } from '@/lib/shopify'

// Mock data for now as we don't have real Shopify credentials in this environment
// In production, this would fetch from Shopify Admin API
const MOCK_PRODUCTS = [
    {
        id: "prod_001",
        title: "Nomad Explorer Pass",
        sku: "NEP-2026",
        price: "$199.00",
        image: "/placeholder.svg?height=80&width=80",
        status: "active",
    },
    {
        id: "prod_002",
        title: "Beach Villa Access NFT",
        sku: "BVA-2026",
        price: "$499.00",
        image: "/placeholder.svg?height=80&width=80",
        status: "active",
    },
    {
        id: "prod_003",
        title: "Sunset Lounge Membership",
        sku: "SLM-2026",
        price: "$149.00",
        image: "/placeholder.svg?height=80&width=80",
        status: "active",
    },
]

export async function GET() {
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN
    const clientId = process.env.SHOPIFY_CLIENT_ID
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET

    if (shopDomain && clientId && clientSecret) {
        try {
            const client = await getShopifyRestClient()

            const response = await client.get({
                path: 'products',
                query: { status: 'active' },
            })

            const data = response.body as any
            const products = data.products.map((p: any) => ({
                id: String(p.id),
                title: p.title,
                sku: p.variants?.[0]?.sku || 'N/A',
                price: p.variants?.[0]?.price || '0.00',
                image: p.image?.src || "/placeholder.svg?height=80&width=80",
                status: p.status,
            }))

            return NextResponse.json(products)
        } catch (error: any) {
            console.error('Shopify Fetch Error:', error?.message || error)
            // 画面（配列を期待している）をクラッシュさせないため、エラー情報を含めつつ空の配列を返す
            return NextResponse.json({ error: 'Failed to fetch from Shopify', data: [] }, { status: 500 })
        }
    }

    return NextResponse.json(MOCK_PRODUCTS)
}
