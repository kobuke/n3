import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, walletAddress: providedWalletAddress } = body;

    let walletAddress: string | undefined;
    let finalEmail: string = email;

    const supabase = createAdminClient();

    if (providedWalletAddress) {
      // Direct wallet login (e.g. MetaMask)
      walletAddress = providedWalletAddress;
      finalEmail = email || `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`; // Fallback display name

      // Upsert into users table just in case they are new but logging in via wallet direct
      const { data: existingUser } = await supabase.from('users').select('id').eq('walletaddress', walletAddress).maybeSingle();
      if (!existingUser) {
        // Attempt upsert (graceful fail if email constraint etc)
        await supabase.from('users').insert({ email: finalEmail, walletaddress: walletAddress }).select().maybeSingle();
      }

    } else if (email) {
      // Email based login
      if (typeof email !== "string") {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      const { data: userRecord } = await supabase
        .from('users')
        .select('walletaddress')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      walletAddress = userRecord?.walletaddress;

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
