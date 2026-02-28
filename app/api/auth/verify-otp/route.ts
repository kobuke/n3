import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession, clearSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

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

        // OTP Verified -> Get Wallet from Supabase DB
        const email = session.pendingEmail;
        const supabase = createAdminClient();

        // Check if user exists
        const { data: userRecord } = await supabase
            .from('users')
            .select('walletaddress')
            .eq('email', email)
            .maybeSingle();

        let walletAddress = userRecord?.walletaddress;

        // Note: For full thirdweb In-App Wallet integration, the backend might generate the wallet here
        // if userRecord does not exist. That is typical of the Email OTP flow.

        // If a wallet doesn't exist yet, we still allow login, but walletAddress will be undefined/null.
        // We will prompt them to generate a wallet or claim their NFT on the mypage or claim page.
        if (!walletAddress) {
            console.log(`No wallet found for email ${email}, creating session anyway. User will need to connect/create wallet.`);
        }

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

        return NextResponse.json({ ok: true, walletAddress });

    } catch (err: unknown) {
        console.error("OTP Verify error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
