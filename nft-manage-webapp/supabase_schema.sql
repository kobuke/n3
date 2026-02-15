
-- 1. Enable RLS
-- alter table auth.users enable row level security;

-- 2. Create tables

-- Mappings: Shopify Product ID <-> Crossmint Template ID
create table mappings (
  id bigint generated always as identity primary key,
  shopify_product_id text not null unique,
  crossmint_template_id text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table mappings enable row level security;

-- Mint Logs: Record of all minting attempts
create table mint_logs (
  id bigint generated always as identity primary key,
  shopify_order_id text not null,
  product_name text, -- Added product name
  shopify_product_id text, -- Added product ID for reference
  status text not null check (status in ('success', 'error', 'pending')),
  recipient_email text,
  recipient_wallet text,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table mint_logs enable row level security;

-- Audit Logs: Admin actions
create table audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  action text not null, -- e.g. 'LOGIN', 'UPDATE_MAPPING'
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
-- System (service role) will insert mint logs, so we might need a policy or just rely on service role bypassing RLS. 
-- For now, allow authenticated users to view.

-- Audit Logs: authenticated users can read
create policy "Allow auth users to read audit_logs" on audit_logs for select using (auth.role() = 'authenticated');
-- Insert is done by backend actions.
