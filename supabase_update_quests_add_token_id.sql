-- supabase_update_quests_add_token_id.sql
-- Quest進行状況をウォレット単位からトークン（NFT）単位に変更するためのマイグレーション

-- 1. 既存のUNIQUE制約を一旦削除
ALTER TABLE public.user_quest_progress DROP CONSTRAINT IF EXISTS user_quest_progress_user_wallet_quest_id_location_id_key;

-- 2. token_id カラム（どのNFTでチェックインしたか）を追加
ALTER TABLE public.user_quest_progress ADD COLUMN IF NOT EXISTS token_id text;

-- 3. 新しい UNIQUE 制約を追加（token_id も複合ユニークキーに含める）
ALTER TABLE public.user_quest_progress ADD CONSTRAINT user_quest_progress_user_wallet_token_id_quest_id_location_key UNIQUE(user_wallet, token_id, quest_id, location_id);
