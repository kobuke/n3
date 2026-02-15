import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const { secret } = await req.json();

        if (secret !== process.env.STAFF_SECRET) {
            return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
        }

        // Set HTTP-only cookie
        const cookieStore = await cookies();
        cookieStore.set("nanjo_staff_secret", secret, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
