import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const supabase = createAdminClient();

        if (!id) {
            return NextResponse.json({ error: "No ID provided" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("nft_distribution_spots")
            .update({
                template_id: body.template_id,
                name: body.name,
                description: body.description || "",
                slug: body.slug,
                is_location_restricted: body.is_location_restricted || false,
                latitude: body.latitude || null,
                longitude: body.longitude || null,
                radius_meters: body.radius_meters || 100,
                is_active: body.is_active !== undefined ? body.is_active : true,
                max_claims_total: body.max_claims_total || null
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505' && error.message.includes('slug')) {
                return NextResponse.json({ error: "このURLスラッグは既に使用されています。別のものを指定してください。" }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createAdminClient();

        if (!id) {
            return NextResponse.json({ error: "No ID provided" }, { status: 400 });
        }

        const { error } = await supabase
            .from("nft_distribution_spots")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
