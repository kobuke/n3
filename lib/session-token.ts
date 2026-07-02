import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNED_SESSION_PREFIX = "v1";

function base64urlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signatureFor(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.RESEND_API_KEY ||
    "local-development-session-secret";

  if (process.env.NODE_ENV === "production" && secret === "local-development-session-secret") {
    throw new Error("SESSION_SECRET is required in production");
  }

  return secret;
}

export function signSessionPayload<T extends object>(data: T, secret: string) {
  const payload = base64urlEncode(JSON.stringify(data));
  const signature = signatureFor(payload, secret);
  return `${SIGNED_SESSION_PREFIX}.${payload}.${signature}`;
}

export function parseSessionPayload<T extends object>(raw: string, secret: string): T | null {
  try {
    if (!raw.startsWith(`${SIGNED_SESSION_PREFIX}.`)) {
      return JSON.parse(raw) as T;
    }

    const [version, payload, signature] = raw.split(".");
    if (version !== SIGNED_SESSION_PREFIX) return null;
    if (!payload || !signature) return null;

    const expected = signatureFor(payload, secret);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== actualBuffer.length) return null;
    if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null;

    return JSON.parse(base64urlDecode(payload)) as T;
  } catch {
    return null;
  }
}
