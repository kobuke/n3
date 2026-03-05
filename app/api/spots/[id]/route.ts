import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const idOrSlug = context.params.id;
        if (!idOrSlug) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Check if idOrSlug is UUID or slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

        let query = supabase
            .from("nft_distribution_spots")
            .select(`
                *,
                nft_templates (
                    id,
                    name,
                    description,
                    image_url,
                    type,
                    is_transferable,
                    max_supply,
                    current_supply
                )
            `)
            .eq("is_active", true);

        if (isUuid) {
            query = query.eq("id", idOrSlug);
        } else {
            query = query.eq("slug", idOrSlug);
        }

        const { data: spot, error } = await query.single();

        if (error || !spot) {
            return NextResponse.json({ error: "配布が見つかりません。" }, { status: 404 });
        }

        return NextResponse.json(spot);
    } catch (error: any) {
        console.error("Fetch spot error:", error);
        return NextResponse.json(
            { error: "エラーが発生しました。" },
            { status: 500 }
        );
    }
}
