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

        // Auto-generate a new Backend Wallet if user doesn't have one
        if (!walletAddress) {
            console.log(`No wallet found for email ${email}, generating via Thirdweb Engine...`);
            try {
                const createUrl = `https://${process.env.THIRDWEB_ENGINE_URL}/backend-wallet/create`;
                const res = await fetch(createUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.THIRDWEB_ENGINE_ACCESS_TOKEN}`,
                    },
                    body: JSON.stringify({ label: `user-${email}` }),
                });

                if (res.ok) {
                    const data = await res.json();
                    walletAddress = data.result.walletAddress;
                    console.log(`Engine wallet created: ${walletAddress}`);

                    // Save new user / update wallet to DB
                    const { error: upsertError } = await supabase.from('users').upsert(
                        { email, walletaddress: walletAddress },
                        { onConflict: 'email', ignoreDuplicates: false }
                    );

                    if (upsertError) {
                        console.error("Failed to save auto-generated wallet to DB:", upsertError.message);
                    }
                } else {
                    const errText = await res.text();
                    console.error(`Engine wallet creation failed: ${errText}`);
                }
            } catch (e: any) {
                console.error("Engine Wallet Creation Error in OTP path:", e.message);
            }
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
