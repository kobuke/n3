import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getSession, setSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { getWebAuthnRpConfig, registrationUserIdForEmail } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session?.authenticated || !session.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.email.trim().toLowerCase();
  const supabase = createAdminClient();
  const { data: existingCredentials } = await supabase
    .from("user_passkeys")
    .select("credential_id")
    .eq("email", email);

  const { rpName, rpID } = getWebAuthnRpConfig();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(registrationUserIdForEmail(email), "utf8"),
    userName: email,
    userDisplayName: email,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
    excludeCredentials: (existingCredentials || []).map((credential) => ({
      id: credential.credential_id,
    })),
  });

  await setSession({
    webauthnChallenge: options.challenge,
    webauthnEmail: email,
  });

  return NextResponse.json(options);
}
