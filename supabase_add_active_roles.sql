ALTER TABLE discord_users ADD COLUMN IF NOT EXISTS active_roles text[] DEFAULT '{}'::text[];

-- Update existing records to avoid null
UPDATE discord_users SET active_roles = '{}'::text[] WHERE active_roles IS NULL;
