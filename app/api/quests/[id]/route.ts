import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('quests')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json()
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('quests')
            .update({
                title: body.title,
                description: body.description,
                base_nft_template_id: body.base_nft_template_id || null,
                is_sequential: body.is_sequential,
                reward_nft_template_id: body.reward_nft_template_id || null,
                clear_metadata_uri: body.clear_metadata_uri,
                is_active: body.is_active
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('quests')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
