-- 1. Enable RLS
-- alter table auth.users enable row level security;

-- 2. Create tables

-- Users: Manage application users (Email OTP & LINE)
create table users (
  id uuid default gen_random_uuid() primary key,
  email text unique,
  lineId text unique,
  walletAddress text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table users enable row level security;

-- Mappings: Shopify Product ID <-> thirdweb Contract Address
create table mappings (
  id bigint generated always as identity primary key,
  shopify_product_id text not null unique,
  contract_address text not null, -- formerly crossmint_template_id
  token_id text, -- Used if specifying an ERC1155 token ID within a contract
  updated_by uuid references auth.users(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table mappings enable row level security;

-- Mint Logs: Record of all minting attempts
create table mint_logs (
  id bigint generated always as identity primary key,
  shopify_order_id text not null,
  product_name text,
  shopify_product_id text,
  status text not null check (status in ('success', 'error', 'pending')),
  recipient_email text,
  recipient_wallet text,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table mint_logs enable row level security;

-- Transfer Links: Escrow transfer links for P2P sending
create table transfer_links (
  id uuid default gen_random_uuid() primary key,
  token text not null unique,
  giverAddress text not null,
  tokenId text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CLAIMED', 'CANCELLED', 'EXPIRED')),
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table transfer_links enable row level security;

-- Audit Logs: Admin actions
create table audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  action text not null,
  details jsonb, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table audit_logs enable row level security;

-- 3. RLS Policies

-- Mappings: authenticated users can read/write
create policy "Allow auth users to read mappings" on mappings for select using (auth.role() = 'authenticated');
create policy "Allow auth users to insert mappings" on mappings for insert with check (auth.role() = 'authenticated');
create policy "Allow auth users to update mappings" on mappings for update using (auth.role() = 'authenticated');

-- Mint Logs: authenticated users can read
create policy "Allow auth users to read mint_logs" on mint_logs for select using (auth.role() = 'authenticated');

-- Audit Logs: authenticated users can read
create policy "Allow auth users to read audit_logs" on audit_logs for select using (auth.role() = 'authenticated');
