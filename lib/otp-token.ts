import { createHmac, timingSafeEqual } from "node:crypto";

const OTP_PREFIX = "otp";
const OTP_VERSION = "v1";

export const OTP_COOKIE_KEY = "nanjo_otp";

export type OtpPayload = {
  otp: string;
  pendingEmail: string;
  otpExpires: number;
};

function base64urlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signatureFor(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signOtpPayload(data: OtpPayload, secret: string) {
  const payload = base64urlEncode(JSON.stringify(data));
  const signature = signatureFor(payload, secret);
  return `${OTP_PREFIX}.${OTP_VERSION}.${payload}.${signature}`;
}

export function parseOtpPayload(raw: string, secret: string): OtpPayload | null {
  try {
    const [prefix, version, payload, signature] = raw.split(".");
    if (prefix !== OTP_PREFIX || version !== OTP_VERSION) return null;
    if (!payload || !signature) return null;

    const expected = signatureFor(payload, secret);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== actualBuffer.length) return null;
    if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null;

    const data = JSON.parse(base64urlDecode(payload)) as OtpPayload;
    if (!data.otp || !data.pendingEmail || typeof data.otpExpires !== "number") return null;
    return data;
  } catch {
    return null;
  }
}
