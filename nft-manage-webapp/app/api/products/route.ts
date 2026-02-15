import { NextResponse } from 'next/server'

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
    const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN

    if (shopDomain && accessToken) {
        try {
            const response = await fetch(`https://${shopDomain}/admin/api/2024-01/products.json?status=active`, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
                next: { revalidate: 0 } // Disable cache for sync
            })

            if (!response.ok) {
                console.error('Shopify API Error:', await response.text())
                // Fallback to mock if API fails but return error status? 
                // For now, let's return mock with a warning or just throw
                return NextResponse.json({ error: 'Failed to fetch from Shopify' }, { status: response.status })
            }

            const data = await response.json()
            const products = data.products.map((p: any) => ({
                id: String(p.id),
                title: p.title,
                sku: p.variants?.[0]?.sku || 'N/A',
                price: p.variants?.[0]?.price || '0.00',
                image: p.image?.src || "/placeholder.svg?height=80&width=80",
                status: p.status,
            }))

            return NextResponse.json(products)
        } catch (error) {
            console.error('Shopify Fetch Error:', error)
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        }
    }

    return NextResponse.json(MOCK_PRODUCTS)
}
