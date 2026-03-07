import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching notification:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json()
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('notifications')
            .update({
                title: body.title,
                content: body.content,
                type: body.type,
                link_url: body.link_url
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error updating notification:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting notification:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
