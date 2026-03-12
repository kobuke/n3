import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 600; // Cache for 10 minutes to reduce DB load

export async function GET(req: NextRequest) {
    try {
        const templateId = req.nextUrl.searchParams.get("templateId");
        
        if (!templateId) {
            return NextResponse.json({ error: "templateId is required" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // ミントの成功履歴から、該当テンプレートを所持している重複のないウォレットの数を取得する
        // (簡易的なコミュニティ人数の算出)
        const { data: logs, error: logsError } = await supabase
            .from("mint_logs")
            .select("recipient_wallet")
            .eq("template_id", templateId)
            .eq("status", "success");

        if (logsError) {
            return NextResponse.json({ error: logsError.message }, { status: 500 });
        }

        const uniqueWallets = new Set(
            logs?.map(l => l.recipient_wallet?.toLowerCase()).filter(Boolean)
        );
        const holdersCount = uniqueWallets.size;

        return NextResponse.json({ templateId, holdersCount });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
