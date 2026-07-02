import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession, setSession } from "@/lib/session";
import { resolveOrCreateUserForEmail } from "@/lib/auth-user";
import { getWebAuthnRpConfig, storedPasskeyToAuthenticator } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.webauthnChallenge || !session.webauthnEmail) {
    return NextResponse.json({ error: "Passkey login session expired", errorCode: "passkey_login_session_expired" }, { status: 400 });
  }

  const body = await req.json();
  const credentialId = body.id;
  if (!credentialId || !session.webauthnCredentialIds?.includes(credentialId)) {
    return NextResponse.json({ error: "Unknown passkey", errorCode: "passkey_unknown" }, { status: 400 });
  }

  const email = session.webauthnEmail;
  const supabase = createAdminClient();
  const { data: passkey } = await supabase
    .from("user_passkeys")
    .select("id, email, credential_id, public_key, counter, transports")
    .eq("credential_id", credentialId)
    .eq("email", email)
    .maybeSingle();

  if (!passkey) {
    return NextResponse.json({ error: "Unknown passkey", errorCode: "passkey_unknown" }, { status: 400 });
  }

  const { origin, rpID } = getWebAuthnRpConfig();
  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: session.webauthnChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: storedPasskeyToAuthenticator(passkey),
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey verification failed", errorCode: "passkey_verification_failed" }, { status: 400 });
  }

  const authUser = await resolveOrCreateUserForEmail(email, { supabase });
  await supabase
    .from("user_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", passkey.id);

  await setSession({
    email,
    walletAddress: authUser.walletAddress || undefined,
    authenticated: true,
    webauthnChallenge: undefined,
    webauthnEmail: undefined,
    webauthnCredentialIds: undefined,
  });

  return NextResponse.json({ ok: true, walletAddress: authUser.walletAddress });
}
