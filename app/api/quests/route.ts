import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('quests')
            .select(`
                *,
                nft_templates!base_nft_template_id(name)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('Error fetching quests:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('quests')
            .insert([{
                title: body.title,
                description: body.description,
                base_nft_template_id: body.base_nft_template_id || null,
                is_sequential: body.is_sequential || false,
                reward_nft_template_id: body.reward_nft_template_id || null,
                clear_metadata_uri: body.clear_metadata_uri || null,
                is_active: body.is_active || false
            }])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error creating quest:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
