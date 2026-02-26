import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('mappings').select('*')

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const supabase = createAdminClient()
    const { shopify_product_id, contract_address, nft_template_id } = await request.json()

    const { data, error } = await supabase
        .from('mappings')
        .upsert({
            shopify_product_id,
            contract_address: contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID || "default",
            nft_template_id,
            updated_by: null
        }, { onConflict: 'shopify_product_id' })
        .select()

    if (error) {
        console.error('[Mappings] Upsert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit Log
    await supabase.from('audit_logs').insert({
        user_id: null,
        action: 'UPDATE_MAPPING',
        details: { shopify_product_id, contract_address, nft_template_id }
    })

    return NextResponse.json(data)
}
