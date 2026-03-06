import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import crypto from "crypto";

/**
 * GET /api/auth/line/connect
 *
 * マイページの「LINE連携」ボタンから呼ばれる。
 * ログイン済みユーザーをLINE OAuth認可ページへリダイレクトし、
 * コールバックでlineIdをDBに保存する。
 */
export async function GET(req: NextRequest) {
    const session = await getSession();

    if (!session?.walletAddress || !session.authenticated) {
        return NextResponse.json(
            { error: "ログインが必要です" },
            { status: 401 }
        );
    }

    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/connect/callback`;

    if (!channelId) {
        return NextResponse.json(
            { error: "LINE Login is not configured" },
            { status: 500 }
        );
    }

    // CSRF保護用のstate。wallet/emailを含めてコールバックで使う
    const statePayload = JSON.stringify({
        wallet: session.walletAddress,
        email: session.email || "",
        nonce: crypto.randomBytes(16).toString("hex"),
    });
    const state = Buffer.from(statePayload).toString("base64url");

    const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", channelId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "profile openid");
    authUrl.searchParams.set("bot_prompt", "normal");

    return NextResponse.redirect(authUrl.toString());
}
