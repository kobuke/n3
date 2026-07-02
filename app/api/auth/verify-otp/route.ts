import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession, clearSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveOrCreateUserForEmail } from "@/lib/auth-user";

export async function POST(req: NextRequest) {
    try {
        const { otp: userInputOtp, lineId } = await req.json();
        const session = await getSession();

        if (!session || !session.otp || !session.pendingEmail || !session.otpExpires) {
            return NextResponse.json({ error: "Session expired, please retry login." }, { status: 400 });
        }

        if (Date.now() > session.otpExpires) {
            clearSession();
            return NextResponse.json({ error: "OTP expired." }, { status: 400 });
        }

        if (session.otp !== userInputOtp) {
            return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
        }

        const email = session.pendingEmail;
        const supabase = createAdminClient();
        const authUser = await resolveOrCreateUserForEmail(email, { supabase });
        const walletAddress = authUser.walletAddress || undefined;

        // Link LINE ID if provided
        if (lineId) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ lineid: lineId })
                .eq('email', email);

            if (updateError) {
                console.error("Failed to link LINE ID:", updateError.message);
            }
        }

        // Set Final Authenticated Session
        await setSession({
            email,
            walletAddress,
            authenticated: true,
        });

        const { data: passkeys } = await supabase
            .from("user_passkeys")
            .select("id")
            .eq("email", email.toLowerCase())
            .limit(1);
        const passkeyEnabled = Boolean(passkeys && passkeys.length > 0);

        return NextResponse.json({ ok: true, walletAddress, passkeyEnabled });

    } catch (err: unknown) {
        console.error("OTP Verify error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
