import { createAdminClient } from "./supabase/server";

type SupabaseLike = ReturnType<typeof createAdminClient>;

export type ResolvedAuthUser = {
  id: string | null;
  email: string;
  walletAddress: string | null;
};

export type ResolveUserOptions = {
  supabase?: SupabaseLike;
  fetchImpl?: typeof fetch;
};

async function createBackendWallet(email: string, fetchImpl: typeof fetch) {
  const engineUrl = process.env.THIRDWEB_ENGINE_URL;
  const accessToken = process.env.THIRDWEB_ENGINE_ACCESS_TOKEN;
  if (!engineUrl || !accessToken) return null;

  const res = await fetchImpl(`https://${engineUrl}/backend-wallet/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ label: `user-${email}` }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.result?.walletAddress || null;
}

export async function resolveOrCreateUserForEmail(
  rawEmail: string,
  options: ResolveUserOptions = {}
): Promise<ResolvedAuthUser> {
  const email = rawEmail.trim().toLowerCase();
  const supabase = options.supabase || createAdminClient();
  const fetchImpl = options.fetchImpl || fetch;

  const { data: userRecord } = await supabase
    .from("users")
    .select("id, email, walletaddress")
    .eq("email", email)
    .maybeSingle();

  if (userRecord?.walletaddress) {
    return {
      id: userRecord.id || null,
      email,
      walletAddress: userRecord.walletaddress,
    };
  }

  const walletAddress = await createBackendWallet(email, fetchImpl);
  if (!walletAddress) {
    return {
      id: userRecord?.id || null,
      email,
      walletAddress: null,
    };
  }

  const { error } = await supabase.from("users").upsert(
    { email, walletaddress: walletAddress },
    { onConflict: "email", ignoreDuplicates: false }
  );
  if (error) {
    console.error("Failed to save generated wallet:", error.message);
  }

  const { data: savedUser } = await supabase
    .from("users")
    .select("id, email, walletaddress")
    .eq("email", email)
    .maybeSingle();

  return {
    id: savedUser?.id || userRecord?.id || null,
    email,
    walletAddress,
  };
}
