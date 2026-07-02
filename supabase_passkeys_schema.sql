CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text,
  transports text[] DEFAULT '{}',
  backed_up boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS user_passkeys_email_idx ON public.user_passkeys (lower(email));
CREATE INDEX IF NOT EXISTS user_passkeys_user_id_idx ON public.user_passkeys (user_id);

ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on user_passkeys" ON public.user_passkeys;
CREATE POLICY "Service role full access on user_passkeys"
  ON public.user_passkeys FOR ALL
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
