import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = createAdminClient()

        // Run all checks concurrently for better performance
        const [mappingsRes, spotsRes, questsRes] = await Promise.all([
            supabase.from('mappings').select('id').eq('nft_template_id', id).limit(1),
            supabase.from('nft_distribution_spots').select('id').eq('template_id', id).eq('is_active', true).limit(1),
            supabase.from('quests').select('id').eq('is_active', true).or(`base_nft_template_id.eq.${id},reward_nft_template_id.eq.${id}`).limit(1)
        ])

        if (mappingsRes.data && mappingsRes.data.length > 0) {
            return NextResponse.json({
                error: 'このテンプレートは現在Shopify商品に紐付いているため削除できません。先に商品マッピングの紐付けを解除してください。'
            }, { status: 400 })
        }

        if (spotsRes.data && spotsRes.data.length > 0) {
            return NextResponse.json({
                error: 'このテンプレートは現在「配布スポット」に設定されているため削除できません。先に配布スポットを削除または変更してください。'
            }, { status: 400 })
        }

        if (questsRes.data && questsRes.data.length > 0) {
            return NextResponse.json({
                error: 'このテンプレートは現在「クエスト（スタンプラリー）」の条件または報酬に設定されているため削除できません。先にクエスト設定を変更してください。'
            }, { status: 400 })
        }

        const { error } = await supabase
            .from('nft_templates')
            .update({ is_deleted: true })
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
