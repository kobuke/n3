import type { AuthenticatorTransportFuture, WebAuthnCredential } from "@simplewebauthn/server";

export type StoredPasskey = {
  id: string;
  email: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: AuthenticatorTransportFuture[] | null;
};

export function getWebAuthnRpConfig() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const origin = appUrl.replace(/\/$/, "");
  const rpID = process.env.WEBAUTHN_RP_ID || new URL(origin).hostname;

  return {
    rpName: "なんじょうNFTポータル",
    rpID,
    origin,
  };
}

export function registrationUserIdForEmail(email: string) {
  return email.trim().toLowerCase();
}

export function credentialIdToString(credentialId: Uint8Array | string) {
  if (typeof credentialId === "string") return credentialId;
  return Buffer.from(credentialId).toString("base64url");
}

export function stringToCredentialId(credentialId: string) {
  return Buffer.from(credentialId, "base64url");
}

export function storedPasskeyToAuthenticator(passkey: StoredPasskey): WebAuthnCredential {
  return {
    id: passkey.credential_id,
    publicKey: Buffer.from(passkey.public_key, "base64url"),
    counter: passkey.counter,
    transports: passkey.transports || undefined,
  };
}
