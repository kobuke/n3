import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Auto-populate walletAddress if missing but user is logged in
  let walletAddress = session.walletAddress;
  if (!walletAddress && session.email) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users")
      .select("walletaddress")
      .eq("email", session.email)
      .maybeSingle();

    if (user?.walletaddress) {
      walletAddress = user.walletaddress;
      const { setSession } = await import("@/lib/session");
      await setSession({ walletAddress });
    }
  }

  return NextResponse.json({ authenticated: true, ...session, walletAddress });
}
