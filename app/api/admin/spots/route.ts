import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const supabase = createAdminClient();
        const { data: spots, error } = await supabase
            .from("nft_distribution_spots")
            .select(`
                *,
                nft_templates (
                    id,
                    name,
                    image_url
                )
            `)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(spots);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const supabase = createAdminClient();

        // 必須フィールドの検証
        if (!body.template_id || !body.name || !body.slug) {
            return NextResponse.json(
                { error: "必須項目が入力されていません（テンプレート、表示名、URLスラッグ）。" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("nft_distribution_spots")
            .insert({
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
