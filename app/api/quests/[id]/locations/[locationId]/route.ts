import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string, locationId: string }> }) {
    try {
        const { id, locationId } = await params;
        const body = await request.json()
        const supabase = createAdminClient()

        const { data, error } = await supabase
            .from('quest_locations')
            .update({
                order_index: body.order_index,
                name: body.name,
                description: body.description,
                lat: body.lat,
                lng: body.lng,
                radius_meters: body.radius_meters,
                levelup_metadata_uri: body.levelup_metadata_uri || null
            })
            .eq('id', locationId)
            .eq('quest_id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, locationId: string }> }) {
    try {
        const { id, locationId } = await params;
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('quest_locations')
            .delete()
            .eq('id', locationId)
            .eq('quest_id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
