import { NextRequest, NextResponse } from "next/server";
import {
    exchangeCode,
    getDiscordUser,
    addUserToGuildWithRoles,
} from "@/lib/discord";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/discord/callback
 * 
 * Handles the Discord OAuth2 callback:
 * 1. Exchange authorization code for tokens
 * 2. Get the Discord user's profile
 * 3. Save the Discord user info to Supabase
 * 4. Look up applicable role mappings based on NFT ownership
 * 5. Add user to guild with roles
 * 6. Redirect back to mypage with success/error
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/mypage?discord=error&reason=missing_params", req.url)
        );
    }

    try {
        // 1. Decode state to get wallet address
        const statePayload = JSON.parse(
            Buffer.from(state, "base64url").toString("utf-8")
        );
        const { wallet: walletAddress, email } = statePayload;

        if (!walletAddress) {
            return NextResponse.redirect(
                new URL("/mypage?discord=error&reason=invalid_state", req.url)
            );
        }

        // 2. Exchange code for tokens
        const tokens = await exchangeCode(code);

        // 3. Get Discord user info
        const discordUser = await getDiscordUser(tokens.access_token);

        // 4. Save to Supabase
        const supabase = createAdminClient();
        const tokenExpiresAt = new Date(
            Date.now() + tokens.expires_in * 1000
        ).toISOString();

        await supabase.from("discord_users").upsert(
            {
                wallet_address: walletAddress,
                email: email || null,
                discord_user_id: discordUser.id,
                discord_username:
                    discordUser.global_name || discordUser.username,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: tokenExpiresAt,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "wallet_address" }
        );

        // 5. Add user to guild (without roles initially, Sync API will handle it on Mypage load)
        const syncResult = await addUserToGuildWithRoles(
            tokens.access_token,
            discordUser.id,
            []
        );

        // 6. Log the join
        await supabase.from("discord_sync_logs").insert({
            discord_user_id: discordUser.id,
            wallet_address: walletAddress,
            action: "guild_joined",
            details: {
                username: discordUser.username,
                is_new_member: syncResult.isNewMember,
            },
        });

        // 8. Redirect back with success
        return NextResponse.redirect(
            new URL(
                `/mypage?discord=success&username=${encodeURIComponent(
                    discordUser.global_name || discordUser.username
                )}`,
                req.url
            )
        );
    } catch (err: unknown) {
        console.error("Discord callback error:", err);
        const message =
            err instanceof Error ? err.message : "Unknown error";

        // Try to log error
        try {
            const supabase = createAdminClient();
            await supabase.from("discord_sync_logs").insert({
                discord_user_id: "unknown",
                action: "error",
                details: { error: message },
            });
        } catch {
            // ignore logging errors
        }

        return NextResponse.redirect(
            new URL(
                `/mypage?discord=error&reason=${encodeURIComponent(message)}`,
                req.url
            )
        );
    }
}
