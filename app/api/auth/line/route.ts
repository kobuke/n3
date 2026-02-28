import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const { lineId } = await req.json();
        if (!lineId) {
            return NextResponse.json({ error: "No lineId provided." }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Check if user exists with this lineId
        const { data: userRecord } = await supabase
            .from('users')
            .select('email, walletaddress')
            .eq('lineid', lineId)
            .maybeSingle();

        if (userRecord && userRecord.walletaddress) {
            // Associated account found, log them in automatically
            await setSession({
                email: userRecord.email || undefined,
                walletAddress: userRecord.walletaddress,
                authenticated: true,
            });

            return NextResponse.json({ ok: true, walletAddress: userRecord.walletaddress, linked: true });
        }

        // Not linked yet
        return NextResponse.json({ ok: true, linked: false });

    } catch (err: unknown) {
        console.error("LINE Auth error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
