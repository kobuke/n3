import { NextRequest, NextResponse } from "next/server";
import { getWalletByEmail } from "@/lib/crossmint";
import { setSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, walletAddress: providedWalletAddress } = body;

    let walletAddress: string | undefined;
    let finalEmail: string = email;

    if (providedWalletAddress) {
      // Direct wallet login (e.g. MetaMask)
      walletAddress = providedWalletAddress;
      finalEmail = email || `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`; // Fallback display name
    } else if (email) {
      // Email based login (Crossmint)
      if (typeof email !== "string") {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      const wallet = await getWalletByEmail(email.trim().toLowerCase());
      walletAddress = wallet.publicKey ?? wallet.address;
    } else {
      return NextResponse.json({ error: "Email or Wallet Address is required" }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    await setSession({
      email: finalEmail,
      walletAddress
    });

    return NextResponse.json({ ok: true, walletAddress });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Login error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
