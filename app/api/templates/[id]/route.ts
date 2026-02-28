import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = createAdminClient()

        // Before deleting, check if it's being used in mappings
        const { data: mappings } = await supabase
            .from('mappings')
            .select('id')
            .eq('nft_template_id', id)
            .limit(1)

        if (mappings && mappings.length > 0) {
            return NextResponse.json({
                error: 'このテンプレートは現在Shopify商品に紐付いているため削除できません。先に紐付けを解除してください。'
            }, { status: 400 })
        }

        const { error } = await supabase
            .from('nft_templates')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('nft_templates')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
