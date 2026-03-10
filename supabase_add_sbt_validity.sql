-- SBT 有効期限機能用のカラム追加
-- Supabase SQL Editor で実行してください

-- 有効期限（日数）。nullの場合は無期限。
ALTER TABLE nft_templates ADD COLUMN IF NOT EXISTS validity_days integer DEFAULT NULL;

-- 更新（再購入）用の Shopify 商品ページURL
ALTER TABLE nft_templates ADD COLUMN IF NOT EXISTS shopify_product_url text DEFAULT NULL;
