import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/discord/status
 * Check if the current user has linked their Discord account.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();

    if (!session?.walletAddress) {
        return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("discord_users")
            .select("discord_user_id, discord_username, created_at")
            .eq("wallet_address", session.walletAddress)
            .single();

        if (error || !data) {
            return NextResponse.json({ linked: false });
        }

        return NextResponse.json({
            linked: true,
            discordUsername: data.discord_username,
            discordUserId: data.discord_user_id,
            linkedAt: data.created_at,
        });
    } catch {
        return NextResponse.json({ linked: false });
    }
}
