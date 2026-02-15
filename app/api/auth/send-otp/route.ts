import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { setSession, getSession } from "@/lib/session";

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory store for OTPs (Ideally use Redis/KV in production, but memory works for single instance)
// Using a global map is risky in serverless, but for a simple demo it might suffice. 
// A better simple approach is storing the OTP hash in a signed cookie.
// Let's use a signed cookie approach for statelessness:
// 1. /api/auth/send-otp -> Generates OTP, sends email, returns { ok: true } and sets a cookie `otp_hash`
// 2. /api/auth/verify-otp -> User sends OTP, server hashes it and compares with `otp_hash` cookie.

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash the OTP (simple sha256 for verification later)
        // To keep it simple for now, we will store the OTP in the session cookie temporarily with a flag `otp_pending`.

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: "Nanjo NFT Wallet <noreply@resend.nomadresort.jp>",
            to: [email],
            subject: "認証コード - Nanjo NFT Wallet",
            html: `<p>認証コード: <strong>${otp}</strong></p><p>このコードは10分間有効です。</p>`,
        });

        if (error) {
            console.error("Resend error:", error);
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        // Store OTP in a temporary session or cookie
        // We'll update the session to specific "otp_pending" state
        // We store the email too, to ensure the code matches the email
        await setSession({
            otp,
            pendingEmail: email,
            otpExpires: Date.now() + 10 * 60 * 1000 // 10 mins
        });

        return NextResponse.json({ ok: true });

    } catch (err: unknown) {
        console.error("OTP Send error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
