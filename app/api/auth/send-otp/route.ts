import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { cookies } from "next/headers";
import { OTP_COOKIE_KEY, signOtpPayload } from "@/lib/otp-token";
import { getSessionSecret } from "@/lib/session-token";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: "なんじょうNFTポータル <noreply@resend.nomadresort.jp>",
            to: [email],
            subject: "認証コード / Verification Code - なんじょうNFTポータル",
            html: `
                <p>認証コード: <strong>${otp}</strong></p>
                <p>このコードは10分間有効です。</p>
                <hr />
                <p>Verification Code: <strong>${otp}</strong></p>
                <p>This code is valid for 10 minutes.</p>
            `,
        });

        if (error) {
            console.error("Resend error:", error);
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        const cookieStore = await cookies();
        const otpToken = signOtpPayload({
            otp,
            pendingEmail: email,
            otpExpires: Date.now() + 10 * 60 * 1000, // 10 mins
        }, getSessionSecret());
        cookieStore.set(OTP_COOKIE_KEY, otpToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 10 * 60,
        });

        return NextResponse.json({ ok: true });

    } catch (err: unknown) {
        console.error("OTP Send error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
