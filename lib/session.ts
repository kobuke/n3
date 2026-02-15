import { cookies } from "next/headers";

const SESSION_KEY = "nanjo_session";

export interface SessionData {
  email?: string;
  walletAddress?: string;
  authenticated?: boolean;
  otp?: string;
  pendingEmail?: string;
  otpExpires?: number;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_KEY)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function setSession(data: Partial<SessionData>) {
  const cookieStore = await cookies();
  const existing = await getSession();
  const newData = { ...existing, ...data };

  cookieStore.set(SESSION_KEY, JSON.stringify(newData), {
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
