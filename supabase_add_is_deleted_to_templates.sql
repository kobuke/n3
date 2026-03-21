-- 1. nft_templates テーブルに論理削除（Soft Delete）用のカラムを追加
ALTER TABLE nft_templates ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;

-- 補足: もし既存のテーブル構造ですでに is_deleted が存在する場合はエラーにならずスキップされます。
