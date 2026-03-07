import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('Error fetching surveys:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('surveys')
            .insert([{
                title: body.title,
                description: body.description,
                questions: body.questions || [],
                nft_template_ids: body.nft_template_ids || [],
                is_active: body.is_active || false,
                max_answers_per_user: body.max_answers_per_user ?? 1
            }])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error creating survey:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
