import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, setSession, clearSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveOrCreateUserForEmail } from "@/lib/auth-user";
import { OTP_COOKIE_KEY, parseOtpPayload } from "@/lib/otp-token";
import { getSessionSecret } from "@/lib/session-token";

export async function POST(req: NextRequest) {
    try {
        const { otp: userInputOtp, lineId } = await req.json();
        const session = await getSession();
        const cookieStore = await cookies();
        const rawOtpToken = cookieStore.get(OTP_COOKIE_KEY)?.value;
        const otpPayload = rawOtpToken
            ? parseOtpPayload(rawOtpToken, getSessionSecret())
            : null;
        const pendingOtp = otpPayload?.otp || session?.otp;
        const pendingEmail = otpPayload?.pendingEmail || session?.pendingEmail;
        const otpExpires = otpPayload?.otpExpires || session?.otpExpires;

        if (!pendingOtp || !pendingEmail || !otpExpires) {
            return NextResponse.json({ error: "Session expired, please retry login." }, { status: 400 });
        }

        if (Date.now() > otpExpires) {
            clearSession();
            cookieStore.delete(OTP_COOKIE_KEY);
            return NextResponse.json({ error: "OTP expired." }, { status: 400 });
        }

        if (pendingOtp !== userInputOtp) {
            return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
        }

        const email = pendingEmail;
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
            otp: undefined,
            pendingEmail: undefined,
            otpExpires: undefined,
        });
        cookieStore.delete(OTP_COOKIE_KEY);

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
