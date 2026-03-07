import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('notifications')
            .insert([{
                title: body.title,
                content: body.content,
                type: body.type || 'info',
                link_url: body.link_url || null
            }])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error creating notification:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
