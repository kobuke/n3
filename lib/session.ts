import { cookies } from "next/headers";
import { getSessionSecret, parseSessionPayload, signSessionPayload } from "@/lib/session-token";

const SESSION_KEY = "nanjo_session";

export interface SessionData {
  email?: string;
  walletAddress?: string;
  authenticated?: boolean;
  otp?: string;
  pendingEmail?: string;
  otpExpires?: number;
  webauthnChallenge?: string;
  webauthnUserId?: string;
  webauthnEmail?: string;
  webauthnCredentialIds?: string[];
  webauthnOrigin?: string;
  webauthnRpID?: string;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_KEY)?.value;
  if (!raw) return null;

  const data = parseSessionPayload<SessionData>(raw, getSessionSecret());
  if (!data) return null;

  // Auto-patch older sessions that are missing authenticated: true
  if (data.walletAddress && data.authenticated === undefined) {
    data.authenticated = true;
  }
  return data;
}

export async function setSession(data: Partial<SessionData>) {
  const cookieStore = await cookies();
  const existing = await getSession();
  const newData = { ...existing, ...data };

  cookieStore.set(SESSION_KEY, signSessionPayload(newData, getSessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_KEY);
}
