import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching survey:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json()
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('surveys')
            .update({
                title: body.title,
                description: body.description,
                questions: body.questions,
                nft_template_ids: body.nft_template_ids,
                is_active: body.is_active,
                max_answers_per_user: body.max_answers_per_user ?? 1
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error updating survey:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('surveys')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting survey:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
