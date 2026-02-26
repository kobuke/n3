-- NFT Templates Table
CREATE TABLE IF NOT EXISTS nft_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  image_url text,
  type text not null, -- 'ticket', 'tour', 'resident_card', etc.
  is_transferable boolean default true,
  contract_address text, -- Address once deployed (optional for now, can be created later via Engine)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
ALTER TABLE nft_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on nft_templates" ON nft_templates FOR ALL USING (true) WITH CHECK (true);

-- Adding wallet functionality tracking
-- Modify users table to ensure wallet addresses can be added reliably
-- (Assuming users table already exists, just adding for context)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS thirdweb_wallet text;

-- Modify mapping table to link to nft_templates instead of direct contract_address
ALTER TABLE mappings ADD COLUMN IF NOT EXISTS nft_template_id uuid REFERENCES nft_templates(id);

-- Ticket Usage tracking (On-chain status update requires smart contract support, 
-- but we can track the transaction hash of the "burn" or "update" action locally too)
CREATE TABLE IF NOT EXISTS ticket_usages (
  id uuid default gen_random_uuid() primary key,
  token_id text not null,
  contract_address text not null,
  wallet_address text not null,
  transaction_hash text,
  status text not null, -- 'used', 'pending'
  used_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE ticket_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on ticket_usages" ON ticket_usages FOR ALL USING (true) WITH CHECK (true);
