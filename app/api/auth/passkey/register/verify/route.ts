import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getSession, setSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { credentialIdToString, getWebAuthnRpConfig } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.authenticated || !session.email || !session.webauthnChallenge) {
    return NextResponse.json({ error: "Registration session expired", errorCode: "passkey_registration_session_expired" }, { status: 400 });
  }

  const body = await req.json();
  const fallbackConfig = getWebAuthnRpConfig(req);
  const origin = session.webauthnOrigin || fallbackConfig.origin;
  const rpID = session.webauthnRpID || fallbackConfig.rpID;
  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: session.webauthnChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey registration failed", errorCode: "passkey_registration_failed" }, { status: 400 });
  }

  const email = session.email.trim().toLowerCase();
  const credential = verification.registrationInfo.credential;
  const supabase = createAdminClient();

  const { data: userRecord } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const { error } = await supabase.from("user_passkeys").upsert(
    {
      user_id: userRecord?.id || null,
      email,
      credential_id: credentialIdToString(credential.id),
      public_key: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: body.response?.transports || [],
      backed_up: verification.registrationInfo.credentialBackedUp || false,
      device_name: body.clientExtensionResults?.credProps?.rk ? "Passkey" : "Security key",
    },
    { onConflict: "credential_id", ignoreDuplicates: false }
  );

  if (error) {
    console.error("Failed to save passkey:", error.message);
    return NextResponse.json({ error: "Failed to save passkey", errorCode: "passkey_save_failed" }, { status: 500 });
  }

  await setSession({
    webauthnChallenge: undefined,
    webauthnEmail: undefined,
    webauthnOrigin: undefined,
    webauthnRpID: undefined,
  });

  return NextResponse.json({ ok: true });
}
