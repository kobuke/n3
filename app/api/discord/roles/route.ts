import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getGuildRoles } from "@/lib/discord";

/**
 * GET /api/discord/roles
 * Returns available Discord roles from the guild + current role mappings from DB.
 */
export async function GET(req: NextRequest) {
    // Verify staff auth
    const staffSecret = req.cookies.get("nanjo_staff_secret")?.value;
    if (!staffSecret || staffSecret !== process.env.STAFF_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        // Fetch guild roles from Discord
        let guildRoles: any[] = [];
        try {
            guildRoles = await getGuildRoles();
        } catch (err) {
            console.error("Failed to fetch guild roles:", err);
            // Continue with empty — the UI can still show existing mappings
        }

        // Fetch current mappings from DB
        const supabase = createAdminClient();
        const { data: mappings, error } = await supabase
            .from("discord_role_mappings")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to fetch mappings:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            guildRoles,
            mappings: mappings || [],
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/discord/roles
 * Create or update a role mapping.
 */
export async function POST(req: NextRequest) {
    const staffSecret = req.cookies.get("nanjo_staff_secret")?.value;
    if (!staffSecret || staffSecret !== process.env.STAFF_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const {
            collection_address,
            collection_name,
            discord_role_id,
            discord_role_name,
            description,
        } = body;

        if (!collection_address || !discord_role_id) {
            return NextResponse.json(
                { error: "collection_address and discord_role_id are required" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("discord_role_mappings")
            .upsert(
                {
                    collection_address,
                    collection_name: collection_name || null,
                    discord_role_id,
                    discord_role_name: discord_role_name || null,
                    description: description || null,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "collection_address,discord_role_id" }
            )
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, mapping: data });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * DELETE /api/discord/roles
 * Remove a role mapping.
 */
export async function DELETE(req: NextRequest) {
    const staffSecret = req.cookies.get("nanjo_staff_secret")?.value;
    if (!staffSecret || staffSecret !== process.env.STAFF_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const supabase = createAdminClient();
        const { error } = await supabase
            .from("discord_role_mappings")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
