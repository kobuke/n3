-- Atomic supply increment for nft_templates
-- Used by: manual staff distribution, Shopify order processing
CREATE OR REPLACE FUNCTION increment_nft_template_supply(p_template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE nft_templates
    SET current_supply = current_supply + 1
    WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;
