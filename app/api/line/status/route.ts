import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/line/status
 *
 * 現在ログイン中のユーザーのLINE連携状態を返す。
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session?.walletAddress || !session.authenticated) {
            return NextResponse.json({ linked: false });
        }

        const supabase = createAdminClient();
        const { data } = await supabase
            .from("users")
            .select("lineid")
            .eq("walletaddress", session.walletAddress)
            .maybeSingle();

        if (data?.lineid) {
            return NextResponse.json({
                linked: true,
                lineId: data.lineid,
            });
        }

        return NextResponse.json({ linked: false });
    } catch (err) {
        console.error("LINE status error:", err);
        return NextResponse.json({ linked: false });
    }
}
