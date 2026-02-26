import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const payload = await request.json()
        const { id, name, description, image_url, type, is_transferable, contract_address } = payload

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const payloadToSave: any = {
            name,
            description,
            image_url,
            type,
            is_transferable,
            contract_address
        }

        if (id) {
            // Update
            const { data, error } = await supabase
                .from('nft_templates')
                .update(payloadToSave)
                .eq('id', id)
                .select()
                .single()

            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json(data)
        } else {
            // Insert
            const { data, error } = await supabase
                .from('nft_templates')
                .insert(payloadToSave)
                .select()
                .single()

            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json(data)
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
