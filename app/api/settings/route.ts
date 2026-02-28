import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings?keys=key1,key2
 * Returns key-value pairs from app_settings table
 */
export async function GET(req: NextRequest) {
    try {
        const keysParam = req.nextUrl.searchParams.get("keys");
        if (!keysParam) {
            return NextResponse.json({ error: "keys parameter required" }, { status: 400 });
        }

        const keys = keysParam.split(",").map(k => k.trim());
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("app_settings")
            .select("key, value")
            .in("key", keys);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Convert array to key-value object
        const result: Record<string, string> = {};
        for (const row of data || []) {
            result[row.key] = row.value;
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/settings
 * Body: { key1: value1, key2: value2, ... }
 * Upserts key-value pairs into app_settings table
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const supabase = createAdminClient();

        const entries = Object.entries(body);
        for (const [key, value] of entries) {
            await supabase
                .from("app_settings")
                .upsert(
                    { key, value: String(value), updated_at: new Date().toISOString() },
                    { onConflict: "key" }
                );
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
