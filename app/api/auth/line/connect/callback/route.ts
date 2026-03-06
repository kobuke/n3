import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/line/connect/callback
 *
 * LINE OAuth コールバック。
 * 認可コードをアクセストークンに交換し、LINEプロフィールを取得。
 * users テーブルの lineid を更新してLINE連携を完了する。
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/mypage?line=error&reason=missing_params", req.url)
        );
    }

    try {
        // 1. state からウォレットアドレスを取得
        const statePayload = JSON.parse(
            Buffer.from(state, "base64url").toString("utf-8")
        );
        const { wallet: walletAddress } = statePayload;

        if (!walletAddress) {
            return NextResponse.redirect(
                new URL("/mypage?line=error&reason=invalid_state", req.url)
            );
        }

        // 2. 認可コードをアクセストークンに交換
        const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/connect/callback`,
                client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
                client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
            }),
        });

        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            console.error("LINE token exchange failed:", errText);
            return NextResponse.redirect(
                new URL("/mypage?line=error&reason=token_exchange_failed", req.url)
            );
        }

        const tokens = await tokenRes.json();

        // 3. LINEプロフィールを取得
        const profileRes = await fetch("https://api.line.me/v2/profile", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!profileRes.ok) {
            console.error("LINE profile fetch failed:", await profileRes.text());
            return NextResponse.redirect(
                new URL("/mypage?line=error&reason=profile_fetch_failed", req.url)
            );
        }

        const profile = await profileRes.json();
        const lineUserId = profile.userId;
        const lineDisplayName = profile.displayName;

        // 4. DB更新: users テーブルの lineid を設定
        const supabase = createAdminClient();
        const { error: updateError } = await supabase
            .from("users")
            .update({ lineid: lineUserId })
            .eq("walletaddress", walletAddress);

        if (updateError) {
            console.error("Failed to link LINE:", updateError.message);
            return NextResponse.redirect(
                new URL("/mypage?line=error&reason=db_update_failed", req.url)
            );
        }

        // 5. 成功 — マイページにリダイレクト
        return NextResponse.redirect(
            new URL(
                `/mypage?line=success&name=${encodeURIComponent(lineDisplayName || "")}`,
                req.url
            )
        );
    } catch (err: unknown) {
        console.error("LINE connect callback error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.redirect(
            new URL(
                `/mypage?line=error&reason=${encodeURIComponent(message)}`,
                req.url
            )
        );
    }
}
