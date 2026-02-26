import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const { lineId, displayName } = await req.json();

        if (!lineId) {
            return NextResponse.json({ error: "lineId is required" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Check if user already exists with this LINE ID
        const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('email, walletAddress')
            .eq('lineId', lineId)
            .single();

        if (existingUser && existingUser.walletAddress) {
            // User is already registered and linked -> Establish session
            await setSession({
                email: existingUser.email,
                walletAddress: existingUser.walletAddress,
                authenticated: true,
            });

            return NextResponse.json({
                ok: true,
                message: "Successfully logged in via LINE",
                walletAddress: existingUser.walletAddress,
                status: "authenticated"
            });
        }

        // 2. User is not registered or completely linked
        // Return a specific status so the frontend knows to redirect to Email OTP screen.
        // The frontend should then pass this `lineId` along with the OTP verification.
        return NextResponse.json({
            ok: true,
            status: "needs_email",
            lineId,
            message: "Proceed to email verification to link account and create wallet."
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("LINE Login API Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
