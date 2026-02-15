import { NextRequest, NextResponse } from "next/server";
import { getWalletByEmail } from "@/lib/crossmint";
import { setSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const wallet = await getWalletByEmail(email.trim().toLowerCase());
    const walletAddress = wallet.publicKey ?? wallet.address;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet not found for this email" },
        { status: 404 }
      );
    }

    await setSession({ email: email.trim().toLowerCase(), walletAddress });

    return NextResponse.json({ ok: true, walletAddress });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Login error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
