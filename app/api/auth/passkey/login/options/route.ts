import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";
import { getWebAuthnRpConfig } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email: rawEmail } = await req.json();
  if (!rawEmail || typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Email is required", errorCode: "email_required" }, { status: 400 });
  }

  const email = rawEmail.trim().toLowerCase();
  const supabase = createAdminClient();
  const { data: passkeys } = await supabase
    .from("user_passkeys")
    .select("credential_id, transports")
    .eq("email", email);

  if (!passkeys || passkeys.length === 0) {
    return NextResponse.json({ error: "No passkey registered", errorCode: "passkey_not_registered" }, { status: 404 });
  }

  const { rpID } = getWebAuthnRpConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: passkeys.map((passkey) => ({
      id: passkey.credential_id,
      transports: passkey.transports || undefined,
    })),
  });

  await setSession({
    webauthnChallenge: options.challenge,
    webauthnEmail: email,
    webauthnCredentialIds: passkeys.map((passkey) => passkey.credential_id),
  });

  return NextResponse.json(options);
}
