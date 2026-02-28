CREATE TABLE IF NOT EXISTS airdrop_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, wallet_address)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns to nft_templates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nft_templates' AND column_name='max_supply') THEN
        ALTER TABLE nft_templates ADD COLUMN max_supply INTEGER DEFAULT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nft_templates' AND column_name='current_supply') THEN
        ALTER TABLE nft_templates ADD COLUMN current_supply INTEGER DEFAULT 0;
    END IF;
END $$;

-- Insert default settings if not exists
INSERT INTO app_settings (key, value) VALUES ('line_airdrop_enabled', 'false') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (key, value) VALUES ('line_airdrop_template_id', '') ON CONFLICT (key) DO NOTHING;

-- Create RPC function to safely claim airdrop without race conditions
CREATE OR REPLACE FUNCTION claim_airdrop_safe(p_template_id UUID, p_wallet_address TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_supply INTEGER;
    v_current_supply INTEGER;
BEGIN
    -- Check if already claimed
    IF EXISTS (SELECT 1 FROM airdrop_claims WHERE template_id = p_template_id AND wallet_address = p_wallet_address) THEN
        RETURN json_build_object('success', false, 'error', 'ALREADY_CLAIMED');
    END IF;

    -- Lock the template row to prevent race conditions on supply
    SELECT max_supply, current_supply 
    INTO v_max_supply, v_current_supply
    FROM nft_templates 
    WHERE id = p_template_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'TEMPLATE_NOT_FOUND');
    END IF;

    -- Check supply
    IF v_max_supply IS NOT NULL AND v_current_supply >= v_max_supply THEN
        RETURN json_build_object('success', false, 'error', 'OUT_OF_STOCK');
    END IF;

    -- Update supply
    UPDATE nft_templates 
    SET current_supply = current_supply + 1 
    WHERE id = p_template_id;

    -- Insert claim
    INSERT INTO airdrop_claims (template_id, wallet_address) 
    VALUES (p_template_id, p_wallet_address);

    RETURN json_build_object('success', true);
END;
$$;
