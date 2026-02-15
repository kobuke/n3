import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDiscordAuthUrl } from "@/lib/discord";
import crypto from "crypto";

/**
 * GET /api/auth/discord
 * 
 * Redirects the user to Discord's OAuth2 authorization page.
 * The user must be logged in (have a session with walletAddress).
 */
export async function GET(req: NextRequest) {
    const session = await getSession();

    if (!session?.walletAddress) {
        return NextResponse.json(
            { error: "You must be logged in first" },
            { status: 401 }
        );
    }

    // Generate a random state parameter for CSRF protection
    // Encode the wallet address in the state so we can retrieve it in the callback
    const statePayload = JSON.stringify({
        wallet: session.walletAddress,
        email: session.email || "",
        nonce: crypto.randomBytes(16).toString("hex"),
    });
    const state = Buffer.from(statePayload).toString("base64url");

    const authUrl = getDiscordAuthUrl(state);
    return NextResponse.redirect(authUrl);
}
