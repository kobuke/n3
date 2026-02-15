-- Discord Integration Tables
-- Run this in Supabase SQL Editor

-- 1. Discord Users: Links wallet addresses to Discord accounts
CREATE TABLE IF NOT EXISTS discord_users (
  id bigint generated always as identity primary key,
  wallet_address text not null,
  email text,
  discord_user_id text not null,
  discord_username text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(wallet_address),
  UNIQUE(discord_user_id)
);

-- 2. Discord Role Mappings: NFT Collection <-> Discord Role
CREATE TABLE IF NOT EXISTS discord_role_mappings (
  id bigint generated always as identity primary key,
  collection_address text not null,
  collection_name text,
  discord_role_id text not null,
  discord_role_name text,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(collection_address, discord_role_id)
);

-- 3. Discord Sync Logs: Track role assignment/removal
CREATE TABLE IF NOT EXISTS discord_sync_logs (
  id bigint generated always as identity primary key,
  discord_user_id text not null,
  wallet_address text,
  action text not null check (action in ('role_added', 'role_removed', 'guild_joined', 'error')),
  discord_role_id text,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (using service role key to bypass, but add basic policies)
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (these are managed server-side)
CREATE POLICY "Service role full access on discord_users" ON discord_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on discord_role_mappings" ON discord_role_mappings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on discord_sync_logs" ON discord_sync_logs
  FOR ALL USING (true) WITH CHECK (true);
