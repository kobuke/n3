-- Update mint_logs table to support detailed tracking
DO $$ 
BEGIN
    -- Add token_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mint_logs' AND column_name='token_id') THEN
        ALTER TABLE mint_logs ADD COLUMN token_id text;
    END IF;

    -- Add contract_address if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mint_logs' AND column_name='contract_address') THEN
        ALTER TABLE mint_logs ADD COLUMN contract_address text;
    END IF;

    -- Add template_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mint_logs' AND column_name='template_id') THEN
        ALTER TABLE mint_logs ADD COLUMN template_id uuid REFERENCES nft_templates(id);
    END IF;

    -- Add transaction_hash if not exists (handling both tx_hash and transaction_hash)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mint_logs' AND column_name='transaction_hash') THEN
        ALTER TABLE mint_logs ADD COLUMN transaction_hash text;
    END IF;
END $$;

-- Enable RLS for mint_logs if not already enabled
ALTER TABLE mint_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own logs (based on recipient_wallet)
DROP POLICY IF EXISTS "Users can view their own mint logs" ON mint_logs;
CREATE POLICY "Users can view their own mint logs" ON mint_logs 
FOR SELECT USING (recipient_wallet = auth.jwt()->>'wallet_address' OR recipient_email = auth.jwt()->>'email');
