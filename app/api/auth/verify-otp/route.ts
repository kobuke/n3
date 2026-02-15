import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession, clearSession } from "@/lib/session";
import { getWalletByEmail } from "@/lib/crossmint";

export async function POST(req: NextRequest) {
    try {
        const { otp: userInputOtp } = await req.json();
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

        // OTP Verified -> Get Wallet
        const email = session.pendingEmail;
        let wallet;
        try {
            wallet = await getWalletByEmail(email);
        } catch (err: any) {
            if (err.message?.includes("404")) {
                return NextResponse.json(
                    { error: "このメールアドレスに紐づくウォレットが見つかりません。NFTが発行されたメールアドレスでログインしてください。" },
                    { status: 404 }
                );
            }
            throw err;
        }

        const walletAddress = wallet.publicKey ?? wallet.address;

        if (!walletAddress) {
            return NextResponse.json(
                { error: "このメールアドレスに紐づくウォレットが見つかりません。NFTが発行されたメールアドレスでログインしてください。" },
                { status: 404 }
            );
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

